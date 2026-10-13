package com.unlearnarc.role.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Direct Role → Skill mapping, for skills a role needs that are not
 * necessarily reached via a domain.
 */
@Entity
@Table(name = "role_skill_mapping",
        uniqueConstraints = @UniqueConstraint(columnNames = {"role_id", "skill_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoleSkillMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "role_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String roleId;

    @Column(name = "skill_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String skillId;
}
