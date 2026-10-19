package com.unlearnarc.studyplan;

import org.springframework.boot.test.context.TestConfiguration;
import com.unlearnarc.course.entity.Course;
import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.domain.entity.Domain;
import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.enrollment.service.LearningProgressService;
import com.unlearnarc.mapping.entity.*;
import com.unlearnarc.mapping.repository.*;
import com.unlearnarc.skill.entity.Skill;
import com.unlearnarc.skill.repository.SkillRepository;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.topic.repository.TopicRepository;
import com.unlearnarc.note.entity.Note;
import com.unlearnarc.note.repository.NoteRepository;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.*;
import org.springframework.test.context.ActiveProfiles;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@Import({StudyPlanService.class, LearningProgressService.class, StudyPlanPersistenceTest.FixedClock.class})
class StudyPlanPersistenceTest {
    @TestConfiguration static class FixedClock {
        @Bean Clock clock() { return Clock.fixed(Instant.parse("2026-06-01T12:00:00Z"), ZoneOffset.UTC); }
    }
    @Autowired StudyPlanService service;
    @Autowired UserRepository users;
    @Autowired CourseRepository courses;
    @Autowired TopicRepository topics;
    @Autowired NoteRepository notes;
    @Autowired DomainRepository domains;
    @Autowired SkillRepository skills;
    @Autowired DomainSkillMappingRepository ds;
    @Autowired SkillCourseMappingRepository sc;
    @Autowired StudyPlanRepository plans;
    @Autowired StudyTaskRepository tasks;
    String email, domainId, courseId;
    @BeforeEach void seed() {
        email = UUID.randomUUID()+"@example.test";
        users.saveAndFlush(User.builder().name("Existing learner").email(email).build());
        Domain d = domains.saveAndFlush(Domain.builder().name("CS Fundamentals").build()); domainId=d.getId();
        Skill s = skills.saveAndFlush(Skill.builder().name("Basics").level(Skill.SkillLevel.BEGINNER).build());
        Course c = courses.saveAndFlush(Course.builder().name("Computers").imgUrl("").totalTime(LocalTime.of(1,0)).topicsCount(2).level(Course.CourseLevel.BEGINNER).build()); courseId=c.getId();
        ds.saveAndFlush(DomainSkillMapping.builder().domainId(d.getId()).skillId(s.getId()).build());
        sc.saveAndFlush(SkillCourseMapping.builder().skillId(s.getId()).courseId(c.getId()).build());
        for(int i=0;i<2;i++) {
            Topic t=topics.saveAndFlush(Topic.builder().name("Topic "+i).time(LocalTime.of(0,15)).topicOrder((long)i).level(Topic.TopicLevel.BEGINNER).courseId(c.getId()).build());
            notes.saveAndFlush(Note.builder().title("Lesson").contentHtml("<p>Real course lesson</p>").topicId(t.getId()).isPublished(true).build());
        }
    }
    StudyPlanModels.Preferences prefs(Set<Integer> days) {
        return new StudyPlanModels.Preferences(Set.of(domainId),"FUNDAMENTALS","BEGINNER",60,days,"MANUAL",Set.of(courseId),"UTC");
    }
    void generate() { service.save(email,prefs(Set.of(1,2,3,4,5,6,7)),false); service.generate(email,false); tasks.flush(); }
    @Test void existingUserSetupPersistsAndGenerationIsIdempotent() {
        assertNull(service.preferences(email)); generate();
        var d=service.dashboard(email,null);
        assertEquals(10,d.summary().remaining()); assertEquals(2,d.todayTasks().size());
        assertNotNull(d.todayTasks().get(0).noteId());
        service.generate(email,false); tasks.flush();
        assertEquals(10,tasks.count()); assertEquals(1,service.dashboard(email,null).generationVersion());
        for(var t: tasks.findAll()) assertEquals(t.getOriginalLearningDate().plusDays(t.getRevisionInterval()),t.getScheduledDate());
    }
    @Test void completionAndPreferenceUpdatesPreserveHistory() {
        generate(); var task=service.dashboard(email,null).todayTasks().get(0);
        service.complete(email,task.id()); service.complete(email,task.id()); tasks.flush();
        assertEquals(1,service.dashboard(email,null).summary().completed());
        var timestamp=tasks.findById(task.id()).orElseThrow().getCompletedAt();
        assertThrows(IllegalStateException.class,()->service.save(email,prefs(Set.of(1,3,5)),false));
        service.save(email,prefs(Set.of(1,3,5)),true); tasks.flush();
        assertEquals(timestamp,tasks.findById(task.id()).orElseThrow().getCompletedAt());
        assertEquals(10,tasks.count());
        assertTrue(tasks.findAll().stream().filter(t->t.getCompletedAt()==null).allMatch(t->Set.of(1,3,5).contains(t.getScheduledDate().getDayOfWeek().getValue())));
    }
    @Test void tasksAreOwnedByAuthenticatedAccount() {
        generate(); var id=service.dashboard(email,null).todayTasks().get(0).id();
        String other=UUID.randomUUID()+"@example.test";
        users.saveAndFlush(User.builder().name("Other").email(other).build());
        service.save(other,prefs(Set.of(1,2,3,4,5,6,7)),false); service.generate(other,false);
        assertThrows(EntityNotFoundException.class,()->service.complete(other,id));
        assertEquals(0,service.dashboard(other,null).summary().completed());
    }
    @Test void emptyContentAndUnavailableSelectionAreHandled() {
        notes.deleteAll(); notes.flush(); generate();
        assertEquals(0,service.dashboard(email,null).summary().remaining());
        var invalid=new StudyPlanModels.Preferences(Set.of("missing"),"CAREER","BEGINNER",30,Set.of(1),"ALL",Set.of(),"UTC");
        assertThrows(IllegalArgumentException.class,()->service.save(email,invalid,true));
    }
    @Test void futureTasksCannotBeCompletedEarly() {
        generate(); var t=tasks.findAll().stream().filter(x->x.getRevisionInterval()>0).findFirst().orElseThrow();
        assertThrows(IllegalStateException.class,()->service.complete(email,t.getId()));
    }
    @Test void lateLearningReanchorsRevisionsAndRespectsTimezone() {
        generate(); var t=tasks.findAll().stream().filter(x->x.getRevisionInterval()==0).findFirst().orElseThrow();
        t.setScheduledDate(LocalDate.of(2026,5,25)); t.setOriginalLearningDate(LocalDate.of(2026,5,25)); tasks.saveAndFlush(t);
        service.complete(email,t.getId()); tasks.flush();
        assertTrue(tasks.findAll().stream().filter(x->x.getTopicKey().equals(t.getTopicKey())).allMatch(x->x.getOriginalLearningDate().equals(LocalDate.of(2026,6,1))));
        var p=prefs(Set.of(1,2,3,4,5,6,7));
        service.save(email,new StudyPlanModels.Preferences(p.domainIds(),p.goal(),p.skillLevel(),p.dailyMinutes(),p.studyDays(),p.courseMode(),p.courseIds(),"Pacific/Kiritimati"),true);
        assertEquals(LocalDate.of(2026,6,2),service.dashboard(email,null).today());
    }
}
