package com.unlearnarc.contest.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A coding contest (LeetCode / NeetCode style) created by an ADMIN.
 *
 * A contest is a time-boxed collection of coding {@link ContestProblem}s that
 * students participate in. Code is executed ON THE CLIENT machine — the server
 * NEVER runs user code. The server only:
 *   - stores problems + hidden test cases (expected outputs),
 *   - serves public (sample) test cases to the client,
 *   - re-validates the stdout the client reports against the stored expected
 *     outputs, computing the authoritative score.
 *
 * Lifecycle:  DRAFT -> PUBLISHED -> (startTime..endTime active) -> ARCHIVED
 */
@Entity
@Table(name = "contest", indexes = {
        @Index(name = "idx_contest_status", columnList = "status"),
        @Index(name = "idx_contest_window", columnList = "start_time, end_time")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Contest {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "slug", nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "description", columnDefinition = "LONGTEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ContestStatus status = ContestStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 20)
    @Builder.Default
    private Visibility visibility = Visibility.PUBLIC;

    /** When the contest opens for participation (UTC). */
    @Column(name = "start_time")
    private Instant startTime;

    /** When the contest closes (UTC). After this, no more submissions scored. */
    @Column(name = "end_time")
    private Instant endTime;

    /** Overall time budget per participant in minutes (0 = until endTime). */
    @Column(name = "duration_minutes", nullable = false)
    @Builder.Default
    private Integer durationMinutes = 0;

    /** Programming languages the client runner must support, CSV e.g. "python,java,cpp,javascript". */
    @Column(name = "allowed_languages", length = 255)
    @Builder.Default
    private String allowedLanguages = "python,java,cpp,javascript";

    /** Penalty points per wrong submission (ICPC-style tiebreak), 0 = none. */
    @Column(name = "wrong_submission_penalty", nullable = false)
    @Builder.Default
    private Integer wrongSubmissionPenalty = 0;

    @Column(name = "created_by", length = 150)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum ContestStatus { DRAFT, PUBLISHED, ARCHIVED }

    public enum Visibility { PUBLIC, PRIVATE }
}
