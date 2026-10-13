package com.unlearnarc.contest.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A single coding problem inside a {@link Contest} (LeetCode-style).
 *
 * The problem statement, constraints, starter code and the function signature
 * are served to the client. Test cases live in {@link ContestTestCase};
 * only the PUBLIC (sample) ones are shipped to the client, the HIDDEN ones are
 * kept server-side and used for authoritative re-validation.
 */
@Entity
@Table(name = "contest_problem", indexes = {
        @Index(name = "idx_cproblem_contest", columnList = "contest_id"),
        @Index(name = "idx_cproblem_order",   columnList = "contest_id, display_order")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContestProblem {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "contest_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String contestId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /** Markdown problem statement. */
    @Column(name = "statement", nullable = false, columnDefinition = "LONGTEXT")
    private String statement;

    /** Input / output format + constraints, Markdown. */
    @Column(name = "constraints", columnDefinition = "LONGTEXT")
    private String constraints;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false, length = 10)
    private Difficulty difficulty;

    /** Max points awarded for solving ALL hidden test cases. */
    @Column(name = "max_points", nullable = false)
    @Builder.Default
    private Integer maxPoints = 100;

    /**
     * Starter code keyed by language, stored as JSON:
     *   {"python":"def solve(...):","java":"class Solution{...}"}
     */
    @Column(name = "starter_code_json", columnDefinition = "LONGTEXT")
    private String starterCodeJson;

    /**
     * How a test case is matched. For a function-signature harness the client
     * calls the user function and compares the RETURN value; for stdin/stdout
     * it compares captured stdout.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "harness_type", nullable = false, length = 20)
    @Builder.Default
    private HarnessType harnessType = HarnessType.STDIN_STDOUT;

    /** Per-test wall-clock limit the CLIENT runner should enforce (ms). */
    @Column(name = "time_limit_ms", nullable = false)
    @Builder.Default
    private Integer timeLimitMs = 2000;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum Difficulty { EASY, MEDIUM, HARD }

    public enum HarnessType { STDIN_STDOUT, FUNCTION_RETURN }
}
