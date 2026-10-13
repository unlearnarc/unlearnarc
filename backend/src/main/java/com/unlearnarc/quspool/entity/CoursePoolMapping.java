package com.unlearnarc.quspool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Links a QuestionPool to a Course.
 * One course can have multiple pools.
 * One pool belongs to exactly one course (scope_type = COURSE).
 */
@Entity
@Table(name = "course_pool_mapping",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_course_pool", columnNames = {"course_id", "pool_id"}),
        indexes = {
                @Index(name = "idx_cpm_course", columnList = "course_id"),
                @Index(name = "idx_cpm_pool",   columnList = "pool_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoursePoolMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "course_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String courseId;

    @Column(name = "pool_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String poolId;
}
