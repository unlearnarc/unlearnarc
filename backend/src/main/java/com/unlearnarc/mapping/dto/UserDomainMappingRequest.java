package com.unlearnarc.mapping.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class UserDomainMappingRequest {

    @NotNull(message = "User ID must not be null")
    private String userId;

    @NotNull(message = "Domain ID must not be null")
    private String domainId;
}
