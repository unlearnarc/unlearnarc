package com.unlearnarc.user.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Calendar view of a user's activity for a date window, used to render the
 * profile streak heat-map / marked-days calendar.
 *
 * {@code activeDays} is the (sorted) set of calendar days the user was active in
 * [from, to]. The current/longest streak + totals give the UI its headline stats
 * without a second round-trip.
 */
@Data
@Builder
public class StreakCalendarResponse {
    private LocalDate       from;
    private LocalDate       to;
    private List<LocalDate> activeDays;
    private Integer         currentStreak;
    private Integer         longestStreak;
    private LocalDate       lastActivityDate;
    /** true if the streak is still "live" (active today or yesterday). */
    private boolean         active;
    /** number of active days inside the returned window. */
    private int             activeDayCount;
}
