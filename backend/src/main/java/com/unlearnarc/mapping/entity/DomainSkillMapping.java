package com.unlearnarc.mapping.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "domain_skill_mapping",
        uniqueConstraints = @UniqueConstraint(columnNames = {"domain_id", "skill_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DomainSkillMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "domain_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String domainId;

    @Column(name = "skill_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String skillId;
}
