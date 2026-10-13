package com.unlearnarc.user.service;

import com.unlearnarc.user.dto.StreakCalendarResponse;
import com.unlearnarc.user.dto.StreakResponse;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.entity.UserActivityDay;
import com.unlearnarc.user.repository.UserActivityDayRepository;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Daily-activity streak engine.
 *
 * <p>A "streak" is the number of consecutive calendar days on which the user
 * performed any tracked activity (finished a test, solved a contest problem,
 * watched an animation, etc.). Call {@link #recordActivity(String)} from any
 * flow that should count as "showing up today" — it is idempotent per day, so
 * calling it multiple times in one day will not inflate the streak.</p>
 *
 * <p>Two things are maintained on every activity:</p>
 * <ul>
 *   <li>Rolled-up counters on {@link User} (current / longest streak, last day).</li>
 *   <li>A {@link UserActivityDay} row per active day — the source of truth the
 *       profile CALENDAR / heat-map renders from.</li>
 * </ul>
 *
 * <p>Rules, relative to the server's {@code today}:</p>
 * <ul>
 *   <li>Already active today            → no change (idempotent).</li>
 *   <li>Last active yesterday           → streak + 1 (continues).</li>
 *   <li>Last active 2+ days ago / never → streak resets to 1 (new streak).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StreakService {

    private final UserRepository            userRepository;
    private final UserActivityDayRepository activityDayRepository;
    private final Clock                     clock;   // inject for deterministic tests

    /**
     * Marks the given user as active "today" and updates their streak counters.
     * Returns the resulting streak snapshot. Safe to call on every tracked action.
     */
    @Transactional
    public StreakResponse recordActivity(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        LocalDate today = LocalDate.now(clock);
        LocalDate last  = user.getLastActivityDate();

        // Always ensure today's activity-day row exists (powers the calendar),
        // regardless of whether the counters change below.
        markActiveDay(userId, today);

        if (last == null) {
            user.setCurrentStreak(1);                            // first ever activity
        } else if (last.isEqual(today)) {
            return toResponse(user, today);                      // already counted today
        } else {
            long gap = ChronoUnit.DAYS.between(last, today);
            if (gap == 1) {
                user.setCurrentStreak(user.getCurrentStreak() + 1);  // consecutive day
            } else {
                user.setCurrentStreak(1);                            // streak broken, restart
            }
        }

        user.setLastActivityDate(today);
        if (user.getCurrentStreak() > user.getLongestStreak()) {
            user.setLongestStreak(user.getCurrentStreak());
        }

        userRepository.save(user);
        log.debug("[STREAK] user={} current={} longest={} last={}",
                userId, user.getCurrentStreak(), user.getLongestStreak(), today);

        return toResponse(user, today);
    }

    /** Read-only streak snapshot (does NOT record activity). */
    @Transactional(readOnly = true)
    public StreakResponse getStreak(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        return toResponse(user, LocalDate.now(clock));
    }

    /**
     * Calendar view: the set of active days in [from, to] plus headline streak
     * stats. {@code from}/{@code to} are clamped so {@code from <= to <= today}
     * and the window never exceeds ~400 days (guards against abuse / huge reads).
     */
    @Transactional(readOnly = true)
    public StreakCalendarResponse getCalendar(String userId, LocalDate from, LocalDate to) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        LocalDate today = LocalDate.now(clock);
        if (to == null || to.isAfter(today))   to = today;
        if (from == null)                       from = to.minusDays(365);
        if (from.isAfter(to))                   from = to;
        if (ChronoUnit.DAYS.between(from, to) > 400) from = to.minusDays(400);

        List<LocalDate> days = activityDayRepository.findDatesInRange(userId, from, to);

        LocalDate last   = user.getLastActivityDate();
        boolean   active = last != null && ChronoUnit.DAYS.between(last, today) <= 1;

        return StreakCalendarResponse.builder()
                .from(from)
                .to(to)
                .activeDays(days)
                .currentStreak(active ? user.getCurrentStreak() : 0)
                .longestStreak(user.getLongestStreak())
                .lastActivityDate(last)
                .active(active)
                .activeDayCount(days.size())
                .build();
    }

    // ── internals ──────────────────────────────────────────────────────────────

    /** Idempotent per (user, day) insert; relies on the unique constraint. */
    private void markActiveDay(String userId, LocalDate day) {
        if (activityDayRepository.existsByUserIdAndActivityDate(userId, day)) return;
        try {
            activityDayRepository.save(UserActivityDay.builder()
                    .userId(userId)
                    .activityDate(day)
                    .build());
        } catch (DataIntegrityViolationException race) {
            // Concurrent first-of-day insert lost the unique-constraint race — fine,
            // the row now exists. Swallow so the streak update still succeeds.
            log.debug("[STREAK] activity-day already present for user={} day={}", userId, day);
        }
    }

    /**
     * Builds the response, computing the "live" flags against {@code today}.
     * The persisted {@code currentStreak} is only meaningful while the streak
     * is still alive; if the last activity is 2+ days old we surface a 0 so the
     * UI shows a broken streak without us having to write to the DB on a read.
     */
    private StreakResponse toResponse(User user, LocalDate today) {
        LocalDate last = user.getLastActivityDate();

        boolean activeToday = last != null && last.isEqual(today);
        boolean active      = last != null && ChronoUnit.DAYS.between(last, today) <= 1;

        int effectiveCurrent = active ? user.getCurrentStreak() : 0;

        return StreakResponse.builder()
                .currentStreak(effectiveCurrent)
                .longestStreak(user.getLongestStreak())
                .lastActivityDate(last)
                .active(active)
                .activeToday(activeToday)
                .build();
    }
}
