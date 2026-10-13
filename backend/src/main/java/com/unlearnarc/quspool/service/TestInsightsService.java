package com.unlearnarc.quspool.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.quspool.dto.ImprovementReportResponse;
import com.unlearnarc.quspool.dto.ImprovementReportResponse.DifficultyGap;
import com.unlearnarc.quspool.dto.ImprovementReportResponse.RecurringMistake;
import com.unlearnarc.quspool.dto.ImprovementReportResponse.WeakArea;
import com.unlearnarc.quspool.dto.InsightsDashboardResponse;
import com.unlearnarc.quspool.dto.InsightsDashboardResponse.DifficultyAccuracy;
import com.unlearnarc.quspool.dto.InsightsDashboardResponse.ScorePoint;
import com.unlearnarc.quspool.dto.InsightsDashboardResponse.WeakAreaHighlight;
import com.unlearnarc.quspool.dto.TestResultResponse;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.entity.TestResult;
import com.unlearnarc.quspool.repository.TestAnalyticsRepository;
import com.unlearnarc.quspool.repository.TestAnalyticsRepository.EntityPerformanceProjection;
import com.unlearnarc.topic.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns the raw persisted test history into learner-facing insights:
 *
 *  - {@link #dashboard}  → quick "at a glance" KPIs + trend + difficulty accuracy
 *                          + a pointer to the single weakest area.
 *  - {@link #improvementReport} → the detailed "where to improve" drill-down:
 *                          weak entities (domain/course/topic), difficulty gaps,
 *                          and recurring wrong questions mined from the snapshots.
 *
 * Purely read-only; it layers on top of {@link TestHistoryService}'s durable data
 * and never mutates anything. Thresholds live as constants so product can tune
 * them in one place.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TestInsightsService {

    /** Below this average score (%) an area is CRITICAL. */
    private static final double CRITICAL_THRESHOLD = 50.0;
    /** Below this average score (%) an area NEEDS_WORK (but is not critical). */
    private static final double ATTENTION_THRESHOLD = 70.0;
    /** Cap on how many rows each report section returns. */
    private static final int    MAX_WEAK_AREAS = 10;
    private static final int    MAX_RECURRING_MISTAKES = 15;
    /** Cap on the dashboard sparkline length. */
    private static final int    MAX_SPARKLINE_POINTS = 20;

    private final TestAnalyticsRepository analyticsRepo;
    private final DomainRepository        domainRepo;
    private final CourseRepository        courseRepo;
    private final TopicRepository         topicRepo;
    private final ObjectMapper            objectMapper;

    // ── Public API ─────────────────────────────────────────────────────────────

    public InsightsDashboardResponse dashboard(String userId, Integer windowDays) {
        Instant since = windowStart(windowDays);
        List<TestResult> results = analyticsRepo.findAllForUser(userId, since); // newest-first

        if (results.isEmpty()) {
            return emptyDashboard();
        }

        long totalAttempts   = results.size();
        long totalQuestions  = results.stream().mapToLong(r -> nz(r.getTotalQuestions())).sum();
        long totalCorrect    = results.stream().mapToLong(r -> nz(r.getCorrectCount())).sum();
        long totalTime       = results.stream().mapToLong(r -> nz(r.getTimeTakenSeconds())).sum();

        double averageScore  = results.stream().mapToDouble(r -> nzd(r.getScorePercentage())).average().orElse(0);
        double bestScore     = results.stream().mapToDouble(r -> nzd(r.getScorePercentage())).max().orElse(0);
        double latestScore   = nzd(results.get(0).getScorePercentage()); // newest-first
        long   passedCount   = results.stream().filter(r -> Boolean.TRUE.equals(r.getPassed())).count();
        double passRate      = pct(passedCount, totalAttempts);

        double[] trend       = computeTrend(results);
        String   trendLabel  = trendLabel(trend[0], totalAttempts);

        return InsightsDashboardResponse.builder()
                .totalAttempts(totalAttempts)
                .totalQuestionsAnswered(totalQuestions)
                .totalCorrect(totalCorrect)
                .averageScore(round1(averageScore))
                .bestScore(round1(bestScore))
                .latestScore(round1(latestScore))
                .passRate(round1(passRate))
                .trendDelta(round1(trend[0]))
                .trendLabel(trendLabel)
                .totalTimeSeconds(totalTime)
                .difficultyAccuracy(difficultyAccuracy(results))
                .recentScores(sparkline(results))
                .topWeakArea(topWeakArea(userId, since))
                .build();
    }

    public ImprovementReportResponse improvementReport(String userId, Integer windowDays) {
        Instant since = windowStart(windowDays);
        List<TestResult> results = analyticsRepo.findAllForUser(userId, since);

        if (results.isEmpty()) {
            return ImprovementReportResponse.builder()
                    .attemptsAnalyzed(0)
                    .summary("No test attempts yet — take a test to unlock your personalised improvement report.")
                    .weakAreas(List.of())
                    .difficultyGaps(List.of())
                    .recurringMistakes(List.of())
                    .build();
        }

        List<WeakArea>         weakAreas    = weakAreas(userId, since);
        List<DifficultyGap>    gaps         = difficultyGaps(results);
        List<RecurringMistake> mistakes     = recurringMistakes(results);

        return ImprovementReportResponse.builder()
                .attemptsAnalyzed(results.size())
                .summary(summarise(weakAreas, gaps, results.size()))
                .weakAreas(weakAreas)
                .difficultyGaps(gaps)
                .recurringMistakes(mistakes)
                .build();
    }

    // ── Dashboard helpers ──────────────────────────────────────────────────────

    private List<DifficultyAccuracy> difficultyAccuracy(List<TestResult> results) {
        long easyT = 0, easyC = 0, medT = 0, medC = 0, hardT = 0, hardC = 0;
        for (TestResult r : results) {
            easyT += nz(r.getEasyTotal());   easyC += nz(r.getEasyCorrect());
            medT  += nz(r.getMediumTotal()); medC  += nz(r.getMediumCorrect());
            hardT += nz(r.getHardTotal());   hardC += nz(r.getHardCorrect());
        }
        return List.of(
                difAcc(Difficulty.EASY, easyT, easyC),
                difAcc(Difficulty.MEDIUM, medT, medC),
                difAcc(Difficulty.HARD, hardT, hardC));
    }

    private DifficultyAccuracy difAcc(Difficulty d, long total, long correct) {
        return DifficultyAccuracy.builder()
                .difficulty(d).total(total).correct(correct)
                .accuracy(round1(pct(correct, total)))
                .build();
    }

    private List<ScorePoint> sparkline(List<TestResult> results) {
        List<ScorePoint> points = new ArrayList<>();
        for (int i = 0; i < Math.min(results.size(), MAX_SPARKLINE_POINTS); i++) {
            TestResult r = results.get(i);
            points.add(ScorePoint.builder()
                    .attemptedAt(r.getCreatedAt())
                    .scorePercentage(round1(nzd(r.getScorePercentage())))
                    .poolName(r.getPoolName())
                    .build());
        }
        return points;
    }

    /**
     * trend[0] = latest-half average minus earlier-half average.
     * Splits the newest-first list in two and compares, so a single lucky/unlucky
     * attempt doesn't dominate the signal.
     */
    private double[] computeTrend(List<TestResult> newestFirst) {
        int n = newestFirst.size();
        if (n < 2) return new double[]{0};
        int half = n / 2;
        double recent = newestFirst.subList(0, half).stream()
                .mapToDouble(r -> nzd(r.getScorePercentage())).average().orElse(0);
        double older = newestFirst.subList(half, n).stream()
                .mapToDouble(r -> nzd(r.getScorePercentage())).average().orElse(0);
        return new double[]{recent - older};
    }

    private String trendLabel(double delta, long attempts) {
        if (attempts < 2) return "INSUFFICIENT_DATA";
        if (delta > 2)  return "IMPROVING";
        if (delta < -2) return "DECLINING";
        return "STEADY";
    }

    private WeakAreaHighlight topWeakArea(String userId, Instant since) {
        return analyticsRepo.aggregateByEntity(userId, since).stream()
                .min(Comparator.comparingDouble(p -> nzd(p.getAvgScore())))
                .map(p -> WeakAreaHighlight.builder()
                        .entityType(p.getEntityType() == null ? null : p.getEntityType().name())
                        .entityId(p.getEntityId())
                        .entityName(resolveEntityName(p.getEntityType(), p.getEntityId()))
                        .poolName(p.getPoolName())
                        .averageScore(round1(nzd(p.getAvgScore())))
                        .attempts(nz(p.getAttempts()))
                        .build())
                .orElse(null);
    }

    // ── Report helpers ─────────────────────────────────────────────────────────

    private List<WeakArea> weakAreas(String userId, Instant since) {
        List<EntityPerformanceProjection> rows = analyticsRepo.aggregateByEntity(userId, since);
        List<WeakArea> areas = new ArrayList<>();
        for (EntityPerformanceProjection p : rows) {
            double avg      = round1(nzd(p.getAvgScore()));
            double accuracy = round1(pct(nz(p.getTotalCorrect()), nz(p.getTotalQuestions())));
            double passRate = round1(pct(nz(p.getPassedCount()), nz(p.getAttempts())));
            String severity = severity(avg);
            areas.add(WeakArea.builder()
                    .entityType(p.getEntityType())
                    .entityId(p.getEntityId())
                    .entityName(resolveEntityName(p.getEntityType(), p.getEntityId()))
                    .poolName(p.getPoolName())
                    .attempts(nz(p.getAttempts()))
                    .averageScore(avg)
                    .bestScore(round1(nzd(p.getMaxScore())))
                    .accuracy(accuracy)
                    .passRate(passRate)
                    .severity(severity)
                    .recommendation(areaRecommendation(p.getEntityType(),
                            resolveEntityName(p.getEntityType(), p.getEntityId()), severity, avg))
                    .build());
        }
        // Worst-first, cap the list.
        areas.sort(Comparator.comparingDouble(WeakArea::getAverageScore));
        return areas.size() > MAX_WEAK_AREAS ? areas.subList(0, MAX_WEAK_AREAS) : areas;
    }

    private List<DifficultyGap> difficultyGaps(List<TestResult> results) {
        long easyT = 0, easyC = 0, medT = 0, medC = 0, hardT = 0, hardC = 0;
        for (TestResult r : results) {
            easyT += nz(r.getEasyTotal());   easyC += nz(r.getEasyCorrect());
            medT  += nz(r.getMediumTotal()); medC  += nz(r.getMediumCorrect());
            hardT += nz(r.getHardTotal());   hardC += nz(r.getHardCorrect());
        }
        List<DifficultyGap> gaps = new ArrayList<>();
        gaps.add(difficultyGap(Difficulty.EASY, easyT, easyC));
        gaps.add(difficultyGap(Difficulty.MEDIUM, medT, medC));
        gaps.add(difficultyGap(Difficulty.HARD, hardT, hardC));
        // Only surface tiers the learner has actually attempted, worst-first.
        gaps.removeIf(g -> g.getTotalAnswered() == 0);
        gaps.sort(Comparator.comparingDouble(DifficultyGap::getAccuracy));
        return gaps;
    }

    private DifficultyGap difficultyGap(Difficulty d, long total, long correct) {
        double accuracy = round1(pct(correct, total));
        String severity = severity(accuracy);
        return DifficultyGap.builder()
                .difficulty(d)
                .totalAnswered(total)
                .correct(correct)
                .accuracy(accuracy)
                .severity(severity)
                .recommendation(difficultyRecommendation(d, severity, accuracy))
                .build();
    }

    /**
     * Mines the stored per-question JSON snapshots for questions the learner got
     * wrong more than once. Robust to the live bank changing because each snapshot
     * carries its own question text/difficulty.
     */
    private List<RecurringMistake> recurringMistakes(List<TestResult> results) {
        Map<String, MistakeAccumulator> byQuestion = new HashMap<>();
        for (TestResult r : results) {
            for (TestResultResponse.QuestionResult qr : readSnapshot(r.getAnswerSnapshot())) {
                if (qr.getQuestionId() == null) continue;
                MistakeAccumulator acc = byQuestion.computeIfAbsent(qr.getQuestionId(), k -> new MistakeAccumulator());
                acc.timesSeen++;
                if (Boolean.FALSE.equals(qr.getIsCorrect())) acc.timesWrong++;
                // Keep the latest non-null metadata for display.
                if (qr.getQuestionText() != null) acc.questionText = qr.getQuestionText();
                if (qr.getDifficulty() != null)   acc.difficulty = qr.getDifficulty();
                if (r.getPoolName() != null)       acc.poolName = r.getPoolName();
            }
        }

        List<RecurringMistake> mistakes = new ArrayList<>();
        for (Map.Entry<String, MistakeAccumulator> e : byQuestion.entrySet()) {
            MistakeAccumulator a = e.getValue();
            if (a.timesWrong < 2) continue; // "recurring" = wrong at least twice
            double wrongRate = round1(pct(a.timesWrong, a.timesSeen));
            mistakes.add(RecurringMistake.builder()
                    .questionId(e.getKey())
                    .questionText(a.questionText)
                    .difficulty(a.difficulty)
                    .timesSeen(a.timesSeen)
                    .timesWrong(a.timesWrong)
                    .wrongRate(wrongRate)
                    .poolName(a.poolName)
                    .recommendation("Revisit this concept — missed " + a.timesWrong
                            + " of " + a.timesSeen + " times. Review the explanation and retry.")
                    .build());
        }
        // Most-missed first (by wrong count, then rate).
        mistakes.sort(Comparator
                .comparingLong(RecurringMistake::getTimesWrong).reversed()
                .thenComparing(Comparator.comparingDouble(RecurringMistake::getWrongRate).reversed()));
        return mistakes.size() > MAX_RECURRING_MISTAKES
                ? mistakes.subList(0, MAX_RECURRING_MISTAKES) : mistakes;
    }

    // ── Recommendation copy ────────────────────────────────────────────────────

    private String summarise(List<WeakArea> weakAreas, List<DifficultyGap> gaps, int attempts) {
        if (weakAreas.isEmpty()) {
            return "Analysed " + attempts + " attempt(s). Not enough scoped data yet to rank weak areas.";
        }
        WeakArea worst = weakAreas.get(0);
        StringBuilder sb = new StringBuilder();
        sb.append("Analysed ").append(attempts).append(" attempt(s). ");
        sb.append("Your biggest opportunity is ")
          .append(worst.getEntityType() == null ? "an area" : worst.getEntityType().name().toLowerCase())
          .append(" \"").append(worst.getEntityName() == null ? worst.getPoolName() : worst.getEntityName())
          .append("\" at ").append(worst.getAverageScore()).append("% average.");
        gaps.stream().filter(g -> !"ON_TRACK".equals(g.getSeverity())).findFirst().ifPresent(g ->
                sb.append(" You also struggle most with ")
                  .append(g.getDifficulty().name().toLowerCase())
                  .append(" questions (").append(g.getAccuracy()).append("% accuracy)."));
        return sb.toString();
    }

    private String severity(double score) {
        if (score < CRITICAL_THRESHOLD)  return "CRITICAL";
        if (score < ATTENTION_THRESHOLD) return "NEEDS_WORK";
        return "ON_TRACK";
    }

    private String areaRecommendation(ScopeType type, String name, String severity, double avg) {
        String label = type == null ? "this area" : (type.name().toLowerCase() + " \"" + name + "\"");
        return switch (severity) {
            case "CRITICAL"   -> "Prioritise " + label + " — averaging only " + avg
                    + "%. Restudy the fundamentals before retaking.";
            case "NEEDS_WORK" -> "Strengthen " + label + " — " + avg
                    + "% average. A focused review session should push you over the pass line.";
            default           -> "You're on track in " + label + " (" + avg + "%). Keep it up.";
        };
    }

    private String difficultyRecommendation(Difficulty d, String severity, double acc) {
        String tier = d.name().toLowerCase();
        return switch (severity) {
            case "CRITICAL"   -> "Only " + acc + "% on " + tier
                    + " questions — this is your weakest tier. Drill " + tier + "-level practice.";
            case "NEEDS_WORK" -> acc + "% on " + tier
                    + " questions. More practice here will lift your overall score.";
            default           -> "Solid on " + tier + " questions (" + acc + "%).";
        };
    }

    // ── Entity name resolution (best-effort; id-only fallback) ──────────────────

    private String resolveEntityName(ScopeType type, String entityId) {
        if (type == null || entityId == null) return null;
        try {
            return switch (type) {
                case DOMAIN -> domainRepo.findById(entityId).map(d -> d.getName()).orElse(entityId);
                case COURSE -> courseRepo.findById(entityId).map(c -> c.getName()).orElse(entityId);
                case TOPIC  -> topicRepo.findById(entityId).map(t -> t.getName()).orElse(entityId);
            };
        } catch (Exception ex) {
            log.debug("[INSIGHTS] Could not resolve {} name for {}: {}", type, entityId, ex.getMessage());
            return entityId;
        }
    }

    // ── Low-level utils ────────────────────────────────────────────────────────

    private List<TestResultResponse.QuestionResult> readSnapshot(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(
                            List.class, TestResultResponse.QuestionResult.class));
        } catch (JsonProcessingException e) {
            log.warn("[INSIGHTS] Could not deserialize answer snapshot: {}", e.getMessage());
            return List.of();
        }
    }

    private Instant windowStart(Integer windowDays) {
        if (windowDays == null || windowDays <= 0) return null; // all time
        return Instant.now().minus(windowDays, ChronoUnit.DAYS);
    }

    private InsightsDashboardResponse emptyDashboard() {
        return InsightsDashboardResponse.builder()
                .totalAttempts(0)
                .totalQuestionsAnswered(0)
                .totalCorrect(0)
                .averageScore(0).bestScore(0).latestScore(0).passRate(0)
                .trendDelta(0).trendLabel("INSUFFICIENT_DATA")
                .totalTimeSeconds(0)
                .difficultyAccuracy(List.of(
                        difAcc(Difficulty.EASY, 0, 0),
                        difAcc(Difficulty.MEDIUM, 0, 0),
                        difAcc(Difficulty.HARD, 0, 0)))
                .recentScores(List.of())
                .topWeakArea(null)
                .build();
    }

    private static double pct(long num, long den) { return den == 0 ? 0.0 : (num * 100.0) / den; }
    private static long   nz(Long v)    { return v == null ? 0L : v; }
    private static long   nz(Integer v) { return v == null ? 0L : v.longValue(); }
    private static double nzd(Double v) { return v == null ? 0.0 : v; }
    private static double round1(double v) { return Math.round(v * 10.0) / 10.0; }

    /** Mutable accumulator used while folding snapshots into recurring mistakes. */
    private static final class MistakeAccumulator {
        long       timesSeen;
        long       timesWrong;
        String     questionText;
        Difficulty difficulty;
        String     poolName;
    }
}
