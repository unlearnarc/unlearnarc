package com.unlearnarc.studyplan;

import java.time.LocalDate;
import java.util.*;

/** Pure, deterministic calendar scheduler. Dates are learner-local calendar dates, never UTC offsets.
 * Revisions take precedence over new learning. Unavailable/full days roll forward; each topic's
 * revisions stay strictly ordered even when several nominal due dates fall on the same off-day. */
public final class StudyScheduler {
    private StudyScheduler() {}
    public static final List<Integer> INTERVALS = List.of(0, 1, 3, 5, 7);
    public static LocalDate reserve(LocalDate earliest, int minutes, int budget, Set<Integer> days,
                                    Map<LocalDate, Integer> usage) {
        if (days == null || days.isEmpty() || budget < 1 || minutes < 1 || minutes > budget)
            throw new IllegalArgumentException("Invalid study-day or duration configuration");
        LocalDate date = earliest;
        while (!days.contains(date.getDayOfWeek().getValue()) || usage.getOrDefault(date, 0) + minutes > budget)
            date = date.plusDays(1);
        usage.merge(date, minutes, Integer::sum);
        return date;
    }
    public static Map<Integer, LocalDate> topic(LocalDate earliest, int learnMinutes, int reviseMinutes,
                                                int budget, Set<Integer> days, Map<LocalDate, Integer> usage) {
        Map<Integer, LocalDate> result = new LinkedHashMap<>();
        LocalDate learn = reserve(earliest, learnMinutes, budget, days, usage);
        result.put(0, learn);
        LocalDate previous = learn;
        for (int interval : List.of(1, 3, 5, 7)) {
            LocalDate date = reserve(later(learn.plusDays(interval), previous.plusDays(1)), reviseMinutes, budget, days, usage);
            result.put(interval, date);
            previous = date;
        }
        return result;
    }
    public static LocalDate later(LocalDate a, LocalDate b) { return a.isAfter(b) ? a : b; }
}
