package com.unlearnarc.studyplan;

import com.unlearnarc.studyplan.StudyPlanModels.*;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.mapping.repository.*;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.topic.repository.TopicRepository;
import com.unlearnarc.note.entity.Note;
import com.unlearnarc.note.repository.NoteRepository;
import com.unlearnarc.studymaterial.repository.StudyMaterialRepository;
import com.unlearnarc.quspool.repository.TopicPoolMappingRepository;
import com.unlearnarc.enrollment.service.LearningProgressService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class StudyPlanService {
    private final UserRepository users;
    private final StudyPlanRepository plans;
    private final StudyTaskRepository tasks;
    private final CourseRepository courses;
    private final DomainRepository domains;
    private final DomainSkillMappingRepository domainSkills;
    private final SkillCourseMappingRepository skillCourses;
    private final TopicRepository topics;
    private final NoteRepository notes;
    private final StudyMaterialRepository materials;
    private final TopicPoolMappingRepository pools;
    private final LearningProgressService progress;
    private final Clock clock;

    private User owner(String email) {
        User u = users.findByEmail(email).filter(x -> Boolean.TRUE.equals(x.getIsActive()))
            .orElseThrow(() -> new EntityNotFoundException("Student account unavailable"));
        // Serialize all plan mutations, including simultaneous first-time generation on two devices.
        return users.lockForContestScoring(u.getId()).orElseThrow();
    }
    @Transactional(readOnly = true)
    public Catalog catalog() {
        Map<String, Set<String>> skillDomains = new HashMap<>();
        domainSkills.findAll().forEach(m -> skillDomains.computeIfAbsent(m.getSkillId(), k -> new HashSet<>()).add(m.getDomainId()));
        Map<String, Set<String>> courseDomains = new HashMap<>();
        skillCourses.findAll().forEach(m -> courseDomains.computeIfAbsent(m.getCourseId(), k -> new HashSet<>())
            .addAll(skillDomains.getOrDefault(m.getSkillId(), Set.of())));
        Map<String, List<Topic>> grouped = topics.findAll().stream().collect(Collectors.groupingBy(Topic::getCourseId));
        List<CourseOption> options = courses.findAll().stream().sorted(Comparator.comparing(c -> c.getName() + c.getId()))
            .map(c -> {
                List<Topic> ts = grouped.getOrDefault(c.getId(), List.of()).stream().sorted(Comparator.comparing(Topic::getTopicOrder)).toList();
                String description = ts.isEmpty() ? "No topics available yet" : ts.stream().limit(4).map(Topic::getName).collect(Collectors.joining(" · "));
                return new CourseOption(c.getId(), c.getName(), description, c.getLevel().name(), courseDomains.getOrDefault(c.getId(), Set.of()), ts.size());
            }).toList();
        Set<String> supported = options.stream().flatMap(c -> c.domainIds().stream()).collect(Collectors.toSet());
        return new Catalog(domains.findAll().stream().filter(d -> supported.contains(d.getId()))
            .sorted(Comparator.comparing(d -> d.getName())).map(d -> new DomainOption(d.getId(), d.getName())).toList(), options);
    }
    private Preferences prefs(StudyPlan p) {
        return new Preferences(Set.copyOf(p.getDomainIds()), p.getGoal(), p.getSkillLevel(), p.getDailyMinutes(),
            Set.copyOf(p.getStudyDays()), p.getCourseMode(), Set.copyOf(p.getCourseIds()), p.getTimeZone());
    }
    public Preferences preferences(String email) {
        return plans.findByUserId(owner(email).getId()).map(this::prefs).orElse(null);
    }
    public Preferences save(String email, Preferences r, boolean replaceFuture) {
        User user = owner(email);
        Catalog catalog = catalog();
        if (!Set.of(15,30,45,60,90).contains(r.dailyMinutes())) throw new IllegalArgumentException("Choose a supported daily duration");
        try { ZoneId.of(r.timeZone()); } catch (DateTimeException e) { throw new IllegalArgumentException("Choose a valid time zone"); }
        Set<String> domainIds = catalog.domains().stream().map(DomainOption::id).collect(Collectors.toSet());
        if (!domainIds.containsAll(r.domainIds())) throw new IllegalArgumentException("One or more selected domains are unavailable");
        Set<String> eligible = catalog.courses().stream().filter(c -> !Collections.disjoint(c.domainIds(), r.domainIds())).map(CourseOption::id).collect(Collectors.toSet());
        if (r.courseMode().equals("MANUAL") && (r.courseIds().isEmpty() || !eligible.containsAll(r.courseIds())))
            throw new IllegalArgumentException("Select available courses from your chosen domains");
        StudyPlan p = plans.findByUserId(user.getId()).orElseGet(() -> {
            StudyPlan n = new StudyPlan(); n.setUser(user); n.setStartDate(LocalDate.now(clock.withZone(ZoneId.of(r.timeZone())))); return n;
        });
        boolean changed = p.getId() == null || !prefs(p).equals(r);
        if (changed && p.getGenerationVersion() > 0 && !replaceFuture)
            throw new IllegalStateException("Confirm rescheduling before changing preferences");
        p.setDomainIds(new HashSet<>(r.domainIds())); p.setGoal(r.goal()); p.setSkillLevel(r.skillLevel());
        p.setDailyMinutes(r.dailyMinutes()); p.setStudyDays(new HashSet<>(r.studyDays()));
        p.setCourseMode(r.courseMode()); p.setCourseIds(new HashSet<>(r.courseIds())); p.setTimeZone(r.timeZone());
        plans.saveAndFlush(p);
        if (changed && p.getGenerationVersion() > 0) schedule(p);
        return prefs(p);
    }
    public void generate(String email, boolean replaceFuture) {
        StudyPlan p = plans.findByUserId(owner(email).getId()).orElseThrow(() -> new IllegalStateException("Set your study preferences first"));
        if (p.getGenerationVersion() == 0 || replaceFuture) schedule(p);
    }
    private LocalDate today(StudyPlan p) { return LocalDate.now(clock.withZone(ZoneId.of(p.getTimeZone()))); }
    private List<StudyTask> all(StudyPlan p) { return tasks.findByPlanIdOrderByScheduledDateAscRevisionIntervalAscIdAsc(p.getId()); }
    private void schedule(StudyPlan p) {
        LocalDate today = today(p);
        List<StudyTask> existing = all(p);
        Map<String, List<StudyTask>> byTopic = existing.stream().collect(Collectors.groupingBy(StudyTask::getTopicKey));
        Map<LocalDate, Integer> usage = new HashMap<>();
        existing.stream().filter(t -> t.getCompletedAt() != null && !t.getScheduledDate().isBefore(today))
            .forEach(t -> usage.merge(t.getScheduledDate(), t.getEstimatedMinutes(), Integer::sum));
        List<CourseOption> eligible = catalog().courses().stream().filter(c -> !Collections.disjoint(c.domainIds(), p.getDomainIds()))
            .filter(c -> !p.getCourseMode().equals("MANUAL") || p.getCourseIds().contains(c.id()))
            .sorted(Comparator.comparingInt((CourseOption c) -> c.level().equals(p.getSkillLevel()) ? 0 : 1).thenComparing(CourseOption::name).thenComparing(CourseOption::id)).toList();
        if (p.getCourseMode().equals("RECOMMEND")) eligible = eligible.stream().limit(3).toList();
        Set<String> chosen = eligible.stream().map(CourseOption::id).collect(Collectors.toSet());
        // Remove only not-started, incomplete topics excluded by the new selection. Started topic revisions always survive.
        List<StudyTask> remove = existing.stream().filter(t -> t.getCompletedAt() == null &&
            byTopic.get(t.getTopicKey()).stream().noneMatch(x -> x.getCompletedAt() != null) &&
            (t.getCourse() == null || !chosen.contains(t.getCourse().getId()) || t.getTopic() == null)).toList();
        tasks.deleteAll(remove); existing.removeAll(remove);
        Map<String, List<StudyTask>> retained = existing.stream().collect(Collectors.groupingBy(StudyTask::getTopicKey));
        // Reschedule started topics first, preserving original learning dates and every completed revision.
        retained.values().stream().filter(ts -> ts.stream().anyMatch(t -> t.getCompletedAt() != null))
            .sorted(Comparator.comparing(ts -> ts.get(0).getTopicKey())).forEach(ts -> rescheduleStarted(p, ts, usage, today));
        var mastery = progress.forCourses(p.getUser().getId(), chosen);
        for (CourseOption course : eligible) {
            var courseProgress = mastery.get(course.id());
            Set<String> mastered = courseProgress.topics().stream().filter(t -> t.completed()).map(t -> t.topicId()).collect(Collectors.toSet());
            for (Topic topic : topics.findByCourseIdOrderByTopicOrder(course.id())) {
                List<StudyTask> ts = retained.get(topic.getId());
                if (ts != null && ts.stream().anyMatch(t -> t.getCompletedAt() != null)) continue;
                // Existing quiz mastery is not reset or reinterpreted as a newly learned lesson.
                if (courseProgress.completed() || mastered.contains(topic.getId()) || !hasContent(topic)) {
                    if (ts != null) tasks.deleteAll(ts);
                    continue;
                }
                int raw = Math.max(5, topic.getTime().toSecondOfDay() / 60);
                int learnMinutes = Math.min(raw, p.getDailyMinutes());
                int revisionMinutes = Math.min(10, p.getDailyMinutes());
                Map<Integer, LocalDate> dates = StudyScheduler.topic(today, learnMinutes, revisionMinutes, p.getDailyMinutes(), p.getStudyDays(), usage);
                for (int interval : StudyScheduler.INTERVALS) {
                    StudyTask t = ts == null ? null : ts.stream().filter(x -> x.getRevisionInterval() == interval).findFirst().orElse(null);
                    if (t == null) {
                        t = new StudyTask(); t.setPlan(p); t.setCourse(courses.getReferenceById(course.id()));
                        t.setTopic(topic); t.setTopicKey(topic.getId()); t.setTitle(topic.getName()); t.setCourseName(course.name());
                        t.setRevisionInterval(interval);
                    }
                    boolean quiz = interval == 7 && !pools.findByTopicId(topic.getId()).isEmpty();
                    t.setTaskType(interval == 0 ? "Learn" : quiz ? "Test" : interval == 3 && p.getGoal().equals("INTERVIEWS") ? "Practice" : "Revise");
                    t.setActivity(interval == 0 ? "Study the lesson" : quiz ? "Take the topic quiz" : interval == 1 ? "Active recall: write what you remember" : interval == 3 ? (p.getGoal().equals("PROJECTS") ? "Apply the concept in a small example" : "Practice with a worked example") : interval == 5 ? "Explain the concept in your own words" : "Review and self-test");
                    t.setEstimatedMinutes(interval == 0 ? learnMinutes : revisionMinutes);
                    t.setOriginalLearningDate(dates.get(0)); t.setScheduledDate(dates.get(interval)); tasks.save(t);
                }
            }
        }
        p.setGenerationVersion(p.getGenerationVersion() + 1); plans.save(p);
    }
    private boolean hasContent(Topic t) {
        return !notes.findByTopicIdAndIsPublishedTrueOrderByNoteOrderAscCreatedAtAsc(t.getId()).isEmpty()
            || !materials.findByTopicId(t.getId()).isEmpty() || !pools.findByTopicId(t.getId()).isEmpty();
    }
    private void rescheduleStarted(StudyPlan p, List<StudyTask> ts, Map<LocalDate,Integer> usage, LocalDate today) {
        LocalDate previous = ts.stream().filter(t -> t.getRevisionInterval() == 0).findFirst().orElseThrow().getOriginalLearningDate();
        for (StudyTask t : ts.stream().sorted(Comparator.comparingInt(StudyTask::getRevisionInterval)).toList()) {
            if (t.getCompletedAt() != null) { previous = StudyScheduler.later(previous, t.getScheduledDate()); continue; }
            LocalDate earliest = StudyScheduler.later(today, StudyScheduler.later(t.getOriginalLearningDate().plusDays(t.getRevisionInterval()), previous.plusDays(1)));
            t.setEstimatedMinutes(Math.min(t.getEstimatedMinutes(), p.getDailyMinutes()));
            t.setScheduledDate(StudyScheduler.reserve(earliest, t.getEstimatedMinutes(), p.getDailyMinutes(), p.getStudyDays(), usage));
            previous = t.getScheduledDate();
        }
    }
    public void complete(String email, String taskId) {
        StudyPlan p = plans.findByUserId(owner(email).getId()).orElseThrow(() -> new EntityNotFoundException("Plan unavailable"));
        StudyTask task = tasks.findById(taskId).filter(t -> t.getPlan().getId().equals(p.getId())).orElseThrow(() -> new EntityNotFoundException("Task unavailable"));
        if (task.getCompletedAt() != null) return;
        if (task.getScheduledDate().isAfter(today(p))) throw new IllegalStateException("This task is scheduled for a future day");
        if (task.getTopic() == null || task.getCourse() == null || !hasContent(task.getTopic())) throw new IllegalStateException("This lesson is no longer available. Edit your preferences to refresh the plan.");
        List<StudyTask> topicTasks = all(p).stream().filter(t -> t.getTopicKey().equals(task.getTopicKey())).toList();
        if (topicTasks.stream().anyMatch(t -> t.getRevisionInterval() < task.getRevisionInterval() && t.getCompletedAt() == null))
            throw new IllegalStateException("Complete the earlier learning or revision task first");
        task.setCompletedAt(clock.instant());
        // Missed learning shifts its revision anchors to the actual learner-local completion date.
        if (task.getRevisionInterval() == 0) {
            LocalDate learned = today(p);
            topicTasks.forEach(t -> { if (t.getCompletedAt() == null || t == task) t.setOriginalLearningDate(learned); });
            Map<LocalDate,Integer> usage = new HashMap<>();
            all(p).stream().filter(t -> !t.getTopicKey().equals(task.getTopicKey()) && !t.getScheduledDate().isBefore(learned))
                .forEach(t -> usage.merge(t.getScheduledDate(), t.getEstimatedMinutes(), Integer::sum));
            rescheduleStarted(p, topicTasks, usage, learned);
        }
        tasks.save(task);
    }
    public Dashboard dashboard(String email, LocalDate weekStart) {
        StudyPlan p = plans.findByUserId(owner(email).getId()).orElse(null);
        if (p == null) return new Dashboard(null, null, 0, LocalDate.now(clock), List.of(), List.of(), List.of(), List.of(), new Summary(0,0,0,0));
        LocalDate today = today(p), start = weekStart == null ? today.with(java.time.DayOfWeek.MONDAY) : weekStart;
        List<StudyTask> all = all(p);
        List<Note> published = notes.findAll().stream().filter(n -> Boolean.TRUE.equals(n.getIsPublished())).sorted(Comparator.comparing(Note::getNoteOrder).thenComparing(Note::getId)).toList();
        List<TaskView> views = all.stream().map(t -> view(t, published)).toList();
        long done = all.stream().filter(t -> t.getCompletedAt() != null).count();
        long revisions = all.stream().filter(t -> t.getRevisionInterval() > 0).count();
        long revised = all.stream().filter(t -> t.getRevisionInterval() > 0 && t.getCompletedAt() != null).count();
        long active = all.stream().filter(t -> t.getCompletedAt() == null).map(StudyTask::getTopicKey).distinct().count();
        return new Dashboard(prefs(p), p.getId(), p.getGenerationVersion(), today,
            views.stream().filter(t -> t.scheduledDate().equals(today)).toList(),
            views.stream().filter(t -> t.scheduledDate().isBefore(today) && t.completedAt() == null).toList(),
            views.stream().filter(t -> !t.scheduledDate().isBefore(start) && t.scheduledDate().isBefore(start.plusDays(7))).toList(),
            views.stream().filter(t -> t.revisionInterval() > 0 && t.completedAt() == null && t.scheduledDate().isAfter(today)).limit(20).toList(),
            new Summary(done, all.size()-done, revisions == 0 ? 0 : (int)Math.round(revised*100.0/revisions), active));
    }
    private TaskView view(StudyTask t, List<Note> published) {
        boolean available = t.getTopic() != null && t.getCourse() != null && hasContent(t.getTopic());
        String noteId = published.stream().filter(n -> t.getTopicKey().equals(n.getTopicId())).map(Note::getId).findFirst().orElse(null);
        String href = !available ? null : t.getTaskType().equals("Test") ? "/tests?scope=TOPIC&entityId=" + t.getTopicKey() + "&courseId=" + t.getCourse().getId()
            : "/courses/" + t.getCourse().getId() + "?topic=" + t.getTopicKey();
        return new TaskView(t.getId(), t.getTopicKey(), t.getTitle(), t.getCourseName(), t.getTaskType(), t.getActivity(),
            t.getScheduledDate(), t.getOriginalLearningDate(), t.getRevisionInterval(), t.getEstimatedMinutes(), t.getCompletedAt(), available, href, noteId);
    }
}
