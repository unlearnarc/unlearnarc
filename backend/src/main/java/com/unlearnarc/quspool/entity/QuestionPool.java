package com.unlearnarc.quspool.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A Question Pool scoped to a Domain, Course, OR Topic (mutually exclusive scope).
 *
 * Difficulty distribution:
 *   totalQuestions = easyCount + mediumCount + hardCount
 *   e.g. 9 total = 3 easy + 3 medium + 3 hard
 *
 * Type controls what kind of questions live in this pool.
 * A pool is linked to exactly ONE scope via the mapping tables:
 *   domain_pool_mapping | course_pool_mapping | topic_pool_mapping
 */
@Entity
@Table(name = "question_pool", indexes = {
        @Index(name = "idx_qpool_scope", columnList = "scope_type"),
        @Index(name = "idx_qpool_active", columnList = "is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionPool {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Which level of the content hierarchy this pool belongs to */
    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 20)
    private ScopeType scopeType;   // DOMAIN | COURSE | TOPIC

    /** Total questions to pull per test session */
    @Column(name = "total_questions", nullable = false)
    @Builder.Default
    private Integer totalQuestions = 9;

    /** How many EASY questions to include */
    @Column(name = "easy_count", nullable = false)
    @Builder.Default
    private Integer easyCount = 3;

    /** How many MEDIUM questions to include */
    @Column(name = "medium_count", nullable = false)
    @Builder.Default
    private Integer mediumCount = 3;

    /** How many HARD questions to include */
    @Column(name = "hard_count", nullable = false)
    @Builder.Default
    private Integer hardCount = 3;

    /** Pass percentage threshold (default 60%) */
    @Column(name = "pass_percentage", nullable = false)
    @Builder.Default
    private Integer passPercentage = 60;

    /** Time limit in minutes (0 = unlimited) */
    @Column(name = "time_limit_minutes", nullable = false)
    @Builder.Default
    private Integer timeLimitMinutes = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // ── Enums ──────────────────────────────────────────────────────────────────

    public enum ScopeType {
        DOMAIN, COURSE, TOPIC
    }
}
