package com.unlearnarc.contest.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Registration / live standing of a single user in a {@link Contest}.
 * One row per (contest, user). Aggregated score + penalty maintained here for
 * fast leaderboard reads.
 */
@Entity
@Table(name = "contest_participant",
        uniqueConstraints = @UniqueConstraint(name = "uq_contest_user", columnNames = {"contest_id", "user_id"}),
        indexes = {
                @Index(name = "idx_cpart_contest", columnList = "contest_id"),
                @Index(name = "idx_cpart_board",   columnList = "contest_id, total_score")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContestParticipant {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "contest_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String contestId;

    @Column(name = "user_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String userId;

    /** When the participant started (used for per-user duration windows). */
    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "total_score", nullable = false)
    @Builder.Default
    private Integer totalScore = 0;

    @Column(name = "solved_count", nullable = false)
    @Builder.Default
    private Integer solvedCount = 0;

    @Column(name = "penalty", nullable = false)
    @Builder.Default
    private Integer penalty = 0;

    /** Last time the score advanced — used as the leaderboard tiebreaker. */
    @Column(name = "last_accepted_at")
    private Instant lastAcceptedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
