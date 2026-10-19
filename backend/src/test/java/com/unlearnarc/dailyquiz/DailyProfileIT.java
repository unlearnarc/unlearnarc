package com.unlearnarc.dailyquiz;

import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.course.entity.Course;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.quspool.entity.*;
import com.unlearnarc.studyplan.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test") @Import(DailyQuizIT.FixedTime.class)
class DailyProfileIT {
    @Autowired EntityManager em; @Autowired TransactionTemplate tx; @Autowired DailyQuizService service;
    @Autowired UserRepository users; @Autowired DailyQuizAdminController admin;
    User user;
    record Bank(String course,String topic,String pool,List<String> questions){}
    @BeforeEach void student(){user=users.saveAndFlush(User.builder().name("Profile student").email(UUID.randomUUID()+"@test.dev").build());}
    Bank bank(){return tx.execute(st->{
        Course c=Course.builder().name("Profile course "+UUID.randomUUID()).imgUrl("/course.png").totalTime(LocalTime.of(0,30)).topicsCount(1).level(Course.CourseLevel.BEGINNER).build();em.persist(c);
        Topic t=Topic.builder().courseId(c.getId()).name("Profile concept").time(LocalTime.of(0,10)).topicOrder(1L).level(Topic.TopicLevel.BEGINNER).build();em.persist(t);
        QuestionPool p=QuestionPool.builder().name("Profile pool").scopeType(QuestionPool.ScopeType.TOPIC).build();em.persist(p);em.persist(TopicPoolMapping.builder().topicId(t.getId()).poolId(p.getId()).build());
        List<String> ids=new ArrayList<>();for(int n=0;n<4;n++){Question q=Question.builder().poolId(p.getId()).questionText("Concept question "+n).questionType(Question.QuestionType.MCQ).difficulty(Question.Difficulty.EASY).explanation("Reasoning").build();em.persist(q);ids.add(q.getId());em.persist(Answer.builder().questionId(q.getId()).answerText("Yes").isCorrect(true).build());em.persist(Answer.builder().questionId(q.getId()).answerText("No").build());}
        return new Bank(c.getId(),t.getId(),p.getId(),ids);
    });}
    void result(Bank b,String snapshot,boolean duplicate){tx.executeWithoutResult(st->{
        TestResult r=TestResult.builder().poolId(b.pool()).poolName("Historical quiz").entityType(QuestionPool.ScopeType.TOPIC).entityId(b.topic()).totalQuestions(3).correctCount(0).wrongCount(3).skippedCount(0).totalPoints(3).earnedPoints(0).scorePercentage(0d).passPercentage(60).passed(false).improvementNeeded(true).answerSnapshot(snapshot).build();em.persist(r);em.flush();em.createNativeQuery("update test_result set created_at=:at where id=:id").setParameter("at",Instant.parse("2025-03-09T10:00:00Z")).setParameter("id",r.getId()).executeUpdate();em.persist(UserTestAttempt.builder().userId(user.getId()).testId(r.getId()).build());if(duplicate)em.persist(UserTestAttempt.builder().userId(user.getId()).testId(r.getId()).build());
    });}
    String row(String q,boolean correct,boolean skip){return "{\"questionId\":\""+q+"\",\"isCorrect\":"+correct+",\"difficulty\":\"EASY\",\"selectedAnswerIds\":"+(skip?"[]":"[\"selected\"]")+"}";}
    @Test void importedQuestionEvidenceIsOwnedDeduplicatedAndSkipsExcluded(){Bank b=bank();result(b,"["+row(b.questions().get(0),false,false)+","+row(b.questions().get(1),false,false)+","+row(b.questions().get(2),false,false)+","+row(b.questions().get(2),false,false)+","+row(b.questions().get(3),false,true)+"]",true);
        var evidence=service.insights(user.getEmail(),false).get(0).evidence();assertThat(evidence.distinctQuestions()).isEqualTo(3);assertThat(evidence.state()).isEqualTo(DailyQuizRules.State.NEEDS_FOUNDATION);
        var session=service.today(user.getEmail(),true);assertThat(session.questions()).hasSize(4);assertThat(session.questions().stream().map(DailyQuizModels.ItemView::questionId).distinct().count()).isEqualTo(4);assertThat(session.questions().get(0).reason()).isEqualTo("LOW_TOPIC_MASTERY");
        User other=users.saveAndFlush(User.builder().name("Other").email(UUID.randomUUID()+"@test.dev").build());assertThat(service.insights(other.getEmail(),false)).isEmpty();
    }
    @Test void corruptSnapshotFallsBackToScopedDiagnosticWithoutFalseFailures(){Bank b=bank();result(b,"broken JSON",false);var session=service.today(user.getEmail(),true);assertThat(session.questions()).hasSize(4);assertThat(session.notices()).contains("Some historical assessment evidence could not be used.");assertThat(service.insights(user.getEmail(),false).get(0).evidence().distinctQuestions()).isZero();}
    @Test void explicitCompletedLearningSchedulesRevisionWithoutMastery(){Bank b=bank();tx.executeWithoutResult(st->{StudyPlan p=new StudyPlan();p.setUser(em.getReference(User.class,user.getId()));p.setStartDate(LocalDate.of(2025,3,1));p.setGoal("FUNDAMENTALS");p.setSkillLevel("BEGINNER");p.setDailyMinutes(15);p.setCourseMode("MANUAL");p.setTimeZone("America/Los_Angeles");em.persist(p);
        StudyTask t=new StudyTask();t.setPlan(p);t.setTopic(em.getReference(Topic.class,b.topic()));t.setCourse(em.getReference(Course.class,b.course()));t.setTopicKey(b.topic());t.setTitle("Learned topic");t.setCourseName("Profile course");t.setTaskType("Learn");t.setActivity("Study");t.setOriginalLearningDate(LocalDate.of(2025,3,1));t.setScheduledDate(LocalDate.of(2025,3,1));t.setEstimatedMinutes(10);t.setCompletedAt(Instant.parse("2025-03-01T12:00:00Z"));em.persist(t);
    });var s=service.today(user.getEmail(),true);assertThat(s.learningDate()).isEqualTo(LocalDate.of(2025,3,9));assertThat(s.questions().get(0).reason()).isEqualTo("REVISION_DUE");assertThat(service.insights(user.getEmail(),false).get(0).evidence().mastery()).isZero();}
    @Test void generalDiagnosticsRequireOptInAndReturnNoMasteryClaims(){Bank b=bank();assertThat(service.insights(user.getEmail(),false)).isEmpty();tx.executeWithoutResult(st->{DailyPoolPolicy p=new DailyPoolPolicy();p.setPoolId(b.pool());p.setGeneralDiagnostic(true);em.persist(p);});try{var s=service.today(user.getEmail(),true);assertThat(s.questions()).hasSize(4);assertThat(s.questions()).allMatch(q->q.reason().equals("DIAGNOSTIC_ASSESSMENT"));}finally{tx.executeWithoutResult(st->em.remove(em.find(DailyPoolPolicy.class,b.pool())));}}
    @Test @org.springframework.security.test.context.support.WithMockUser(roles="ADMIN") void adminQualityQueryExecutes(){bank();tx.executeWithoutResult(st->assertThat(admin.quality()).isNotNull());}
}
