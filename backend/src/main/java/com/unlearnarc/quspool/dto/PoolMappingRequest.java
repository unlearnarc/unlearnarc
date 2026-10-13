package com.unlearnarc.quspool.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;


/**
 * Used for Domain↔Pool, Course↔Pool, and Topic↔Pool mapping endpoints.
 */
@Data
public class PoolMappingRequest {

    @NotNull(message = "poolId is required")
    private String poolId;

    /** domainId OR courseId OR topicId — whichever scope applies */
    private String domainId;
    private String courseId;
    private String topicId;
}
