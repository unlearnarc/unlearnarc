package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class QuestionPoolRequest {

    @NotBlank(message = "Pool name is required")
    private String name;

    private String description;

    @NotNull(message = "scopeType is required (DOMAIN, COURSE or TOPIC)")
    private ScopeType scopeType;

    @Min(value = 1, message = "totalQuestions must be at least 1")
    @Max(value = 100, message = "totalQuestions cannot exceed 100")
    private Integer totalQuestions = 9;

    @Min(value = 0) private Integer easyCount   = 3;
    @Min(value = 0) private Integer mediumCount  = 3;
    @Min(value = 0) private Integer hardCount    = 3;

    @Min(value = 0, message = "passPercentage must be 0-100")
    @Max(value = 100, message = "passPercentage must be 0-100")
    private Integer passPercentage = 60;

    /** Time limit in minutes; 0 means no limit */
    @Min(value = 0) private Integer timeLimitMinutes = 0;
}
