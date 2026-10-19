package com.unlearnarc.studyplan;

import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class StudySchedulerTest {
    private final LocalDate start = LocalDate.of(2026, 6, 1);
    @Test void exactSpacedIntervalsOnAvailableDays() {
        var result = StudyScheduler.topic(start, 30, 10, 60, Set.of(1,2,3,4,5,6,7), new HashMap<>());
        for (int interval : StudyScheduler.INTERVALS) assertEquals(start.plusDays(interval), result.get(interval));
    }
    @Test void rollsForwardAndNeverExceedsBudgetOrDuplicates() {
        Map<LocalDate,Integer> usage = new HashMap<>();
        List<LocalDate> dates = new ArrayList<>();
        for (int i=0; i<12; i++) dates.addAll(StudyScheduler.topic(start,15,10,15,Set.of(1,3,5),usage).values());
        assertTrue(usage.values().stream().allMatch(n -> n<=15));
        assertTrue(dates.stream().allMatch(d -> Set.of(1,3,5).contains(d.getDayOfWeek().getValue())));
        assertEquals(dates.size(), dates.stream().distinct().count());
    }
    @Test void overlappingDatesAreAllowedWhenCapacityExists() {
        Map<LocalDate,Integer> usage = new HashMap<>();
        var first = StudyScheduler.topic(start,15,5,90,Set.of(1,2,3,4,5,6,7),usage);
        var second = StudyScheduler.topic(start,15,5,90,Set.of(1,2,3,4,5,6,7),usage);
        assertEquals(first,second);
        assertEquals(30,usage.get(start));
    }
    @Test void sparseAvailabilityKeepsRevisionsStrictlyOrdered() {
        var dates = StudyScheduler.topic(start,15,5,90,Set.of(1),new HashMap<>());
        LocalDate last = start.minusDays(1);
        for (LocalDate date: dates.values()) { assertTrue(date.isAfter(last)); last=date; }
    }
    @Test void rejectsInvalidCapacityRatherThanLooping() {
        assertThrows(IllegalArgumentException.class, () -> StudyScheduler.reserve(start,30,15,Set.of(1),new HashMap<>()));
        assertThrows(IllegalArgumentException.class, () -> StudyScheduler.reserve(start,10,15,Set.of(),new HashMap<>()));
    }
}
