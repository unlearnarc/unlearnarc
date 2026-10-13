package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class QuestionPoolResponse {
    private String      id;
    private String    name;
    private String    description;
    private ScopeType scopeType;
    private Integer   totalQuestions;
    private Integer   easyCount;
    private Integer   mediumCount;
    private Integer   hardCount;
    private Integer   passPercentage;
    private Integer   timeLimitMinutes;
    private Boolean   isActive;
    private Instant   createdAt;

    // Live stats injected by service
    private Long activeQuestionCount;
    private Long easyAvailable;
    private Long mediumAvailable;
    private Long hardAvailable;
}
