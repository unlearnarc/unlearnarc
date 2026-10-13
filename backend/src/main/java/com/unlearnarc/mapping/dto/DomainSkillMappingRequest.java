package com.unlearnarc.mapping.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class DomainSkillMappingRequest {

    @NotNull(message = "Domain ID must not be null")
    private String domainId;

    @NotNull(message = "Skill ID must not be null")
    private String skillId;
}
