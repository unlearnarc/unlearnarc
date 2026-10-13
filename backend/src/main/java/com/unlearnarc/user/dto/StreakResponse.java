package com.unlearnarc.user.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * Snapshot of a user's daily-activity streak.
 *
 * {@code active} is computed relative to the caller's "today" and tells the UI
 * whether the streak is still alive (activity today or yesterday) or has been
 * broken (last activity was 2+ days ago).
 */
@Data
@Builder
public class StreakResponse {
    private Integer   currentStreak;
    private Integer   longestStreak;
    private LocalDate lastActivityDate;
    /** true if the streak is still "live" (active today or yesterday). */
    private boolean   active;
    /** true if the recorded activity happened on the current server day. */
    private boolean   activeToday;
}
