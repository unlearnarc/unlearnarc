package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Detailed "where to improve" report built from the learner's full test history.
 *
 * Three complementary lenses on weakness:
 *  - {@code weakAreas}  : per-entity (domain/course/topic) ranking by average score,
 *                         so the learner sees WHICH course/topic/domain drags them.
 *  - {@code difficultyGaps}: where accuracy collapses by difficulty (easy/medium/hard).
 *  - {@code recurringMistakes}: individual questions the learner repeatedly got wrong,
 *                         mined from the stored per-question answer snapshots.
 *
 * Each section is ordered worst-first and carries a short, actionable
 * {@code recommendation} string the UI can surface verbatim.
 */
@Data
@Builder
public class ImprovementReportResponse {

    private long                   attemptsAnalyzed;
    private String                 summary;

    /** Worst-performing scopes first. The headline of the report. */
    private List<WeakArea>         weakAreas;

    /** Difficulty tiers where the learner is below the attention threshold. */
    private List<DifficultyGap>    difficultyGaps;

    /** Questions missed more than once across attempts. */
    private List<RecurringMistake> recurringMistakes;

    @Data
    @Builder
    public static class WeakArea {
        private ScopeType entityType;
        private String    entityId;
        private String    entityName;
        private String    poolName;
        private long      attempts;
        private double    averageScore;    // 0–100
        private double    bestScore;
        private double    accuracy;        // correct / questions (0–100)
        private double    passRate;        // 0–100
        private String    severity;        // CRITICAL | NEEDS_WORK | ON_TRACK
        private String    recommendation;
    }

    @Data
    @Builder
    public static class DifficultyGap {
        private Difficulty difficulty;
        private long       totalAnswered;
        private long       correct;
        private double     accuracy;        // 0–100
        private String     severity;        // CRITICAL | NEEDS_WORK | ON_TRACK
        private String     recommendation;
    }

    @Data
    @Builder
    public static class RecurringMistake {
        private String     questionId;
        private String     questionText;
        private Difficulty difficulty;
        private long       timesSeen;
        private long       timesWrong;
        private double     wrongRate;       // 0–100
        private String     poolName;
        private String     recommendation;
    }
}
