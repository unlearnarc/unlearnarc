package com.unlearnarc.contest.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * An attempt by a user on a single {@link ContestProblem}.
 *
 * Because code runs on the CLIENT, the client posts:
 *   - the source code (stored for audit / plagiarism checks),
 *   - the per-test outputs it captured locally.
 * The server RE-VALIDATES those outputs against the stored hidden expected
 * outputs and writes the authoritative verdict + score here. The client's
 * self-claimed pass/fail is ignored for scoring.
 */
@Entity
@Table(name = "contest_submission", indexes = {
        @Index(name = "idx_csub_participant", columnList = "contest_id, user_id"),
        @Index(name = "idx_csub_problem",     columnList = "problem_id"),
        @Index(name = "idx_csub_verdict",     columnList = "verdict")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContestSubmission {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "contest_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String contestId;

    @Column(name = "problem_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String problemId;

    @Column(name = "user_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String userId;

    @Column(name = "language", nullable = false, length = 30)
    private String language;

    /** Full source the client executed — kept for audit, not re-run. */
    @Column(name = "source_code", columnDefinition = "LONGTEXT")
    private String sourceCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "verdict", nullable = false, length = 25)
    private Verdict verdict;

    @Column(name = "passed_tests", nullable = false)
    @Builder.Default
    private Integer passedTests = 0;

    @Column(name = "total_tests", nullable = false)
    @Builder.Default
    private Integer totalTests = 0;

    /** Points earned by THIS submission (server-computed). */
    @Column(name = "score", nullable = false)
    @Builder.Default
    private Integer score = 0;

    /** Max runtime across tests reported by the client runner (ms). */
    @Column(name = "runtime_ms")
    private Integer runtimeMs;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private Instant submittedAt;

    /**
     * ACCEPTED           – all hidden tests matched.
     * PARTIAL            – some hidden tests matched (partial scoring).
     * WRONG_ANSWER       – at least one mismatch and not partial-eligible.
     * TIME_LIMIT         – client reported a timeout on a test.
     * RUNTIME_ERROR      – client reported an exception on a test.
     * COMPILE_ERROR      – client reported code did not compile.
     * MALFORMED          – payload shape invalid / test id mismatch.
     */
    public enum Verdict {
        ACCEPTED, PARTIAL, WRONG_ANSWER, TIME_LIMIT, RUNTIME_ERROR, COMPILE_ERROR, MALFORMED
    }
}
