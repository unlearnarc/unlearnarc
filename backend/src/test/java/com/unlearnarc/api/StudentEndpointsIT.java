package com.unlearnarc.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.unlearnarc.security.jwt.JwtTokenProvider;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

/** Exercises real routing, JWT authentication, persistence and response serialization. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class StudentEndpointsIT {
    @Autowired TestRestTemplate rest;
    @Autowired UserRepository users;
    @Autowired JwtTokenProvider tokens;
    private HttpEntity<Void> request;

    @BeforeEach void authenticateExistingStudent() {
        User user = users.saveAndFlush(User.builder().name("Existing student")
                .email(UUID.randomUUID() + "@example.test").points(100L).build());
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tokens.generateUserAccessToken(user));
        request = new HttpEntity<>(headers);
    }

    private JsonNode get(String path) {
        var response = rest.exchange("/api/v1" + path, HttpMethod.GET, request, JsonNode.class);
        assertThat(response.getStatusCode()).as(path).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().path("success").asBoolean()).as(path).isTrue();
        return response.getBody().path("data");
    }

    @Test void leaderboardAndBothMeEndpointsSerializeSuccessfully() {
        assertThat(get("/leaderboard").isArray()).isTrue();
        assertThat(get("/leaderboard/regions").isArray()).isTrue();
        assertThat(get("/leaderboard/region/IN").isArray()).isTrue();
        assertThat(get("/leaderboard/me").path("points").asLong()).isEqualTo(100);
        assertThat(get("/user-auth/me").path("name").asText()).isEqualTo("Existing student");
    }

    @Test void studentWithoutPreferencesCanOpenStudyPlanAndCatalog() {
        assertThat(get("/study-plan").path("generationVersion").asInt()).isZero();
        assertThat(get("/study-plan/catalog").path("courses").isArray()).isTrue();
        get("/study-plan/preferences");
        assertThat(get("/study-plan/tasks/today").isArray()).isTrue();
    }

    @Autowired jakarta.persistence.EntityManager entities;
    @Autowired org.springframework.transaction.support.TransactionTemplate transactions;

    private record Catalog(String domain, String skill, String course, String topic,
                           String role, String contest, String pool, String question, String answer) {}

    /** Non-empty fixtures force DTO builders and generated mappers to load. */
    private Catalog catalog() {
        return transactions.execute(status -> {
            var domain = com.unlearnarc.domain.entity.Domain.builder().name("API domain").build();
            var skill = com.unlearnarc.skill.entity.Skill.builder().name("API skill")
                    .level(com.unlearnarc.skill.entity.Skill.SkillLevel.BEGINNER).build();
            var course = com.unlearnarc.course.entity.Course.builder().name("API course")
                    .imgUrl("/course.png").totalTime(java.time.LocalTime.of(0, 30)).topicsCount(1)
                    .level(com.unlearnarc.course.entity.Course.CourseLevel.BEGINNER).build();
            var topic = com.unlearnarc.topic.entity.Topic.builder().name("API topic")
                    .courseId(course.getId()).time(java.time.LocalTime.of(0, 15)).topicOrder(1L)
                    .level(com.unlearnarc.topic.entity.Topic.TopicLevel.BEGINNER).build();
            var role = com.unlearnarc.role.entity.Role.builder().name("API role").build();
            var contest = com.unlearnarc.contest.entity.Contest.builder().title("API contest")
                    .slug(UUID.randomUUID().toString())
                    .status(com.unlearnarc.contest.entity.Contest.ContestStatus.PUBLISHED).build();
            var pool = com.unlearnarc.quspool.entity.QuestionPool.builder().name("API quiz")
                    .scopeType(com.unlearnarc.quspool.entity.QuestionPool.ScopeType.COURSE)
                    .totalQuestions(1).easyCount(1).mediumCount(0).hardCount(0).build();
            var question = com.unlearnarc.quspool.entity.Question.builder().poolId(pool.getId())
                    .questionText("Which answer is correct?")
                    .questionType(com.unlearnarc.quspool.entity.Question.QuestionType.MCQ)
                    .difficulty(com.unlearnarc.quspool.entity.Question.Difficulty.EASY).build();
            var answer = com.unlearnarc.quspool.entity.Answer.builder().questionId(question.getId())
                    .answerText("Correct").isCorrect(true).build();
            for (Object entity : java.util.List.of(domain, skill, course, topic, role, contest, pool, question, answer)) {
                entities.persist(entity);
            }
            entities.persist(com.unlearnarc.mapping.entity.DomainSkillMapping.builder()
                    .domainId(domain.getId()).skillId(skill.getId()).build());
            entities.persist(com.unlearnarc.mapping.entity.SkillCourseMapping.builder()
                    .skillId(skill.getId()).courseId(course.getId()).build());
            entities.persist(com.unlearnarc.role.entity.RoleDomainMapping.builder()
                    .roleId(role.getId()).domainId(domain.getId()).build());
            entities.persist(com.unlearnarc.quspool.entity.CoursePoolMapping.builder()
                    .courseId(course.getId()).poolId(pool.getId()).build());
            entities.flush();
            return new Catalog(domain.getId(), skill.getId(), course.getId(), topic.getId(),
                    role.getId(), contest.getId(), pool.getId(), question.getId(), answer.getId());
        });
    }

    private JsonNode post(String path, Object body) {
        var response = rest.exchange("/api/v1" + path, HttpMethod.POST,
                new HttpEntity<>(body, request.getHeaders()), JsonNode.class);
        assertThat(response.getStatusCode().is2xxSuccessful()).as(path + ": " + response.getBody()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().path("success").asBoolean()).as(path).isTrue();
        return response.getBody().path("data");
    }

    @Test void populatedCatalogMappingsAndRoadmapSerializeSuccessfully() {
        var c = catalog();
        for (String path : java.util.List.of("/domains", "/skills", "/courses", "/roles",
                "/domain-skill-mappings", "/skill-course-mappings")) {
            assertThat(get(path).isArray()).as(path).isTrue();
        }
        get("/domains/" + c.domain());
        get("/skills/" + c.skill());
        get("/courses/" + c.course());
        get("/topics/by-course/" + c.course());
        get("/domain-skill-mappings/domain/" + c.domain());
        get("/skill-course-mappings/skill/" + c.skill());
        assertThat(get("/roadmap/role/" + c.role()).path("totalCourses").asInt()).isEqualTo(1);
    }

    @Test void myCoursesSerializeAfterEnrollment() {
        var c = catalog();
        post("/enrollments/course/" + c.course(), null);
        assertThat(get("/enrollments/me").toString()).contains(c.course());
        get("/enrollments/course/" + c.course() + "/status");
        get("/enrollments/course/" + c.course() + "/progress");
    }

    @Test void publishedContestsAndStudentProgressSerializeSuccessfully() {
        var c = catalog();
        assertThat(get("/contests").toString()).contains(c.contest());
        get("/contests/" + c.contest());
        get("/contests/" + c.contest() + "/problems");
        get("/contests/" + c.contest() + "/leaderboard");
        get("/contests/" + c.contest() + "/my-submissions");
        get("/contests/my-progress");
    }

    @Test void generatedQuizCanBeGradedAndReadFromHistoryAndInsights() {
        var c = catalog();
        get("/question-pools/by-course/" + c.course());
        var session = post("/tests/generate", java.util.Map.of("scopeType", "COURSE",
                "entityId", c.course(), "poolId", c.pool()));
        assertThat(session.path("questions").size()).isEqualTo(1);
        post("/tests/grade", java.util.Map.of("scopeType", "COURSE", "entityId", c.course(),
                "poolId", c.pool(), "answers", java.util.List.of(java.util.Map.of(
                        "questionId", c.question(), "selectedAnswerIds", java.util.List.of(c.answer())))));
        var history = get("/tests/history").path("content");
        assertThat(history.size()).isEqualTo(1);
        assertThat(history.get(0).path("attemptId").asText()).isNotBlank();
        get("/tests/history/" + history.get(0).path("attemptId").asText());
        get("/tests/insights/dashboard");
        get("/tests/insights/improvement");
    }

    @Test void missingEndpointReturns404RatherThan500() {
        var response = rest.exchange("/api/v1/no-such-student-endpoint", HttpMethod.GET, request, JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
    }
}
