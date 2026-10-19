package com.unlearnarc.dailyquiz;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;
import com.unlearnarc.quspool.entity.Question.Difficulty;

/** Pure deterministic policy; no HTTP or persistence dependencies. */
@Component
@ConfigurationProperties(prefix = "app.daily-quiz")
@Getter @Setter
public class DailyQuizRules {
    public static final String VERSION = "daily-v1";
    private int targetCount = 10;
    private int minimumUsefulSize = 3;
    private int recentWindow = 12;
    private int minimumEvidence = 3;
    private int proficientQuestions = 6;
    private int masteredQuestions = 10;
    private int masteredSessions = 3;
    private int repetitionDays = 7;
    private int revisionDays = 3;
    private int proficientReviewDays = 7;
    private int masteredReviewDays = 21;
    private double foundationAccuracy = .34;
    private double practiceAccuracy = .60;
    private double proficientAccuracy = .80;
    private double masteredAccuracy = .90;
    private double improvementShare = .60;
    private double revisionShare = .30;
    private String defaultTimeZone = "UTC";

    public enum State { NOT_ASSESSED, INSUFFICIENT_DATA, NEEDS_FOUNDATION, NEEDS_PRACTICE,
        NEEDS_REVISION, DEVELOPING, PROFICIENT, MASTERED }
    public enum Reason { REVISION_DUE, RECENT_INCORRECT_ANSWERS, LOW_TOPIC_MASTERY,
        INCONSISTENT_PERFORMANCE, NEWLY_COMPLETED_LESSON, DIAGNOSTIC_ASSESSMENT, MAINTENANCE_REVIEW }
    public record Event(String id, String session, String question, String topic, Difficulty difficulty,
                        boolean correct, Instant at) {}
    public record Evidence(String topic, State state, int distinctQuestions, int correct, int incorrect,
        double recentAccuracy, double historicalAccuracy, double mastery, String confidence,
        Instant lastPractice, Instant lastSuccess, LocalDate nextReview, boolean improving) {}
    public record Candidate(String id, String topic, Difficulty difficulty, Instant exposure) {}
    public record Pick(Candidate question, Reason reason, boolean repeated, boolean relaxedDifficulty) {}

    public Evidence evidence(String topic, List<Event> raw, Instant learned, LocalDate today, ZoneId zone) {
        // One latest outcome per distinct question prevents memorized retries dominating mastery.
        Map<String, Event> distinct = new HashMap<>();
        raw.stream().filter(e -> topic.equals(e.topic()) && e.id() != null && e.question() != null && e.at() != null)
            .sorted(Comparator.comparing(Event::at).thenComparing(Event::id))
            .forEach(e -> distinct.put(e.question(), e));
        List<Event> all = distinct.values().stream().sorted(Comparator.comparing(Event::at).reversed().thenComparing(Event::id)).toList();
        int n = all.size(), correct = (int) all.stream().filter(Event::correct).count();
        List<Event> recent = all.stream().limit(Math.max(1, recentWindow)).toList();
        // Preserve older performance, but give each question equal total weight regardless of retries.
        Map<String, Event> uniqueEvents = new HashMap<>();
        raw.stream().filter(e -> topic.equals(e.topic()) && e.id()!=null && e.question()!=null && e.at()!=null)
            .forEach(e -> uniqueEvents.putIfAbsent(e.id(),e));
        Map<String, int[]> histories = new HashMap<>();
        uniqueEvents.values().forEach(e -> {int[] h=histories.computeIfAbsent(e.question(),k->new int[2]);h[0]++;if(e.correct())h[1]++;});
        double historical = histories.values().stream().mapToDouble(h -> h[1]/(double)h[0]).average().orElse(0);
        double accuracy = recent.isEmpty() ? 0 : recent.stream().filter(Event::correct).count() / (double)recent.size();
        long sessions = all.stream().map(Event::session).distinct().count();
        long challenging = all.stream().filter(e -> e.correct() && e.difficulty() != null && e.difficulty() != Difficulty.EASY).count();
        State state = n == 0 ? State.NOT_ASSESSED : n < minimumEvidence ? State.INSUFFICIENT_DATA
            : accuracy < foundationAccuracy ? State.NEEDS_FOUNDATION : accuracy < practiceAccuracy ? State.NEEDS_PRACTICE
            : n >= masteredQuestions && sessions >= masteredSessions && accuracy >= masteredAccuracy && historical >= proficientAccuracy && challenging >= minimumEvidence ? State.MASTERED
            : n >= proficientQuestions && sessions >= 2 && accuracy >= proficientAccuracy && challenging >= 2 ? State.PROFICIENT : State.DEVELOPING;
        Instant last = all.isEmpty() ? null : all.get(0).at();
        Instant success = all.stream().filter(Event::correct).map(Event::at).max(Instant::compareTo).orElse(null);
        int interval = state == State.MASTERED ? masteredReviewDays : state == State.PROFICIENT ? proficientReviewDays : revisionDays;
        Instant anchor = last == null ? learned : learned != null && learned.isAfter(last) ? learned : last;
        LocalDate due = anchor == null ? null : anchor.atZone(zone).toLocalDate().plusDays(interval);
        if (due != null && !due.isAfter(today) && state != State.NEEDS_FOUNDATION && state != State.NEEDS_PRACTICE && state != State.INSUFFICIENT_DATA)
            state = State.NEEDS_REVISION;
        boolean improving = all.stream().anyMatch(e -> e.correct() && raw.stream().anyMatch(old ->
            e.question().equals(old.question()) && !old.correct() && old.at() != null && old.at().isBefore(e.at())));
        return new Evidence(topic, state, n, correct, n-correct, accuracy, historical,
            n == 0 ? 0 : .7 * accuracy + .3 * historical,
            n < minimumEvidence ? "LOW" : n < proficientQuestions ? "MODERATE" : "HIGH", last, success, due, improving);
    }
    public Reason reason(Evidence e, boolean learned) {
        return switch (e.state()) {
            case NEEDS_REVISION -> Reason.REVISION_DUE;
            case NEEDS_FOUNDATION -> Reason.LOW_TOPIC_MASTERY;
            case NEEDS_PRACTICE -> Reason.RECENT_INCORRECT_ANSWERS;
            case DEVELOPING -> Reason.INCONSISTENT_PERFORMANCE;
            case PROFICIENT, MASTERED -> Reason.MAINTENANCE_REVIEW;
            default -> learned ? Reason.NEWLY_COMPLETED_LESSON : Reason.DIAGNOSTIC_ASSESSMENT;
        };
    }
    private int category(Reason r) {
        return switch(r) { case REVISION_DUE -> 1; case MAINTENANCE_REVIEW -> 2; default -> 0; };
    }
    private Difficulty preferred(Evidence e, int slot) {
        if (e == null || e.distinctQuestions() < minimumEvidence || e.state() == State.NEEDS_FOUNDATION)
            return slot % 5 == 4 ? Difficulty.MEDIUM : Difficulty.EASY;
        if (e.mastery() >= proficientAccuracy && e.distinctQuestions() >= proficientQuestions)
            return slot % 3 == 0 ? Difficulty.MEDIUM : Difficulty.HARD;
        return slot % 3 == 0 ? Difficulty.EASY : Difficulty.MEDIUM;
    }
    public List<Pick> select(List<Candidate> pool, Map<String,Evidence> evidence, Set<String> learned, LocalDate date, ZoneId zone, int budget) {
        List<Pick> result = new ArrayList<>(); Set<String> used = new HashSet<>(); Map<String,Integer> topicUse = new HashMap<>();
        int target = Math.max(1, Math.min(30, Math.min(targetCount, budget)));
        for (int slot = 0; slot < target; slot++) {
            final int position = slot;
            int wantedCategory = slot < Math.round(target * improvementShare) ? 0
                : slot < Math.round(target * (improvementShare + revisionShare)) ? 1 : 2;
            Comparator<Candidate> order = Comparator
                // Reuse is last resort across all relevant topics, not just inside a quota.
                .comparingInt((Candidate q) -> q.exposure() != null && !q.exposure().atZone(zone).toLocalDate().isBefore(date.minusDays(repetitionDays)) ? 1 : 0)
                .thenComparingInt(q -> category(reason(evidence.get(q.topic()), learned.contains(q.topic()))) == wantedCategory ? 0 : 1)
                .thenComparingInt(q -> priority(reason(evidence.get(q.topic()), learned.contains(q.topic()))))
                .thenComparingInt(q -> topicUse.getOrDefault(q.topic(), 0))
                .thenComparingInt(q -> Math.abs(q.difficulty().ordinal() - preferred(evidence.get(q.topic()), position).ordinal()))
                .thenComparingInt(q -> q.exposure() == null ? 0 : 1)
                .thenComparing(Candidate::id);
            Candidate q = pool.stream().filter(c -> c.difficulty() != null && !used.contains(c.id()))
                .filter(c -> c.topic() != null && evidence.containsKey(c.topic()))
                // Do not give hard-only diagnostic/foundation questions just to fill the budget.
                .filter(c -> c.difficulty() != Difficulty.HARD || evidence.get(c.topic()).distinctQuestions() >= minimumEvidence
                    && evidence.get(c.topic()).mastery() >= practiceAccuracy
                    && evidence.get(c.topic()).state() != State.NEEDS_FOUNDATION)
                .min(order).orElse(null);
            if (q == null) break;
            used.add(q.id()); topicUse.merge(q.topic(),1,Integer::sum);
            result.add(new Pick(q, reason(evidence.get(q.topic()), learned.contains(q.topic())), q.exposure()!=null,
                q.difficulty()!=preferred(evidence.get(q.topic()), slot)));
        }
        return List.copyOf(result);
    }
    private int priority(Reason r) {
        return switch(r) { case REVISION_DUE -> 0; case LOW_TOPIC_MASTERY, RECENT_INCORRECT_ANSWERS -> 1;
            case NEWLY_COMPLETED_LESSON -> 2; case INCONSISTENT_PERFORMANCE -> 3;
            case DIAGNOSTIC_ASSESSMENT -> 4; case MAINTENANCE_REVIEW -> 5; };
    }
    public static String explanation(Reason reason) {
        return switch(reason) { case REVISION_DUE -> "It's time to revisit this concept.";
            case LOW_TOPIC_MASTERY -> "Build the foundations with another distinct question.";
            case RECENT_INCORRECT_ANSWERS -> "Recent answers suggest this concept needs more practice.";
            case INCONSISTENT_PERFORMANCE -> "Practice this concept to make your understanding more reliable.";
            case NEWLY_COMPLETED_LESSON -> "Reinforce material you have studied.";
            case DIAGNOSTIC_ASSESSMENT -> "We are still assessing your understanding of this concept.";
            case MAINTENANCE_REVIEW -> "Keep a stronger concept fresh."; };
    }
}
