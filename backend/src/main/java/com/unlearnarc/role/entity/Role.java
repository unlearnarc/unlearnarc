package com.unlearnarc.role.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * A career/job role (e.g. "Backend Developer", "Data Scientist").
 * A role aggregates the Domains and Skills a learner needs, which in turn
 * resolve to Courses to form a learning roadmap.
 */
@Entity
@Table(name = "role")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Role {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "name", nullable = false, columnDefinition = "TEXT")
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
