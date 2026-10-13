package com.unlearnarc.role.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleSkillMappingRequest {

    @NotBlank(message = "Role ID must not be blank")
    private String roleId;

    @NotBlank(message = "Skill ID must not be blank")
    private String skillId;
}
