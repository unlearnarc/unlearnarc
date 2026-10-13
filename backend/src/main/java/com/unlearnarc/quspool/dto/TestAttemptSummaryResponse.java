package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Lightweight row for the "test history" list. Excludes the heavy per-question
 * snapshot — the detail endpoint returns that on demand.
 */
@Data
@Builder
public class TestAttemptSummaryResponse {

    private String    attemptId;
    private String    resultId;

    private String    poolId;
    private String    poolName;
    private ScopeType entityType;
    private String    entityId;

    private Integer   totalQuestions;
    private Integer   correctCount;
    private Integer   wrongCount;
    private Integer   skippedCount;

    private Integer   earnedPoints;
    private Integer   totalPoints;
    private Double    scorePercentage;
    private Integer   passPercentage;
    private Boolean   passed;
    private Boolean   improvementNeeded;

    private Integer   timeTakenSeconds;
    private Instant   attemptedAt;
}
