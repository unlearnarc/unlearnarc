package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Returned when a test session is generated.
 * Contains metadata + shuffled question set (no correct-answer data).
 */
@Data
@Builder
public class TestSessionResponse {
    private String       poolId;
    private String     poolName;
    private ScopeType  scopeType;
    private String       entityId;
    private Integer    totalQuestions;
    private Integer    easyCount;
    private Integer    mediumCount;
    private Integer    hardCount;
    private Integer    timeLimitMinutes;
    private Integer    passPercentage;
    private Integer    totalPoints;
    private List<TestQuestionResponse> questions;
}
