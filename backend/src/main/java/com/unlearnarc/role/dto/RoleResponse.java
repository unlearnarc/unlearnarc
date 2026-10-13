package com.unlearnarc.role.dto;

import com.unlearnarc.skill.entity.Skill.SkillLevel;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RoleResponse {
    private String id;
    private String name;
    private String description;

    /** Skills this role requires — resolved both directly (role_skill_mapping)
     *  and via the role's domains (domain_skill_mapping). Lets the learner
     *  browse and filter roles by skill before opening the full roadmap. */
    private List<SkillTag> skills;

    @Data
    @Builder
    public static class SkillTag {
        private String id;
        private String name;
        private SkillLevel level;
    }
}
