package com.unlearnarc.quspool.entity;

import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted outcome of a single graded test attempt.
 *
 * This is the durable record the recommendation engine will read from later:
 * the per-difficulty earned/total points let us detect WHERE a learner is weak
 * (e.g. consistently low HARD scores on a given entity), and {@code answerSnapshot}
 * stores the full per-question breakdown as JSON so we can mine weak topics/tags
 * without needing the (potentially mutated) live questions.
 *
 * Mirrors db.md `test_result`, extended with the fields required to drive
 * history + future weak-area suggestions.
 */
@Entity
@Table(name = "test_result", indexes = {
        @Index(name = "idx_test_result_pool",   columnList = "pool_id"),
        @Index(name = "idx_test_result_entity", columnList = "entity_type, entity_id"),
        @Index(name = "idx_test_result_created", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestResult {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "pool_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String poolId;

    @Column(name = "pool_name", length = 255)
    private String poolName;

    /** DOMAIN | COURSE | TOPIC — what the test was scoped to */
    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 20)
    private ScopeType entityType;

    @Column(name = "entity_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String entityId;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(name = "correct_count", nullable = false)
    private Integer correctCount;

    @Column(name = "wrong_count", nullable = false)
    private Integer wrongCount;

    @Column(name = "skipped_count", nullable = false)
    private Integer skippedCount;

    @Column(name = "total_points", nullable = false)
    private Integer totalPoints;

    @Column(name = "earned_points", nullable = false)
    private Integer earnedPoints;

    @Column(name = "score_percentage", nullable = false)
    private Double scorePercentage;

    @Column(name = "pass_percentage", nullable = false)
    private Integer passPercentage;

    @Column(name = "passed", nullable = false)
    private Boolean passed;

    @Column(name = "is_improvement_needed", nullable = false)
    private Boolean improvementNeeded;

    // ── Per-difficulty breakdown (powers weak-area detection) ────────────────────

    @Column(name = "easy_total", nullable = false)    @Builder.Default private Integer easyTotal = 0;
    @Column(name = "easy_correct", nullable = false)  @Builder.Default private Integer easyCorrect = 0;
    @Column(name = "easy_points", nullable = false)   @Builder.Default private Integer easyPoints = 0;
    @Column(name = "easy_earned", nullable = false)   @Builder.Default private Integer easyEarned = 0;

    @Column(name = "medium_total", nullable = false)   @Builder.Default private Integer mediumTotal = 0;
    @Column(name = "medium_correct", nullable = false) @Builder.Default private Integer mediumCorrect = 0;
    @Column(name = "medium_points", nullable = false)  @Builder.Default private Integer mediumPoints = 0;
    @Column(name = "medium_earned", nullable = false)  @Builder.Default private Integer mediumEarned = 0;

    @Column(name = "hard_total", nullable = false)    @Builder.Default private Integer hardTotal = 0;
    @Column(name = "hard_correct", nullable = false)  @Builder.Default private Integer hardCorrect = 0;
    @Column(name = "hard_points", nullable = false)   @Builder.Default private Integer hardPoints = 0;
    @Column(name = "hard_earned", nullable = false)   @Builder.Default private Integer hardEarned = 0;

    /**
     * Full per-question breakdown serialized as JSON. Stored so the detail view
     * and future analytics can reconstruct the attempt exactly as it was graded,
     * even if the underlying questions are later edited or deactivated.
     */
    @Column(name = "answer_snapshot", columnDefinition = "LONGTEXT")
    private String answerSnapshot;

    /** Seconds the learner spent on the attempt (optional, client-reported). */
    @Column(name = "time_taken_seconds")
    private Integer timeTakenSeconds;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
