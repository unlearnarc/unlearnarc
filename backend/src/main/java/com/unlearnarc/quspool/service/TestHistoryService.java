package com.unlearnarc.quspool.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.dto.TestResultResponse.DifficultyBreakdown;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.entity.TestResult;
import com.unlearnarc.quspool.entity.UserTestAttempt;
import com.unlearnarc.quspool.repository.TestResultRepository;
import com.unlearnarc.quspool.repository.UserTestAttemptRepository;
import com.unlearnarc.user.service.LeaderboardService;
import com.unlearnarc.user.service.StreakService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Owns persistence + retrieval of graded test attempts.
 *
 * Separated from {@link TestEngineService} (which stays focused on generate/grade
 * logic) so the history + future recommendation concerns evolve independently.
 *
 * Extensibility notes:
 *  - Each {@link TestResult} stores the full per-question snapshot as JSON plus a
 *    per-difficulty breakdown, so a future WeakAreaService can read attempts for a
 *    user and compute "where to improve" without touching the live question bank.
 *  - {@code recordAttempt} is the single write path; call it from grade().
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TestHistoryService {

    private final TestResultRepository       resultRepo;
    private final UserTestAttemptRepository  attemptRepo;
    private final ObjectMapper               objectMapper;
    private final LeaderboardService          leaderboardService;
    private final StreakService               streakService;

    // ── Write path ───────────────────────────────────────────────────────────────

    /**
     * Persists a graded result and links it to the user. Best-effort: never let a
     * history-write failure break the grading response the learner is waiting for.
     *
     * @return the persisted TestResult id, or null if persistence was skipped/failed.
     */
    @Transactional
    public String recordAttempt(String userId, TestResultResponse result, Integer timeTakenSeconds) {
        if (userId == null) {
            log.warn("[HISTORY] No authenticated user — attempt not recorded for pool={}", result.getPoolId());
            return null;
        }
        try {
            TestResult entity = toEntity(result, timeTakenSeconds);
            entity = resultRepo.save(entity);

            attemptRepo.save(UserTestAttempt.builder()
                    .userId(userId)
                    .testId(entity.getId())
                    .build());

            // HYBRID cache: add the quiz points this attempt earned to the leaderboard.
            if (entity.getEarnedPoints() != null && entity.getEarnedPoints() > 0) {
                leaderboardService.awardPoints(userId, entity.getEarnedPoints());
            }

            // Count this graded attempt as "showed up & did work today" (streak + calendar).
            // Best-effort: a streak-write failure must never break the grading response.
            try { streakService.recordActivity(userId); }
            catch (Exception ex) { log.warn("[HISTORY] streak update skipped for user={}: {}", userId, ex.getMessage()); }

            log.info("[HISTORY] Recorded attempt user={} result={} score={}%",
                    userId, entity.getId(), result.getScorePercentage());
            return entity.getId();
        } catch (Exception ex) {
            // Do not propagate — grading already succeeded; history is secondary.
            log.error("[HISTORY] Failed to record attempt for user={} pool={}: {}",
                    userId, result.getPoolId(), ex.getMessage(), ex);
            return null;
        }
    }

    // ── Read path ────────────────────────────────────────────────────────────────

    public Page<TestAttemptSummaryResponse> history(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<UserTestAttempt> attempts = attemptRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable);

        List<String> resultIds = attempts.getContent().stream().map(UserTestAttempt::getTestId).toList();
        List<TestResult> results = resultIds.isEmpty() ? List.of() : resultRepo.findByIdIn(resultIds);
        var byId = results.stream().collect(java.util.stream.Collectors.toMap(TestResult::getId, r -> r));

        return attempts.map(a -> {
            TestResult r = byId.get(a.getTestId());
            return r == null ? null : toSummary(a, r);
        });
    }

    public TestAttemptDetailResponse detail(String userId, String attemptId) {
        UserTestAttempt attempt = attemptRepo.findById(attemptId)
                .orElseThrow(() -> new EntityNotFoundException("Attempt not found: " + attemptId));
        if (!attempt.getUserId().equals(userId)) {
            // Don't leak existence of other users' attempts.
            throw new EntityNotFoundException("Attempt not found: " + attemptId);
        }
        TestResult r = resultRepo.findById(attempt.getTestId())
                .orElseThrow(() -> new EntityNotFoundException("Result not found: " + attempt.getTestId()));

        return TestAttemptDetailResponse.builder()
                .attemptId(attempt.getId())
                .resultId(r.getId())
                .attemptedAt(attempt.getCreatedAt())
                .timeTakenSeconds(r.getTimeTakenSeconds())
                .result(toResultResponse(r))
                .build();
    }

    // ── Mapping ──────────────────────────────────────────────────────────────────

    private TestResult toEntity(TestResultResponse r, Integer timeTakenSeconds) {
        DifficultyBreakdown easy   = r.getEasy();
        DifficultyBreakdown medium = r.getMedium();
        DifficultyBreakdown hard   = r.getHard();

        return TestResult.builder()
                .poolId(r.getPoolId())
                .poolName(r.getPoolName())
                .entityType(r.getScopeType())
                .entityId(r.getEntityId())
                .totalQuestions(r.getTotalQuestions())
                .correctCount(r.getCorrectCount())
                .wrongCount(r.getWrongCount())
                .skippedCount(r.getSkippedCount())
                .totalPoints(r.getTotalPoints())
                .earnedPoints(r.getEarnedPoints())
                .scorePercentage(r.getScorePercentage())
                .passPercentage(r.getPassPercentage())
                .passed(r.getPassed())
                .improvementNeeded(r.getImprovementNeeded())
                .easyTotal(nz(easy, DifficultyBreakdown::getTotal))
                .easyCorrect(nz(easy, DifficultyBreakdown::getCorrect))
                .easyPoints(nz(easy, DifficultyBreakdown::getPoints))
                .easyEarned(nz(easy, DifficultyBreakdown::getEarnedPoints))
                .mediumTotal(nz(medium, DifficultyBreakdown::getTotal))
                .mediumCorrect(nz(medium, DifficultyBreakdown::getCorrect))
                .mediumPoints(nz(medium, DifficultyBreakdown::getPoints))
                .mediumEarned(nz(medium, DifficultyBreakdown::getEarnedPoints))
                .hardTotal(nz(hard, DifficultyBreakdown::getTotal))
                .hardCorrect(nz(hard, DifficultyBreakdown::getCorrect))
                .hardPoints(nz(hard, DifficultyBreakdown::getPoints))
                .hardEarned(nz(hard, DifficultyBreakdown::getEarnedPoints))
                .answerSnapshot(writeSnapshot(r.getQuestionResults()))
                .timeTakenSeconds(timeTakenSeconds)
                .build();
    }

    private TestAttemptSummaryResponse toSummary(UserTestAttempt a, TestResult r) {
        return TestAttemptSummaryResponse.builder()
                .attemptId(a.getId())
                .resultId(r.getId())
                .poolId(r.getPoolId())
                .poolName(r.getPoolName())
                .entityType(r.getEntityType())
                .entityId(r.getEntityId())
                .totalQuestions(r.getTotalQuestions())
                .correctCount(r.getCorrectCount())
                .wrongCount(r.getWrongCount())
                .skippedCount(r.getSkippedCount())
                .earnedPoints(r.getEarnedPoints())
                .totalPoints(r.getTotalPoints())
                .scorePercentage(r.getScorePercentage())
                .passPercentage(r.getPassPercentage())
                .passed(r.getPassed())
                .improvementNeeded(r.getImprovementNeeded())
                .timeTakenSeconds(r.getTimeTakenSeconds())
                .attemptedAt(a.getCreatedAt())
                .build();
    }

    /** Reconstructs the full graded response from a stored result + its JSON snapshot. */
    private TestResultResponse toResultResponse(TestResult r) {
        return TestResultResponse.builder()
                .poolId(r.getPoolId())
                .poolName(r.getPoolName())
                .scopeType(r.getEntityType())
                .entityId(r.getEntityId())
                .totalQuestions(r.getTotalQuestions())
                .correctAnswers(r.getCorrectCount())
                .wrongAnswers(r.getWrongCount())
                .skippedAnswers(r.getSkippedCount())
                .totalPoints(r.getTotalPoints())
                .earnedPoints(r.getEarnedPoints())
                .percentageScore(r.getScorePercentage())
                .passPercentage(r.getPassPercentage())
                .passed(r.getPassed())
                .improvementNeeded(r.getImprovementNeeded())
                .timeTakenSeconds(r.getTimeTakenSeconds())
                .easy(breakdown(Difficulty.EASY,   r.getEasyTotal(),   r.getEasyCorrect(),   r.getEasyPoints(),   r.getEasyEarned()))
                .medium(breakdown(Difficulty.MEDIUM, r.getMediumTotal(), r.getMediumCorrect(), r.getMediumPoints(), r.getMediumEarned()))
                .hard(breakdown(Difficulty.HARD,   r.getHardTotal(),   r.getHardCorrect(),   r.getHardPoints(),   r.getHardEarned()))
                .breakdown(readSnapshot(r.getAnswerSnapshot()))
                .build();
    }

    private DifficultyBreakdown breakdown(Difficulty d, Integer total, Integer correct, Integer points, Integer earned) {
        return DifficultyBreakdown.builder()
                .difficulty(d).total(total).correct(correct).points(points).earnedPoints(earned).build();
    }

    private String writeSnapshot(List<TestResultResponse.QuestionResult> results) {
        if (results == null) return "[]";
        try {
            return objectMapper.writeValueAsString(results);
        } catch (JsonProcessingException e) {
            log.warn("[HISTORY] Could not serialize answer snapshot: {}", e.getMessage());
            return "[]";
        }
    }

    private List<TestResultResponse.QuestionResult> readSnapshot(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(
                            List.class, TestResultResponse.QuestionResult.class));
        } catch (JsonProcessingException e) {
            log.warn("[HISTORY] Could not deserialize answer snapshot: {}", e.getMessage());
            return List.of();
        }
    }

    private int nz(DifficultyBreakdown b, java.util.function.ToIntFunction<DifficultyBreakdown> f) {
        return b == null ? 0 : f.applyAsInt(b);
    }
}
