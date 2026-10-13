package com.unlearnarc.skill.dto;

import com.unlearnarc.skill.entity.Skill.SkillLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SkillRequest {

    @NotBlank(message = "Skill name must not be blank")
    private String name;

    @NotNull(message = "Skill level must not be null")
    private SkillLevel level;
}
