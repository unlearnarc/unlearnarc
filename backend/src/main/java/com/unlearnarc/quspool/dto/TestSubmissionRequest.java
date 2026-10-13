package com.unlearnarc.quspool.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * Submitted by the user after completing a test.
 *
 * For MCQ:             submitAnswerIds has exactly one UUID
 * For MULTIPLE_CORRECT: submitAnswerIds has one or more UUIDs
 */
@Data
public class TestSubmissionRequest {

    @NotNull(message = "poolId is required")
    private String poolId;

    @NotNull(message = "entityId is required")
    private String entityId;

    @NotEmpty(message = "At least one answer is required")
    private List<QuestionAnswer> answers;

    /** Optional — seconds the learner spent on the attempt (client-reported). */
    private Integer timeTakenSeconds;

    @Data
    public static class QuestionAnswer {
        @NotNull
        private String questionId;

        @NotEmpty(message = "At least one answerId must be selected")
        private List<String> selectedAnswerIds;
    }
}
