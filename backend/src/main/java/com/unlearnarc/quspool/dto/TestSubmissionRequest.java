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

    /**
     * What the learner actually tested against (DOMAIN | COURSE | TOPIC). Carried
     * from the generation request so the stored attempt records the TRUE scope,
     * not the resolved pool's own scope — which may be a child pool under union
     * resolution. Optional for backward-compat; grade() falls back to the pool's
     * scope when absent.
     */
    private com.unlearnarc.quspool.entity.QuestionPool.ScopeType scopeType;

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
