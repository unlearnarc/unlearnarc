package com.unlearnarc.quspool.service;

import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.dto.TestQuestionResponse.TestAnswerOption;
import com.unlearnarc.quspool.dto.TestResultResponse.*;
import com.unlearnarc.quspool.entity.*;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Core test engine:
 *   1. generate() → randomly draws easyCount + mediumCount + hardCount questions
 *                   from the pool linked to a domain/course/topic.
 *                   Answers returned WITHOUT isCorrect flag (hidden from user).
 *
 *   2. grade()    → accepts submitted answer IDs, computes score per question,
 *                   returns full result breakdown including correct answers revealed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TestEngineService {

    private final QuestionPoolService        poolService;
    private final QuestionRepository         questionRepo;
    private final AnswerRepository           answerRepo;
    private final DomainPoolMappingRepository domainPoolRepo;
    private final CoursePoolMappingRepository coursePoolRepo;
    private final TopicPoolMappingRepository  topicPoolRepo;
    private final QuestionService            questionService;
    private final TestHistoryService         testHistoryService;

    // ── Generate a test session ────────────────────────────────────────────────

    public TestSessionResponse generate(TestGenerationRequest req) {
        QuestionPool pool = resolvePool(req);

        int easy   = pool.getEasyCount();
        int medium = pool.getMediumCount();
        int hard   = pool.getHardCount();

        // Pull random questions per difficulty
        List<Question> easyQs   = questionRepo.findRandomByPoolAndDifficulty(pool.getId(), Difficulty.EASY.name(),   easy);
        List<Question> mediumQs = questionRepo.findRandomByPoolAndDifficulty(pool.getId(), Difficulty.MEDIUM.name(), medium);
        List<Question> hardQs   = questionRepo.findRandomByPoolAndDifficulty(pool.getId(), Difficulty.HARD.name(),   hard);

        // Validate availability — collect ALL shortfalls so the caller can fix the
        // pool in one pass instead of discovering them one difficulty at a time.
        List<String> shortfalls = new ArrayList<>();
        if (easyQs.size() < easy) {
            shortfalls.add("EASY (required %d, available %d)".formatted(easy, easyQs.size()));
        }
        if (mediumQs.size() < medium) {
            shortfalls.add("MEDIUM (required %d, available %d)".formatted(medium, mediumQs.size()));
        }
        if (hardQs.size() < hard) {
            shortfalls.add("HARD (required %d, available %d)".formatted(hard, hardQs.size()));
        }
        if (!shortfalls.isEmpty()) {
            throw new IllegalStateException(
                    "Pool \"%s\" does not have enough active questions to generate a test: %s. Add more questions or lower the per-difficulty counts."
                            .formatted(pool.getName(), String.join(", ", shortfalls)));
        }

        // Merge and shuffle
        List<Question> all = new ArrayList<>();
        all.addAll(easyQs);
        all.addAll(mediumQs);
        all.addAll(hardQs);
        Collections.shuffle(all);

        int totalPoints = all.stream().mapToInt(Question::getPoints).sum();

        List<TestQuestionResponse> questions = all.stream()
                .map(q -> toTestQuestion(q, answerRepo.findByQuestionIdOrderByDisplayOrder(q.getId())))
                .toList();

        return TestSessionResponse.builder()
                .poolId(pool.getId())
                .poolName(pool.getName())
                .scopeType(pool.getScopeType())
                .entityId(req.getEntityId())
                .totalQuestions(pool.getTotalQuestions())
                .easyCount(easy)
                .mediumCount(medium)
                .hardCount(hard)
                .timeLimitMinutes(pool.getTimeLimitMinutes())
                .passPercentage(pool.getPassPercentage())
                .totalPoints(totalPoints)
                .questions(questions)
                .build();
    }

    // ── Grade a submitted test ─────────────────────────────────────────────────

    @Transactional
    public TestResultResponse grade(TestSubmissionRequest req, String userId) {
        QuestionPool pool = poolService.getPoolOrThrow(req.getPoolId());

        int totalQs    = req.getAnswers().size();
        int correct    = 0;
        int wrong      = 0;
        int skipped    = 0;
        int earned     = 0;
        int total      = 0;

        // Difficulty counters
        Map<Difficulty, int[]> diff = new HashMap<>();
        for (Difficulty d : Difficulty.values()) diff.put(d, new int[]{0, 0, 0, 0}); // [total,correct,pts,earnedPts]

        List<QuestionResult> results = new ArrayList<>();

        for (TestSubmissionRequest.QuestionAnswer qa : req.getAnswers()) {
            Question question = questionService.getOrThrow(qa.getQuestionId());
            List<Answer> allAnswers = answerRepo.findByQuestionIdOrderByDisplayOrder(question.getId());
            Set<String> correctIds = allAnswers.stream()
                    .filter(Answer::getIsCorrect)
                    .map(Answer::getId)
                    .collect(Collectors.toSet());
            Set<String> selectedIds = new HashSet<>(qa.getSelectedAnswerIds());

            total += question.getPoints();
            int[] dc = diff.get(question.getDifficulty());
            dc[0]++;
            dc[2] += question.getPoints();

            boolean isCorrect;
            if (selectedIds.isEmpty()) {
                skipped++;
                isCorrect = false;
            } else if (question.getQuestionType() == Question.QuestionType.MCQ) {
                isCorrect = selectedIds.equals(correctIds);
            } else {
                // MULTIPLE_CORRECT: all selected must be correct AND all correct must be selected
                isCorrect = selectedIds.equals(correctIds);
            }

            if (isCorrect) {
                correct++;
                earned += question.getPoints();
                dc[1]++;
                dc[3] += question.getPoints();
            } else if (!selectedIds.isEmpty()) {
                wrong++;
            }

            results.add(QuestionResult.builder()
                    .questionId(question.getId())
                    .questionText(question.getQuestionText())
                    .questionType(question.getQuestionType())
                    .difficulty(question.getDifficulty())
                    .points(question.getPoints())
                    .earnedPoints(isCorrect ? question.getPoints() : 0)
                    .isCorrect(isCorrect)
                    .selectedAnswerIds(new ArrayList<>(selectedIds))
                    .correctAnswerIds(new ArrayList<>(correctIds))
                    .explanation(question.getExplanation())
                    .answers(allAnswers.stream()
                            .map(a -> QuestionResult.AnswerOption.builder()
                                    .id(a.getId())
                                    .answerText(a.getAnswerText())
                                    .isCorrect(a.getIsCorrect())
                                    .build())
                            .toList())
                    .build());
        }

        double pct  = total > 0 ? (earned * 100.0 / total) : 0.0;
        boolean passed = pct >= pool.getPassPercentage();

        TestResultResponse response = TestResultResponse.builder()
                .poolId(pool.getId())
                .poolName(pool.getName())
                .scopeType(pool.getScopeType())
                .entityId(req.getEntityId())
                .totalQuestions(totalQs)
                .correctAnswers(correct)
                .wrongAnswers(wrong)
                .skippedAnswers(skipped)
                .totalPoints(total)
                .earnedPoints(earned)
                .percentageScore(Math.round(pct * 100.0) / 100.0)
                .passPercentage(pool.getPassPercentage())
                .passed(passed)
                .improvementNeeded(!passed)
                .timeTakenSeconds(req.getTimeTakenSeconds())
                .easy(toDifficultyBreakdown(Difficulty.EASY,   diff.get(Difficulty.EASY)))
                .medium(toDifficultyBreakdown(Difficulty.MEDIUM, diff.get(Difficulty.MEDIUM)))
                .hard(toDifficultyBreakdown(Difficulty.HARD,   diff.get(Difficulty.HARD)))
                .breakdown(results)
                .build();

        // Persist the attempt for history + future weak-area suggestions.
        // Best-effort: a history-write failure must never fail the grading response.
        testHistoryService.recordAttempt(userId, response, req.getTimeTakenSeconds());

        return response;
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    private QuestionPool resolvePool(TestGenerationRequest req) {
        if (req.getPoolId() != null) {
            return poolService.getPoolOrThrow(req.getPoolId());
        }
        List<String> poolIds = switch (req.getScopeType()) {
            case DOMAIN -> domainPoolRepo.findByDomainId(req.getEntityId())
                    .stream().map(DomainPoolMapping::getPoolId).toList();
            case COURSE -> coursePoolRepo.findByCourseId(req.getEntityId())
                    .stream().map(CoursePoolMapping::getPoolId).toList();
            case TOPIC  -> topicPoolRepo.findByTopicId(req.getEntityId())
                    .stream().map(TopicPoolMapping::getPoolId).toList();
        };
        if (poolIds.isEmpty()) {
            throw new EntityNotFoundException(
                    "No question pool found for %s: %s".formatted(req.getScopeType(), req.getEntityId()));
        }

        List<QuestionPool> activePools = poolIds.stream()
                .map(poolService::getPoolOrThrow)
                .filter(QuestionPool::getIsActive)
                .toList();

        if (activePools.isEmpty()) {
            throw new EntityNotFoundException(
                    "No active pool found for %s: %s".formatted(req.getScopeType(), req.getEntityId()));
        }

        // The learner never picks a pool — the engine picks the best one for them.
        // Prefer a pool that can actually satisfy its difficulty quota so an empty
        // or under-populated pool never shadows a ready one (better UX, no 422 when
        // a usable pool exists on the same entity).
        return activePools.stream()
                .filter(this::canSatisfyQuota)
                .findFirst()
                // Fall back to the first active pool so the shortfall validation in
                // generate() still produces a clear, actionable error when NO pool
                // on the entity is ready yet.
                .orElse(activePools.get(0));
    }

    /** True if the pool has enough active questions in every difficulty bucket. */
    private boolean canSatisfyQuota(QuestionPool pool) {
        return questionRepo.countByPoolIdAndDifficultyAndIsActiveTrue(pool.getId(), Difficulty.EASY)   >= pool.getEasyCount()
            && questionRepo.countByPoolIdAndDifficultyAndIsActiveTrue(pool.getId(), Difficulty.MEDIUM) >= pool.getMediumCount()
            && questionRepo.countByPoolIdAndDifficultyAndIsActiveTrue(pool.getId(), Difficulty.HARD)   >= pool.getHardCount();
    }

    private TestQuestionResponse toTestQuestion(Question q, List<Answer> answers) {
        // Shuffle answer options so position doesn't leak the correct answer
        List<Answer> shuffled = new ArrayList<>(answers);
        Collections.shuffle(shuffled);

        return TestQuestionResponse.builder()
                .id(q.getId())
                .questionText(q.getQuestionText())
                .questionType(q.getQuestionType())
                .difficulty(q.getDifficulty())
                .points(q.getPoints())
                .answers(shuffled.stream()
                        .map(a -> TestAnswerOption.builder()
                                .id(a.getId())
                                .answerText(a.getAnswerText())
                                .displayOrder(a.getDisplayOrder())
                                .build())
                        .toList())
                .build();
    }

    private DifficultyBreakdown toDifficultyBreakdown(Difficulty d, int[] dc) {
        return DifficultyBreakdown.builder()
                .difficulty(d)
                .total(dc[0])
                .correct(dc[1])
                .points(dc[2])
                .earnedPoints(dc[3])
                .build();
    }
}
