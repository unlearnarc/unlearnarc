package com.unlearnarc.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * One row per (user, calendar-day) on which the user was active. This is the
 * source of truth that powers the streak CALENDAR (the heat-map of marked days),
 * complementing the rolled-up counters on {@link User} (current/longest streak).
 *
 * <p>Writes go through {@code StreakService.recordActivity}; the unique index on
 * (user_id, activity_date) makes the daily insert idempotent — a user being
 * active many times in one day still produces a single marked day.</p>
 */
@Entity
@Table(name = "user_activity_day",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_user_activity_day", columnNames = {"user_id", "activity_date"}),
        indexes = {
                @Index(name = "idx_uad_user",      columnList = "user_id"),
                @Index(name = "idx_uad_user_date", columnList = "user_id, activity_date")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserActivityDay {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String userId;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;
}
