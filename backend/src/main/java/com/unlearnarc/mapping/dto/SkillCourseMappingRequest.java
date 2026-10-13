package com.unlearnarc.mapping.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class SkillCourseMappingRequest {

    @NotNull(message = "Skill ID must not be null")
    private String skillId;

    @NotNull(message = "Course ID must not be null")
    private String courseId;
}
