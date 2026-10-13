package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.Question.Difficulty;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

/**
 * Quick "at a glance" dashboard for a learner, computed from their persisted
 * test history. Everything here is cheap aggregate data meant to render cards +
 * a sparkline without a second round-trip; the heavier drill-down lives in
 * {@link ImprovementReportResponse}.
 */
@Data
@Builder
public class InsightsDashboardResponse {

    /** How many graded attempts were considered (after the optional time window). */
    private long    totalAttempts;
    private long    totalQuestionsAnswered;
    private long    totalCorrect;

    /** Mean of per-attempt score percentages. */
    private double  averageScore;
    private double  bestScore;
    private double  latestScore;

    /** Pass rate across all considered attempts (0–100). */
    private double  passRate;

    /** Signed difference latest-vs-previous average (positive = improving). */
    private double  trendDelta;
    private String  trendLabel;   // IMPROVING | DECLINING | STEADY | INSUFFICIENT_DATA

    /** Total learning time captured from client-reported seconds. */
    private long    totalTimeSeconds;

    /** Accuracy split by difficulty — the first signal of "where to improve". */
    private List<DifficultyAccuracy> difficultyAccuracy;

    /** Newest-first score series for a sparkline (bounded). */
    private List<ScorePoint> recentScores;

    /** The single weakest entity (lowest avg score) — a shortcut to the report. */
    private WeakAreaHighlight topWeakArea;

    @Data
    @Builder
    public static class DifficultyAccuracy {
        private Difficulty difficulty;
        private long       total;
        private long       correct;
        private double     accuracy;   // 0–100
    }

    @Data
    @Builder
    public static class ScorePoint {
        private Instant attemptedAt;
        private double  scorePercentage;
        private String  poolName;
    }

    @Data
    @Builder
    public static class WeakAreaHighlight {
        private String  entityType;
        private String  entityId;
        private String  entityName;
        private String  poolName;
        private double  averageScore;
        private long    attempts;
    }
}
