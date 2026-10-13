package com.unlearnarc.role.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "role_domain_mapping",
        uniqueConstraints = @UniqueConstraint(columnNames = {"role_id", "domain_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoleDomainMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "role_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String roleId;

    @Column(name = "domain_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String domainId;
}
