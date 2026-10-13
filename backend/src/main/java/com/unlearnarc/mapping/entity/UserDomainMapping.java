package com.unlearnarc.mapping.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_domain_mapping",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "domain_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDomainMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String userId;

    @Column(name = "domain_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String domainId;
}
