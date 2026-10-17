package com.unlearnarc.contest.service;

import com.unlearnarc.contest.dto.*;
import com.unlearnarc.contest.entity.*;
import com.unlearnarc.contest.entity.Contest.ContestStatus;
import com.unlearnarc.contest.entity.ContestSubmission.Verdict;
import com.unlearnarc.contest.repository.*;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.service.LeaderboardService;
import com.unlearnarc.user.service.StreakService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Student-facing contest flow. Code executes on the CLIENT; this service:
 *   1. serves contests + problems (hidden expected outputs stripped),
 *   2. issues SIGNED challenges (test inputs bound to the user via HMAC),
 *   3. registers participants,
 *   4. RE-VALIDATES client-reported outputs against hidden expected outputs —
 *      only after verifying the challenge signature — to produce the
 *      authoritative verdict + score,
 *   5. maintains the leaderboard.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContestParticipationService {

    private final ContestRepository          contestRepo;
    private final ContestProblemRepository   problemRepo;
    private final ContestTestCaseRepository  testCaseRepo;
    private final ContestParticipantRepository participantRepo;
    private final ContestSubmissionRepository submissionRepo;
    private final UserRepository             userRepo;
    private final OutputValidator            outputValidator;
    private final PayloadSigner              payloadSigner;
    private final ContestMapper              mapper;
    private final LeaderboardService          leaderboardService;
    private final StreakService               streakService;

    // ── Discovery ────────────────────────────────────────────────────────────────

    public List<ContestResponse> listPublished() {
        return contestRepo.findByStatusOrderByStartTimeDesc(ContestStatus.PUBLISHED).stream()
                .map(c -> mapper.toContestResponse(c,
                        problemRepo.countByContestId(c.getId()),
                        participantRepo.countByContestId(c.getId())))
                .toList();
    }

    public ContestResponse getContest(String id) {
        Contest c = getPublishedContestOrThrow(id);
        return mapper.toContestResponse(c,
                problemRepo.countByContestId(c.getId()),
                participantRepo.countByContestId(c.getId()));
    }

    public List<ContestProblemResponse> listProblems(String contestId) {
        getPublishedContestOrThrow(contestId);
        return problemRepo.findByContestIdAndIsActiveTrueOrderByDisplayOrder(contestId).stream()
                .map(p -> mapper.toStudentProblem(p,
                        testCaseRepo.findByProblemIdOrderByDisplayOrder(p.getId())))
                .toList();
    }

    public ContestProblemResponse getProblem(String contestId, String problemId) {
        getPublishedContestOrThrow(contestId);
        ContestProblem p = loadProblemInContest(contestId, problemId);
        return mapper.toStudentProblem(p,
                testCaseRepo.findByProblemIdOrderByDisplayOrder(p.getId()));
    }

    // ── Challenge issuance (signed test inputs for client-side execution) ─────────

    /**
     * Returns every test case's INPUT (public + hidden) each wrapped in an HMAC
     * signature bound to this user. Hidden expected outputs are never included.
     * The client runs the user's code against these inputs locally and echoes
     * the signatures back on submit.
     */
    @Transactional
    public ChallengeResponse issueChallenge(String contestId, String problemId, String userId) {
        Contest contest = getPublishedContestOrThrow(contestId);
        assertSubmissionWindowOpen(contest);
        ContestProblem problem = loadProblemInContest(contestId, problemId);

        // ensure participant exists so challenge issuance == participation start
        participantRepo.findByContestIdAndUserId(contestId, userId)
                .orElseGet(() -> participantRepo.save(ContestParticipant.builder()
                        .contestId(contestId).userId(userId).startedAt(Instant.now()).build()));

        List<ContestTestCase> cases = testCaseRepo.findByProblemIdOrderByDisplayOrder(problemId);
        if (cases.isEmpty()) {
            throw new IllegalStateException("Problem has no test cases configured.");
        }

        List<ChallengeResponse.ChallengeCase> issued = cases.stream()
                .map(tc -> ChallengeResponse.ChallengeCase.builder()
                        .testCaseId(tc.getId())
                        .input(tc.getInput())
                        .isHidden(tc.getIsHidden())
                        .displayOrder(tc.getDisplayOrder())
                        .signature(payloadSigner.sign(userId, problemId, tc.getId(), tc.getInput()))
                        .build())
                .toList();

        return ChallengeResponse.builder()
                .problemId(problemId)
                .harnessType(problem.getHarnessType().name())
                .timeLimitMs(problem.getTimeLimitMs())
                .cases(issued)
                .build();
    }

    // ── Registration ─────────────────────────────────────────────────────────────

    @Transactional
    public void register(String contestId, String userId) {
        getPublishedContestOrThrow(contestId);
        if (participantRepo.existsByContestIdAndUserId(contestId, userId)) {
            return; // idempotent
        }
        participantRepo.save(ContestParticipant.builder()
                .contestId(contestId)
                .userId(userId)
                .startedAt(Instant.now())
                .build());
        log.info("[CONTEST] user={} registered contest={}",
                com.unlearnarc.common.SafeLog.field(userId), com.unlearnarc.common.SafeLog.field(contestId));
    }

    // ── Submission (authoritative grading) ───────────────────────────────────────

    @Transactional
    public SubmissionResponse submit(String contestId, String userId, SubmissionRequest req) {
        userRepo.lockForContestScoring(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Contest contest = getPublishedContestOrThrow(contestId);
        assertSubmissionWindowOpen(contest);

        ContestProblem problem = loadProblemInContest(contestId, req.getProblemId());
        assertLanguageAllowed(contest, req.getLanguage());

        ContestParticipant participant = participantRepo
                .findByContestIdAndUserId(contestId, userId)
                .orElseGet(() -> participantRepo.save(ContestParticipant.builder()
                        .contestId(contestId).userId(userId).startedAt(Instant.now()).build()));

        List<ContestTestCase> cases = testCaseRepo.findByProblemIdOrderByDisplayOrder(req.getProblemId());
        if (cases.isEmpty()) {
            throw new IllegalStateException("Problem has no test cases configured.");
        }

        Map<String, SubmissionRequest.TestOutcome> reported = req.getResults().stream()
                .collect(Collectors.toMap(
                        SubmissionRequest.TestOutcome::getTestCaseId, o -> o, (a, b) -> b));

        int totalWeight = cases.stream().mapToInt(ContestTestCase::getWeight).sum();
        int earnedWeight = 0;
        int passed = 0;
        int maxRuntime = 0;
        boolean sawTimeout = false, sawRuntimeError = false, sawCompileError = false, malformed = false;

        List<SubmissionResponse.CaseVerdict> verdicts = new ArrayList<>();

        for (ContestTestCase tc : cases) {
            SubmissionRequest.TestOutcome out = reported.get(tc.getId());
            boolean casePassed;

            if (out == null) {
                malformed = true;
                casePassed = false;
            } else if (!payloadSigner.verify(out.getSignature(), userId,
                    req.getProblemId(), tc.getId(), out.getInput())) {
                // Forged / tampered / expired challenge, or input mutated.
                log.warn("[CONTEST] signature verification FAILED user={} problem={} case={}",
                        userId, req.getProblemId(), tc.getId());
                malformed = true;
                casePassed = false;
            } else {
                if (out.getRuntimeMs() != null) maxRuntime = Math.max(maxRuntime, out.getRuntimeMs());
                String status = out.getClientStatus() == null ? "OK" : out.getClientStatus().toUpperCase();
                switch (status) {
                    case "TIMEOUT"       -> sawTimeout = true;
                    case "RUNTIME_ERROR" -> sawRuntimeError = true;
                    case "COMPILE_ERROR" -> sawCompileError = true;
                    default -> { /* OK */ }
                }
                // SERVER-SIDE re-validation — this is authoritative.
                casePassed = "OK".equals(status) && outputValidator.matches(
                        tc.getExpectedOutput(), out.getProducedOutput(), tc.getStrictMatch());
            }

            if (casePassed) {
                passed++;
                earnedWeight += tc.getWeight();
            }

            boolean isPublic = !tc.getIsHidden();
            verdicts.add(SubmissionResponse.CaseVerdict.builder()
                    .testCaseId(tc.getId())
                    .passed(casePassed)
                    .displayOrder(tc.getDisplayOrder())
                    .expectedOutput(isPublic ? tc.getExpectedOutput() : null)
                    .producedOutput(isPublic && out != null ? out.getProducedOutput() : null)
                    .build());
        }

        int score = totalWeight > 0
                ? (int) Math.round(problem.getMaxPoints() * (earnedWeight / (double) totalWeight))
                : 0;

        Verdict verdict = resolveVerdict(passed, cases.size(), malformed,
                sawCompileError, sawRuntimeError, sawTimeout);

        // Read history BEFORE saving: JPA queries auto-flush pending submissions.
        List<ContestSubmission> history = submissionRepo.findByContestIdAndUserIdAndProblemId(
                contestId, userId, req.getProblemId());
        int previousBest = history.stream().mapToInt(ContestSubmission::getScore).max().orElse(0);
        boolean alreadySolved = history.stream().anyMatch(s -> s.getVerdict() == Verdict.ACCEPTED);

        ContestSubmission submission = submissionRepo.save(ContestSubmission.builder()
                .contestId(contestId)
                .problemId(req.getProblemId())
                .userId(userId)
                .language(req.getLanguage())
                .sourceCode(req.getSourceCode())
                .verdict(verdict)
                .passedTests(passed)
                .totalTests(cases.size())
                .score(score)
                .runtimeMs(maxRuntime)
                .build());

        int delta = applyScoreToLeaderboard(participant, contest,
                score, previousBest, alreadySolved, verdict == Verdict.ACCEPTED);

        // HYBRID cache: reflect the contest gain into the global/region leaderboard.
        if (delta > 0) {
            leaderboardService.awardPoints(userId, delta);
        }

        // Any contest submission counts as activity today (streak + calendar).
        // Best-effort: never let a streak-write failure break the submission response.
        try { streakService.recordActivity(userId); }
        catch (Exception ex) { log.warn("[CONTEST] streak update skipped for user={}: {}", userId, ex.getMessage()); }

        return SubmissionResponse.builder()
                .submissionId(submission.getId())
                .problemId(req.getProblemId())
                .verdict(verdict)
                .passedTests(passed)
                .totalTests(cases.size())
                .score(score)
                .maxPoints(problem.getMaxPoints())
                .scoreDelta(delta)
                .participantTotalScore(participant.getTotalScore())
                .runtimeMs(maxRuntime)
                .caseVerdicts(verdicts)
                .build();
    }

    // ── Leaderboard ──────────────────────────────────────────────────────────────

    public List<LeaderboardEntry> leaderboard(String contestId) {
        getPublishedContestOrThrow(contestId);
        List<ContestParticipant> parts =
                participantRepo.findByContestIdOrderByTotalScoreDescPenaltyAscLastAcceptedAtAsc(contestId);

        Map<String, String> names = userRepo.findAllById(
                        parts.stream().map(ContestParticipant::getUserId).toList())
                .stream().collect(Collectors.toMap(User::getId, User::getName, (a, b) -> a));

        List<LeaderboardEntry> board = new ArrayList<>();
        int rank = 1;
        for (ContestParticipant p : parts) {
            board.add(LeaderboardEntry.builder()
                    .rank(rank++)
                    .userId(p.getUserId())
                    .userName(names.getOrDefault(p.getUserId(), "Unknown"))
                    .totalScore(p.getTotalScore())
                    .solvedCount(p.getSolvedCount())
                    .penalty(p.getPenalty())
                    .lastAcceptedAt(p.getLastAcceptedAt())
                    .build());
        }
        return board;
    }

    public List<ContestSubmission> mySubmissions(String contestId, String userId) {
        return submissionRepo.findByContestIdAndUserIdOrderBySubmittedAtDesc(contestId, userId);
    }

    /** Derive durable progress from graded history, including pre-fix submissions. */
    public List<ContestProgressResponse> myProgress(String userId) {
        Map<String, List<ContestSubmission>> byContest = submissionRepo.findByUserId(userId).stream()
                .collect(Collectors.groupingBy(ContestSubmission::getContestId));
        List<ContestProgressResponse> progress = new ArrayList<>();
        for (var entry : byContest.entrySet()) {
            List<ContestProblem> problems = problemRepo
                    .findByContestIdAndIsActiveTrueOrderByDisplayOrder(entry.getKey());
            Set<String> activeIds = problems.stream().map(ContestProblem::getId).collect(Collectors.toSet());
            Set<String> solved = entry.getValue().stream()
                    .filter(s -> s.getVerdict() == Verdict.ACCEPTED && activeIds.contains(s.getProblemId()))
                    .map(ContestSubmission::getProblemId).collect(Collectors.toSet());
            Map<String, Integer> best = new HashMap<>();
            entry.getValue().forEach(s -> best.merge(s.getProblemId(), s.getScore(), Math::max));
            progress.add(new ContestProgressResponse(entry.getKey(),
                    best.values().stream().mapToInt(Integer::intValue).sum(), problems.size(), solved,
                    !problems.isEmpty() && solved.size() == problems.size()));
        }
        progress.sort(Comparator.comparing(ContestProgressResponse::contestId));
        return progress;
    }

    // ── Internals ────────────────────────────────────────────────────────────────

    /**
     * Keeps the participant total = sum of BEST score per problem (so re-submits
     * only add the improvement). Applies wrong-submission penalty + marks solved.
     */
    private int applyScoreToLeaderboard(ContestParticipant participant, Contest contest,
                                        int newScore, int previousBest,
                                        boolean alreadySolved, boolean accepted) {
        int delta = Math.max(0, newScore - previousBest);

        if (delta > 0) {
            participant.setTotalScore(participant.getTotalScore() + delta);
            participant.setLastAcceptedAt(Instant.now());
        }
        if (accepted && !alreadySolved) {
            participant.setSolvedCount(participant.getSolvedCount() + 1);
        }
        if (!accepted && contest.getWrongSubmissionPenalty() > 0) {
            participant.setPenalty(participant.getPenalty() + contest.getWrongSubmissionPenalty());
        }
        participantRepo.save(participant);
        return delta;
    }

    private Verdict resolveVerdict(int passed, int total, boolean malformed,
                                   boolean compileError, boolean runtimeError, boolean timeout) {
        if (malformed)      return Verdict.MALFORMED;
        if (compileError)   return Verdict.COMPILE_ERROR;
        if (passed == total) return Verdict.ACCEPTED;
        if (passed > 0)     return Verdict.PARTIAL;
        if (timeout)        return Verdict.TIME_LIMIT;
        if (runtimeError)   return Verdict.RUNTIME_ERROR;
        return Verdict.WRONG_ANSWER;
    }

    private ContestProblem loadProblemInContest(String contestId, String problemId) {
        return problemRepo.findById(problemId)
                .filter(p -> p.getContestId().equals(contestId))
                .orElseThrow(() -> new EntityNotFoundException("Problem not found in contest"));
    }

    private Contest getPublishedContestOrThrow(String id) {
        Contest c = contestRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Contest not found: " + id));
        if (c.getStatus() == ContestStatus.DRAFT) {
            throw new EntityNotFoundException("Contest not available");
        }
        return c;
    }

    private void assertSubmissionWindowOpen(Contest c) {
        Instant now = Instant.now();
        if (c.getStatus() == ContestStatus.ARCHIVED) {
            throw new IllegalStateException("Contest has ended.");
        }
        if (c.getStartTime() != null && now.isBefore(c.getStartTime())) {
            throw new IllegalStateException("Contest has not started yet.");
        }
        if (c.getEndTime() != null && now.isAfter(c.getEndTime())) {
            throw new IllegalStateException("Contest submission window is closed.");
        }
    }

    private void assertLanguageAllowed(Contest c, String language) {
        if (c.getAllowedLanguages() == null || c.getAllowedLanguages().isBlank()) return;
        Set<String> allowed = Arrays.stream(c.getAllowedLanguages().split(","))
                .map(s -> s.trim().toLowerCase()).collect(Collectors.toSet());
        if (!allowed.contains(language.toLowerCase())) {
            throw new IllegalArgumentException("Language not allowed in this contest: " + language);
        }
    }
}
