package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.Question.QuestionType;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Full result breakdown returned after grading a test submission.
 *
 * Field names are aligned with the student frontend contract
 * (student/src/types/index.ts → TestResultResponse / QuestionResult):
 *   percentageScore, correctAnswers/wrongAnswers/skippedAnswers, breakdown[].
 * Legacy aggregate names (correctCount, scorePercentage, questionResults) are
 * exposed as read-only aliases so the history service — which populates the DTO
 * via the builder — keeps working unchanged.
 */
@Data
@Builder
public class TestResultResponse {

    private String    poolId;
    private String    poolName;
    private ScopeType scopeType;
    private String    entityId;

    private Integer totalQuestions;

    // Canonical counts (frontend reads correctAnswers/wrongAnswers/skippedAnswers)
    private Integer correctAnswers;
    private Integer wrongAnswers;
    private Integer skippedAnswers;

    private Integer totalPoints;
    private Integer earnedPoints;

    private Double  percentageScore;
    private Integer passPercentage;
    private Boolean passed;
    private Boolean improvementNeeded;

    private Integer timeTakenSeconds;

    // Breakdown by difficulty
    private DifficultyBreakdown easy;
    private DifficultyBreakdown medium;
    private DifficultyBreakdown hard;

    /** Per-question detail (shows correct answers after test). Frontend reads `breakdown`. */
    private List<QuestionResult> breakdown;

    // ── Aliases (keep server-side callers using the old names compiling) ──────────

    public Integer getCorrectCount()           { return correctAnswers; }
    public Integer getWrongCount()             { return wrongAnswers; }
    public Integer getSkippedCount()           { return skippedAnswers; }
    public Double  getScorePercentage()        { return percentageScore; }
    public List<QuestionResult> getQuestionResults() { return breakdown; }

    @Data
    @Builder
    public static class DifficultyBreakdown {
        private Difficulty difficulty;
        private Integer    total;
        private Integer    correct;
        private Integer    points;
        private Integer    earnedPoints;
    }

    @Data
    @Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class QuestionResult {
        private String              questionId;
        private String              questionText;
        private QuestionType        questionType;
        private Difficulty          difficulty;
        private Integer             points;
        private Integer             earnedPoints;
        private Boolean             isCorrect;
        private List<String>        selectedAnswerIds;
        private List<String>        correctAnswerIds;
        private String              explanation;
        /** Answer options with isCorrect revealed (post-submission). Frontend reads `answers`. */
        private List<AnswerOption>  answers;

        @Data
        @Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class AnswerOption {
            private String  id;
            private String  answerText;
            private Boolean isCorrect;
        }
    }
}
