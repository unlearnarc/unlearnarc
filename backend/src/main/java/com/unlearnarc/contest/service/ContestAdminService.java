package com.unlearnarc.contest.service;

import com.unlearnarc.contest.dto.*;
import com.unlearnarc.contest.entity.*;
import com.unlearnarc.contest.entity.Contest.ContestStatus;
import com.unlearnarc.contest.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * Admin operations: create/update/publish contests, manage problems and their
 * test cases (public + hidden). Only ADMIN-authorised controllers call this.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ContestAdminService {

    private final ContestRepository         contestRepo;
    private final ContestProblemRepository  problemRepo;
    private final ContestTestCaseRepository testCaseRepo;
    private final ContestParticipantRepository participantRepo;
    private final ContestMapper mapper;

    // ── Contests ────────────────────────────────────────────────────────────────

    public ContestResponse createContest(ContestRequest req, String adminEmail) {
        validateWindow(req.getStartTime(), req.getEndTime());
        String slug = resolveSlug(req.getSlug(), req.getTitle());

        Contest contest = Contest.builder()
                .title(req.getTitle())
                .slug(slug)
                .description(req.getDescription())
                .visibility(req.getVisibility())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .durationMinutes(req.getDurationMinutes() != null ? req.getDurationMinutes() : 0)
                .allowedLanguages(req.getAllowedLanguages())
                .wrongSubmissionPenalty(req.getWrongSubmissionPenalty() != null ? req.getWrongSubmissionPenalty() : 0)
                .status(ContestStatus.DRAFT)
                .createdBy(adminEmail)
                .build();

        contest = contestRepo.save(contest);
        log.info("[CONTEST] created id={} slug={} by={}", contest.getId(), slug, adminEmail);
        return mapper.toContestResponse(contest, 0L, 0L);
    }

    public ContestResponse updateContest(String id, ContestRequest req) {
        Contest contest = getContestOrThrow(id);
        validateWindow(req.getStartTime(), req.getEndTime());

        contest.setTitle(req.getTitle());
        if (req.getSlug() != null && !req.getSlug().isBlank()
                && !req.getSlug().equals(contest.getSlug())) {
            contest.setSlug(resolveSlug(req.getSlug(), req.getTitle()));
        }
        contest.setDescription(req.getDescription());
        contest.setVisibility(req.getVisibility());
        contest.setStartTime(req.getStartTime());
        contest.setEndTime(req.getEndTime());
        contest.setDurationMinutes(req.getDurationMinutes() != null ? req.getDurationMinutes() : 0);
        contest.setAllowedLanguages(req.getAllowedLanguages());
        contest.setWrongSubmissionPenalty(
                req.getWrongSubmissionPenalty() != null ? req.getWrongSubmissionPenalty() : 0);

        contest = contestRepo.save(contest);
        return withStats(contest);
    }

    public ContestResponse setStatus(String id, ContestStatus status) {
        Contest contest = getContestOrThrow(id);
        if (status == ContestStatus.PUBLISHED && problemRepo.countByContestId(id) == 0) {
            throw new IllegalStateException("Cannot publish a contest with no problems.");
        }
        contest.setStatus(status);
        return withStats(contestRepo.save(contest));
    }

    public void deleteContest(String id) {
        Contest contest = getContestOrThrow(id);
        for (ContestProblem p : problemRepo.findByContestIdOrderByDisplayOrder(id)) {
            testCaseRepo.deleteByProblemId(p.getId());
        }
        problemRepo.deleteAll(problemRepo.findByContestIdOrderByDisplayOrder(id));
        contestRepo.delete(contest);
    }

    public List<ContestResponse> listAll() {
        return contestRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::withStats)
                .toList();
    }

    // ── Problems ─────────────────────────────────────────────────────────────────

    public ContestProblemAdminResponse addProblem(String contestId, ContestProblemRequest req) {
        getContestOrThrow(contestId);
        ContestProblem problem = ContestProblem.builder()
                .contestId(contestId)
                .title(req.getTitle())
                .statement(req.getStatement())
                .constraints(req.getConstraints())
                .difficulty(req.getDifficulty())
                .maxPoints(req.getMaxPoints() != null ? req.getMaxPoints() : 100)
                .starterCodeJson(req.getStarterCodeJson())
                .harnessType(req.getHarnessType())
                .timeLimitMs(req.getTimeLimitMs() != null ? req.getTimeLimitMs() : 2000)
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .build();
        problem = problemRepo.save(problem);
        saveTestCases(problem.getId(), req.getTestCases());
        return mapper.toProblemAdminResponse(problem,
                testCaseRepo.findByProblemIdOrderByDisplayOrder(problem.getId()));
    }

    public ContestProblemAdminResponse updateProblem(String problemId, ContestProblemRequest req) {
        ContestProblem problem = getProblemOrThrow(problemId);
        problem.setTitle(req.getTitle());
        problem.setStatement(req.getStatement());
        problem.setConstraints(req.getConstraints());
        problem.setDifficulty(req.getDifficulty());
        problem.setMaxPoints(req.getMaxPoints() != null ? req.getMaxPoints() : problem.getMaxPoints());
        problem.setStarterCodeJson(req.getStarterCodeJson());
        problem.setHarnessType(req.getHarnessType());
        problem.setTimeLimitMs(req.getTimeLimitMs() != null ? req.getTimeLimitMs() : problem.getTimeLimitMs());
        problem.setDisplayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : problem.getDisplayOrder());
        problem = problemRepo.save(problem);

        // replace test cases wholesale when provided
        if (req.getTestCases() != null && !req.getTestCases().isEmpty()) {
            testCaseRepo.deleteByProblemId(problemId);
            saveTestCases(problemId, req.getTestCases());
        }
        return mapper.toProblemAdminResponse(problem,
                testCaseRepo.findByProblemIdOrderByDisplayOrder(problemId));
    }

    public void deleteProblem(String problemId) {
        ContestProblem problem = getProblemOrThrow(problemId);
        testCaseRepo.deleteByProblemId(problemId);
        problemRepo.delete(problem);
    }

    public List<ContestProblemAdminResponse> listProblemsForAdmin(String contestId) {
        getContestOrThrow(contestId);
        return problemRepo.findByContestIdOrderByDisplayOrder(contestId).stream()
                .map(p -> mapper.toProblemAdminResponse(p,
                        testCaseRepo.findByProblemIdOrderByDisplayOrder(p.getId())))
                .toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private void saveTestCases(String problemId, List<ContestProblemRequest.TestCaseRequest> cases) {
        if (cases == null) return;
        int order = 0;
        for (ContestProblemRequest.TestCaseRequest tc : cases) {
            testCaseRepo.save(ContestTestCase.builder()
                    .problemId(problemId)
                    .input(tc.getInput())
                    .expectedOutput(tc.getExpectedOutput())
                    .isHidden(tc.getIsHidden() == null || tc.getIsHidden())
                    .weight(tc.getWeight() != null ? tc.getWeight() : 1)
                    .strictMatch(tc.getStrictMatch() != null && tc.getStrictMatch())
                    .displayOrder(tc.getDisplayOrder() != null ? tc.getDisplayOrder() : order)
                    .build());
            order++;
        }
    }

    private ContestResponse withStats(Contest contest) {
        long problems = problemRepo.countByContestId(contest.getId());
        long parts    = participantRepo.countByContestId(contest.getId());
        return mapper.toContestResponse(contest, problems, parts);
    }

    private String resolveSlug(String requested, String title) {
        String base = (requested != null && !requested.isBlank() ? requested : title)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        String slug = base.isBlank() ? "contest" : base;
        String candidate = slug;
        int i = 1;
        while (contestRepo.existsBySlug(candidate)) {
            candidate = slug + "-" + (++i);
        }
        return candidate;
    }

    private void validateWindow(Instant start, Instant end) {
        if (start != null && end != null && !end.isAfter(start)) {
            throw new IllegalArgumentException("endTime must be after startTime.");
        }
    }

    public Contest getContestOrThrow(String id) {
        return contestRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Contest not found: " + id));
    }

    public ContestProblem getProblemOrThrow(String id) {
        return problemRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Problem not found: " + id));
    }
}
