package com.unlearnarc.quspool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Links a QuestionPool to a Domain.
 * One domain can have multiple pools (e.g. one EASY pool, one HARD pool).
 * One pool belongs to exactly one domain (scope_type = DOMAIN).
 */
@Entity
@Table(name = "domain_pool_mapping",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_domain_pool", columnNames = {"domain_id", "pool_id"}),
        indexes = {
                @Index(name = "idx_dpm_domain", columnList = "domain_id"),
                @Index(name = "idx_dpm_pool",   columnList = "pool_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DomainPoolMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "domain_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String domainId;

    @Column(name = "pool_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String poolId;
}
