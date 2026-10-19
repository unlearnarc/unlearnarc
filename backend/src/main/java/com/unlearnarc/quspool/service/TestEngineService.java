package com.unlearnarc.quspool.service;

import com.unlearnarc.mapping.repository.DomainSkillMappingRepository;
import com.unlearnarc.mapping.repository.SkillCourseMappingRepository;
import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.dto.TestQuestionResponse.TestAnswerOption;
import com.unlearnarc.quspool.dto.TestResultResponse.*;
import com.unlearnarc.quspool.entity.*;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.repository.*;
import com.unlearnarc.quspool.repository.TestAnalyticsRepository.ScopeHistoryProjection;
import com.unlearnarc.topic.repository.TopicRepository;
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
    private final SkillCourseMappingRepository skillCourseRepo;
    private final DomainSkillMappingRepository domainSkillRepo;
    private final TopicRepository            topicRepo;
    private final TestAnalyticsRepository    analyticsRepo;
    private final QuestionService            questionService;
    private final TestHistoryService         testHistoryService;

    /** Adaptive tuning knobs — kept here so product can tune the policy in one place. */
    private static final double MASTERY_SCORE   = 90.0; // ≥ this avg → shift weight to harder, broaden scope
    private static final double ADVANCING_SCORE = 75.0; // ≥ this avg → add more hard questions

    // ── Generate a test session ────────────────────────────────────────────────

    /**
     * Two flows share this entry point:
     *
     *  1. DIRECT (topic / course / domain quiz)  — {@code adaptive=false}.
     *     Draws the pool's fixed easy/medium/hard mix from the UNION of all pools
     *     under the entity (a course quiz pulls from every topic pool beneath it;
     *     a domain quiz pulls from every course + topic pool beneath it).
     *
     *  2. ADAPTIVE (Tests-page "Generate")        — {@code adaptive=true}, needs userId.
     *     Starts from the same union of pools, then RESHAPES the easy/medium/hard
     *     counts based on the learner's past attempts on this scope:
     *       • avg ≥ 90%  → mastery: skew hard, pull a few questions from a broader
     *                       pool set (course→its domain) so they see fresh material.
     *       • avg ≥ 75%  → advancing: add more HARD, trim EASY.
     *       • otherwise  → reinforce: keep/strengthen EASY+MEDIUM.
     *     Falls back to the plain mix when the learner has no history yet.
     */
    public TestSessionResponse generate(TestGenerationRequest req) {
        return generate(req, null);
    }

    public TestSessionResponse generate(TestGenerationRequest req, String userId) {
        // The set of pools we may draw from (union across the scope's children).
        List<QuestionPool> pools = resolvePools(req);
        // The "primary" pool supplies the session metadata (name, time limit, pass %).
        QuestionPool primary = pools.get(0);

        // Decide the difficulty mix: adaptive (history-driven) or the pool's default.
        DifficultyMix mix = req.isAdaptive() && userId != null
                ? adaptiveMix(req, primary, userId)
                : new DifficultyMix(primary.getEasyCount(), primary.getMediumCount(), primary.getHardCount(),
                        poolIds(pools), "DEFAULT");

        List<String> drawFrom = mix.poolIds();

        List<Question> easyQs   = drawRandom(drawFrom, Difficulty.EASY,   mix.easy());
        List<Question> mediumQs = drawRandom(drawFrom, Difficulty.MEDIUM, mix.medium());
        List<Question> hardQs   = drawRandom(drawFrom, Difficulty.HARD,   mix.hard());

        // Validate availability — collect ALL shortfalls so the caller can fix the
        // pools in one pass instead of discovering them one difficulty at a time.
        List<String> shortfalls = new ArrayList<>();
        if (easyQs.size() < mix.easy()) {
            shortfalls.add("EASY (required %d, available %d)".formatted(mix.easy(), easyQs.size()));
        }
        if (mediumQs.size() < mix.medium()) {
            shortfalls.add("MEDIUM (required %d, available %d)".formatted(mix.medium(), mediumQs.size()));
        }
        if (hardQs.size() < mix.hard()) {
            shortfalls.add("HARD (required %d, available %d)".formatted(mix.hard(), hardQs.size()));
        }
        if (!shortfalls.isEmpty()) {
            throw new IllegalStateException(
                    "Not enough active questions in the pools for %s \"%s\" to generate a test: %s. Add more questions or lower the per-difficulty counts."
                            .formatted(req.getScopeType(), primary.getName(), String.join(", ", shortfalls)));
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
                .poolId(primary.getId())
                .poolName(primary.getName())
                .scopeType(req.getScopeType())
                .entityId(req.getEntityId())
                .totalQuestions(mix.easy() + mix.medium() + mix.hard())
                .easyCount(mix.easy())
                .mediumCount(mix.medium())
                .hardCount(mix.hard())
                .timeLimitMinutes(primary.getTimeLimitMinutes())
                .passPercentage(primary.getPassPercentage())
                .totalPoints(totalPoints)
                .strategy(mix.strategy())
                .questions(questions)
                .build();
    }

    /**
     * ADAPTIVE flow: reshape the primary pool's mix from the learner's history on
     * this exact scope. Total question count is preserved so the test length is
     * stable; only the easy/medium/hard split (and, at mastery, the draw scope)
     * changes. Falls back to the default mix when the learner has no history yet.
     */
    private DifficultyMix adaptiveMix(TestGenerationRequest req, QuestionPool primary, String userId) {
        int total = primary.getTotalQuestions();
        List<String> basePools = poolIds(resolvePools(req));

        ScopeHistoryProjection h = analyticsRepo.scopeHistory(
                userId, req.getScopeType(), req.getEntityId());

        long attempts = h == null || h.getAttempts() == null ? 0 : h.getAttempts();
        if (attempts == 0) {
            // No history → behave like the default flow.
            return new DifficultyMix(primary.getEasyCount(), primary.getMediumCount(),
                    primary.getHardCount(), basePools, "DEFAULT_NO_HISTORY");
        }

        double avg = h.getAvgScore() == null ? 0 : h.getAvgScore();

        if (avg >= MASTERY_SCORE) {
            // Mastery: hard-heavy, and broaden the draw scope so they get fresh
            // material (a mastered course also pulls from its sibling courses in
            // the same domain / its own domain pool).
            int hard   = Math.max(1, Math.round(total * 0.6f));
            int medium = Math.max(0, Math.round(total * 0.3f));
            int easy   = Math.max(0, total - hard - medium);
            return new DifficultyMix(easy, medium, hard, broadenScope(req, basePools), "MASTERY");
        }
        if (avg >= ADVANCING_SCORE) {
            // Advancing: more hard, fewer easy.
            int hard   = Math.max(1, Math.round(total * 0.45f));
            int medium = Math.max(1, Math.round(total * 0.35f));
            int easy   = Math.max(0, total - hard - medium);
            return new DifficultyMix(easy, medium, hard, basePools, "ADVANCING");
        }
        // Reinforce: keep it approachable — strengthen easy/medium foundations.
        int easy   = Math.max(1, Math.round(total * 0.5f));
        int medium = Math.max(1, Math.round(total * 0.35f));
        int hard   = Math.max(0, total - easy - medium);
        return new DifficultyMix(easy, medium, hard, basePools, "REINFORCE");
    }

    /**
     * At mastery, widen the pool set so the learner sees fresh questions beyond the
     * exact entity: TOPIC → its course's pools; COURSE → its domain's pools;
     * DOMAIN → stays as-is (already the widest scope). Falls back to the base pools
     * if no broader mapping exists. De-duplicated.
     */
    private List<String> broadenScope(TestGenerationRequest req, List<String> basePools) {
        Set<String> widened = new LinkedHashSet<>(basePools);
        switch (req.getScopeType()) {
            case TOPIC -> topicRepo.findById(req.getEntityId()).ifPresent(t ->
                    widened.addAll(poolIdsForCourse(t.getCourseId())));
            case COURSE -> {
                // Find domains this course rolls up to (course → skill → domain) and
                // add every course+topic pool under those domains.
                skillCourseRepo.findByCourseId(req.getEntityId()).forEach(sc ->
                        domainSkillRepo.findBySkillId(sc.getSkillId()).forEach(ds ->
                                widened.addAll(poolIdsForDomain(ds.getDomainId()))));
            }
            case DOMAIN -> { /* already widest */ }
        }
        return new ArrayList<>(widened);
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
                isCorrect = ChoiceAnswerEvaluator.correct(question.getQuestionType(), correctIds, selectedIds);
            } else {
                // MULTIPLE_CORRECT: all selected must be correct AND all correct must be selected
                isCorrect = ChoiceAnswerEvaluator.correct(question.getQuestionType(), correctIds, selectedIds);
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

        // Persist the scope the LEARNER tested against (req), NOT the resolved pool's
        // own scope. With union resolution a COURSE/DOMAIN test can draw from a child
        // (e.g. TOPIC) pool, so pool.getScopeType() would mislabel the attempt and
        // later make entity-name resolution fail (showing a raw UUID). Fall back to
        // the pool's scope only when the request carries none (e.g. pinned poolId).
        ScopeType resultScope = req.getScopeType() != null ? req.getScopeType() : pool.getScopeType();
        String    resultEntityId = req.getEntityId() != null ? req.getEntityId() : pool.getId();

        TestResultResponse response = TestResultResponse.builder()
                .poolId(pool.getId())
                .poolName(pool.getName())
                .scopeType(resultScope)
                .entityId(resultEntityId)
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

    /**
     * Resolve the UNION of active pools to draw from for a scope.
     *
     * Key behaviour (fixes "every level must have its own questions"):
     *   • TOPIC  → the topic's own pools.
     *   • COURSE → the course's own pools PLUS every pool under each of its topics.
     *   • DOMAIN → the domain's own pools PLUS every course+topic pool beneath it
     *              (resolved via domain→skill→course mappings).
     *
     * So a course quiz reuses its topics' question pools, and a domain quiz reuses
     * its courses' (and their topics') pools — no need to duplicate questions at
     * every level. An explicit {@code poolId} still pins to a single pool.
     *
     * The "primary" pool (index 0) is the entity's OWN pool when present (so session
     * metadata like time limit / pass% comes from the most specific config), else
     * the first child pool found.
     */
    private List<QuestionPool> resolvePools(TestGenerationRequest req) {
        if (req.getPoolId() != null) {
            QuestionPool pinned = poolService.getPoolOrThrow(req.getPoolId());
            return List.of(pinned);
        }

        // LinkedHashSet preserves "own pools first", de-dupes across the hierarchy.
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        switch (req.getScopeType()) {
            case TOPIC  -> ids.addAll(poolIdsForTopic(req.getEntityId()));
            case COURSE -> ids.addAll(poolIdsForCourse(req.getEntityId()));
            case DOMAIN -> ids.addAll(poolIdsForDomain(req.getEntityId()));
        }

        if (ids.isEmpty()) {
            throw new EntityNotFoundException(
                    "No question pool found for %s: %s (nor any of its child pools)"
                            .formatted(req.getScopeType(), req.getEntityId()));
        }

        List<QuestionPool> activePools = ids.stream()
                .map(poolService::getPoolOrThrow)
                .filter(QuestionPool::getIsActive)
                .toList();

        if (activePools.isEmpty()) {
            throw new EntityNotFoundException(
                    "No active pool found for %s: %s".formatted(req.getScopeType(), req.getEntityId()));
        }
        return activePools;
    }

    /** All pool ids directly mapped to a topic. */
    private List<String> poolIdsForTopic(String topicId) {
        return topicPoolRepo.findByTopicId(topicId).stream()
                .map(TopicPoolMapping::getPoolId).toList();
    }

    /** Course's own pools + every pool under each of its topics (de-duped, own-first). */
    private List<String> poolIdsForCourse(String courseId) {
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        coursePoolRepo.findByCourseId(courseId).forEach(m -> ids.add(m.getPoolId()));
        topicRepo.findByCourseIdOrderByTopicOrder(courseId)
                .forEach(t -> ids.addAll(poolIdsForTopic(t.getId())));
        return new ArrayList<>(ids);
    }

    /** Domain's own pools + every course (and their topics') pools beneath it. */
    private List<String> poolIdsForDomain(String domainId) {
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        domainPoolRepo.findByDomainId(domainId).forEach(m -> ids.add(m.getPoolId()));
        // domain → skills → courses → (course + its topic) pools
        domainSkillRepo.findByDomainId(domainId).forEach(ds ->
                skillCourseRepo.findBySkillId(ds.getSkillId()).forEach(sc ->
                        ids.addAll(poolIdsForCourse(sc.getCourseId()))));
        return new ArrayList<>(ids);
    }

    private List<String> poolIds(List<QuestionPool> pools) {
        return pools.stream().map(QuestionPool::getId).toList();
    }

    /** Draw {@code count} random active questions of a difficulty across many pools. */
    private List<Question> drawRandom(List<String> poolIds, Difficulty difficulty, int count) {
        if (count <= 0 || poolIds.isEmpty()) return List.of();
        return questionRepo.findRandomByPoolsAndDifficulty(poolIds, difficulty.name(), count);
    }

    /** Immutable carrier for a resolved difficulty mix + the pools it draws from. */
    private record DifficultyMix(int easy, int medium, int hard,
                                 List<String> poolIds, String strategy) {}

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
