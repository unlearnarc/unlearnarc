package com.unlearnarc.skill.dto;

import com.unlearnarc.skill.entity.Skill.SkillLevel;
import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class SkillResponse {
    private String id;
    private String name;
    private SkillLevel level;
}
