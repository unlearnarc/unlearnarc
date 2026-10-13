package com.unlearnarc.mapping.dto;

import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class SkillCourseMappingResponse {
    private String id;
    private String skillId;
    private String courseId;
}
