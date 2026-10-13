package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;


/**
 * Request body for generating a test session from a pool.
 *
 * The caller specifies:
 *   scopeType  → DOMAIN | COURSE | TOPIC
 *   entityId   → the UUID of the domain/course/topic
 *   poolId     → (optional) if the entity has multiple pools, pick a specific one;
 *                if omitted, the first active pool for that entity is used
 *
 * The engine then randomly draws:
 *   easyCount questions  from EASY bucket
 *   mediumCount questions from MEDIUM bucket
 *   hardCount questions  from HARD bucket
 * returning a shuffled list — answers are included WITHOUT revealing isCorrect.
 */
@Data
public class TestGenerationRequest {

    @NotNull(message = "scopeType is required")
    private ScopeType scopeType;

    @NotNull(message = "entityId (domainId / courseId / topicId) is required")
    private String entityId;

    /** Optional – if the entity has multiple pools, choose a specific one */
    private String poolId;
}
