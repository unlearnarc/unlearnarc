package com.unlearnarc.role.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleDomainMappingRequest {

    @NotBlank(message = "Role ID must not be blank")
    private String roleId;

    @NotBlank(message = "Domain ID must not be blank")
    private String domainId;
}
