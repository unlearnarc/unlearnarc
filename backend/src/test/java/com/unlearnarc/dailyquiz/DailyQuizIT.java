package com.unlearnarc.dailyquiz;

import com.fasterxml.jackson.databind.JsonNode;
import com.unlearnarc.security.jwt.JwtTokenProvider;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.quspool.entity.*;
import com.unlearnarc.course.entity.Course;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.enrollment.entity.EnrolledCourse;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.*;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test") @Import(DailyQuizIT.FixedTime.class)
class DailyQuizIT {
    @TestConfiguration static class FixedTime { @Bean @Primary Clock testClock(){return Clock.fixed(Instant.parse("2025-03-10T00:30:00Z"),ZoneOffset.UTC);} }
    @Autowired TestRestTemplate rest; @Autowired UserRepository users; @Autowired JwtTokenProvider tokens;
    @Autowired EntityManager em; @Autowired TransactionTemplate tx; @Autowired DailyQuizService service;
    @Autowired DailyPoolPolicyRepository policies;
    User user; HttpHeaders headers;
    record Bank(String course,String topic,String pool,String question,String correct,String wrong){}
    @BeforeEach void student(){user=users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@test.dev").name("Daily student").build());headers=new HttpHeaders();headers.setBearerAuth(tokens.generateUserAccessToken(user));}
    ResponseEntity<JsonNode> request(HttpMethod method,String path,Object body,HttpHeaders h){return rest.exchange("/api/v1/daily-quiz"+path,method,new HttpEntity<>(body,h),JsonNode.class);}
    JsonNode post(String path,Object body){var r=request(HttpMethod.POST,path,body,headers);assertThat(r.getStatusCode().is2xxSuccessful()).as(r.toString()).isTrue();return r.getBody().path("data");}
    JsonNode get(String path){var r=request(HttpMethod.GET,path,null,headers);assertThat(r.getStatusCode()).as(r.toString()).isEqualTo(HttpStatus.OK);return r.getBody().path("data");}
    Bank bank(boolean enroll,boolean intro,boolean diagnostic){return tx.execute(status->{
        Course c=Course.builder().name("Daily course "+UUID.randomUUID()).imgUrl("/course.png").totalTime(LocalTime.of(0,30)).topicsCount(1).level(Course.CourseLevel.BEGINNER).build();em.persist(c);
        Topic t=Topic.builder().courseId(c.getId()).name("Daily topic").time(LocalTime.of(0,10)).topicOrder(1L).level(Topic.TopicLevel.BEGINNER).build();em.persist(t);
        QuestionPool p=QuestionPool.builder().name("Daily pool").scopeType(QuestionPool.ScopeType.TOPIC).build();em.persist(p);
        em.persist(TopicPoolMapping.builder().poolId(p.getId()).topicId(t.getId()).build());
        Question q=Question.builder().poolId(p.getId()).questionText("Daily question").questionType(Question.QuestionType.MCQ).difficulty(Question.Difficulty.EASY).explanation("Daily reasoning").build();em.persist(q);
        Answer correct=Answer.builder().questionId(q.getId()).answerText("Right option").isCorrect(true).build();em.persist(correct);
        Answer wrong=Answer.builder().questionId(q.getId()).answerText("Wrong option").isCorrect(false).displayOrder(1).build();em.persist(wrong);
        if(enroll)em.persist(EnrolledCourse.builder().userId(user.getId()).courseId(c.getId()).build());
        if(intro||diagnostic){DailyPoolPolicy policy=new DailyPoolPolicy();policy.setPoolId(p.getId());policy.setIntroductory(intro);policy.setGeneralDiagnostic(diagnostic);em.persist(policy);}
        em.flush();return new Bank(c.getId(),t.getId(),p.getId(),q.getId(),correct.getId(),wrong.getId());
    });}
    @Test void noBankReturnsHelpfulPersistedEmptySession(){JsonNode s=post("/today",null);assertThat(s.path("questions")).isEmpty();assertThat(s.path("notices").toString()).contains("No eligible questions");assertThat(post("/today",null).path("id")).isEqualTo(s.path("id"));}
    @Test void enrollmentDoesNotImplyLessonCompletion(){bank(true,false,false);assertThat(post("/today",null).path("questions")).isEmpty();}
    @Test void introductoryEnrollmentProducesDiagnosticNotWeakness(){Bank b=bank(true,true,false);JsonNode s=post("/today",null);assertThat(s.path("questions")).hasSize(1);assertThat(s.path("questions").get(0).path("reason").asText()).isEqualTo("DIAGNOSTIC_ASSESSMENT");assertThat(s.path("questions").get(0).has("correctAnswerIds")).isFalse();assertThat(s.toString()).doesNotContain("Right option\",\"correct\":true");assertThat(s.path("questions").get(0).has("explanation")).isFalse();}
    @Test void completeResumeReviewAndIdempotency(){Bank b=bank(true,true,false);JsonNode s=post("/today",null);String id=s.path("id").asText(),item=s.path("questions").get(0).path("id").asText();
        assertThat(post("/sessions/"+id+"/start",null).path("status").asText()).isEqualTo("IN_PROGRESS");
        var answer=Map.of("selectedAnswerIds",List.of(b.correct()));JsonNode graded=post("/sessions/"+id+"/answers/"+item,answer);
        assertThat(graded.path("correctCount").asInt()).isEqualTo(1);assertThat(graded.path("questions").get(0).path("explanation").asText()).isEqualTo("Daily reasoning");
        assertThat(post("/sessions/"+id+"/answers/"+item,answer).path("correctCount").asInt()).isEqualTo(1);
        assertThat(request(HttpMethod.POST,"/sessions/"+id+"/answers/"+item,Map.of("selectedAnswerIds",List.of(b.wrong())),headers).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(get("/today").path("questions").get(0).path("correct").asBoolean()).isTrue();
        assertThat(post("/sessions/"+id+"/complete",null).path("status").asText()).isEqualTo("COMPLETED");post("/sessions/"+id+"/complete",null);
        assertThat(users.findById(user.getId()).orElseThrow().getCurrentStreak()).isEqualTo(1);
        assertThat(get("/history").path("content")).hasSize(1);
        JsonNode insight=get("/insights").get(0);assertThat(insight.path("evidence").path("state").asText()).isEqualTo("INSUFFICIENT_DATA");
    }
    @Test void rejectsForgedOptionsAndCrossStudentAccess(){Bank b=bank(true,true,false);JsonNode s=post("/today",null);String id=s.path("id").asText(),item=s.path("questions").get(0).path("id").asText();
        assertThat(request(HttpMethod.POST,"/sessions/"+id+"/answers/"+item,Map.of("selectedAnswerIds",List.of("fabricated"),"correct",true,"score",100),headers).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        User other=users.saveAndFlush(User.builder().name("Other").email(UUID.randomUUID()+"@test.dev").build());HttpHeaders h=new HttpHeaders();h.setBearerAuth(tokens.generateUserAccessToken(other));
        assertThat(request(HttpMethod.GET,"/sessions/"+id,null,h).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(request(HttpMethod.POST,"/sessions/"+id+"/answers/"+item,Map.of("selectedAnswerIds",List.of(b.correct())),h).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(request(HttpMethod.GET,"/today",null,new HttpHeaders()).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(request(HttpMethod.GET,"/admin/quality",null,headers).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
    @Test void concurrentGenerationPersistsOneInitialSession() throws Exception {bank(true,true,false);ExecutorService executor=Executors.newFixedThreadPool(2);try{
        var a=executor.submit(()->service.today(user.getEmail(),true));var b=executor.submit(()->service.today(user.getEmail(),true));assertThat(a.get(15,TimeUnit.SECONDS).id()).isEqualTo(b.get(15,TimeUnit.SECONDS).id());
    }finally{executor.shutdownNow();}}
    @Test void deletedQuestionDoesNotBreakSavedQuiz(){Bank b=bank(true,true,false);JsonNode s=post("/today",null);tx.executeWithoutResult(st->{em.createQuery("delete from Answer a where a.questionId=:q").setParameter("q",b.question()).executeUpdate();em.remove(em.find(Question.class,b.question()));});assertThat(get("/sessions/"+s.path("id").asText()).path("questions").get(0).path("text").asText()).isEqualTo("Daily question");}
    @Test void uncompletedSessionCannotBeCompleted(){bank(true,true,false);String id=post("/today",null).path("id").asText();assertThat(request(HttpMethod.POST,"/sessions/"+id+"/complete",null,headers).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);}
    @Test void aggregateOnlyTopicHistoryEnablesPracticeWithoutFabricatingWeakness(){Bank b=bank(false,false,false);tx.executeWithoutResult(st->{TestResult r=TestResult.builder().poolId(b.pool()).poolName("Imported topic result").entityType(QuestionPool.ScopeType.TOPIC).entityId(b.topic()).totalQuestions(10).correctCount(1).wrongCount(9).skippedCount(0).totalPoints(10).earnedPoints(1).scorePercentage(10d).passPercentage(60).passed(false).improvementNeeded(true).answerSnapshot("[]").build();em.persist(r);em.flush();em.createNativeQuery("update test_result set created_at=:at where id=:id").setParameter("at",Instant.parse("2025-03-09T10:00:00Z")).setParameter("id",r.getId()).executeUpdate();em.persist(UserTestAttempt.builder().userId(user.getId()).testId(r.getId()).build());});
        assertThat(post("/today",null).path("questions")).hasSize(1);JsonNode evidence=get("/insights").get(0).path("evidence");assertThat(evidence.path("distinctQuestions").asInt()).isZero();assertThat(evidence.path("state").asText()).isEqualTo("NOT_ASSESSED");}
}
