package com.unlearnarc.authoring;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.authoring.AuthoringModels.Kind;
import com.unlearnarc.course.dto.CourseRequest;
import com.unlearnarc.course.entity.Course.CourseLevel;
import com.unlearnarc.course.service.CourseService;
import com.unlearnarc.topic.repository.TopicRepository;
import com.unlearnarc.topic.service.TopicService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.time.LocalTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class AuthoringPersistenceTest {
    @Autowired AuthoringService service;
    @Autowired AuthoringJobRepository jobs;
    @Autowired CourseService courses;
    @Autowired TopicRepository topicRepository;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired ObjectMapper mapper;
    @MockBean AiContentGenerator generator;
    @org.springframework.boot.test.mock.mockito.SpyBean TopicService topics;

    String courseId;
    @BeforeEach void setup() {
        CourseRequest course = new CourseRequest(); course.setName("Authoring test " + UUID.randomUUID());
        course.setImgUrl("https://example.com/cover.png"); course.setTotalTime(LocalTime.of(1, 0)); course.setTopicsCount(0); course.setLevel(CourseLevel.BEGINNER);
        courseId = courses.create(course).getId();
    }
    AuthoringJob draft(int count) {
        var list = mapper.createArrayNode();
        for (int i = 1; i <= count; i++) list.add(mapper.createObjectNode().put("name", "Topic " + i).put("time", "00:20:00")
                .put("topicOrder", i).put("level", "BEGINNER").put("courseId", courseId));
        var job = new AuthoringJob(); job.setOwner("admin"); job.setKind(Kind.TOPICS); job.setCourseId(courseId);
        job.setPrompt("Test"); job.setProposal(mapper.createObjectNode().set("topics", list).toString());
        return jobs.save(job);
    }
    @Test void persistsBatchAndRetryDoesNotDuplicate() {
        var job = draft(2);
        var first = service.save("admin", job.getId());
        var retry = service.save("admin", job.getId());
        assertEquals(first.result(), retry.result());
        assertEquals(2, topicRepository.findByCourseIdOrderByTopicOrder(courseId).size());
        assertEquals("SAVED", jobs.findById(job.getId()).orElseThrow().getStatus());
        assertThrows(IllegalArgumentException.class, () -> service.review("admin", job.getId(), first.proposal()));
    }
    @Test void failureAfterFirstWriteRollsBackEntireBatchAndJob() {
        var job = draft(2);
        doAnswer(invocation -> {
            var request = invocation.getArgument(0, com.unlearnarc.topic.dto.TopicRequest.class);
            if ("Topic 2".equals(request.getName())) throw new IllegalStateException("Injected persistence failure");
            return invocation.callRealMethod();
        }).when(topics).create(any());
        assertThrows(IllegalStateException.class, () -> service.save("admin", job.getId()));
        assertTrue(topicRepository.findByCourseIdOrderByTopicOrder(courseId).isEmpty());
        assertEquals("DRAFT", jobs.findById(job.getId()).orElseThrow().getStatus());
        assertNull(jobs.findById(job.getId()).orElseThrow().getResult());
    }
    @Test void generatedAnimationCanBePreviewedAndSavedUnpublished() throws Exception {
        var job = new AuthoringJob(); job.setOwner("admin"); job.setKind(Kind.ANIMATION); job.setPrompt("Teach Two Sum");
        job.setProposal("{\"slug\":\"ai-two-sum-test\",\"title\":\"Two Sum\",\"category\":\"DSA\",\"source\":\"GENERATED\",\"kind\":\"leetcode-two-sum\",\"simulatorParams\":{\"nums\":\"2,7,11,15\",\"target\":9},\"isPublished\":false}");
        job = jobs.save(job);
        var review = service.review("admin", job.getId(), mapper.readTree(job.getProposal()));
        assertTrue(review.preview().path("keyframes").size() > 0);
        var saved = service.save("admin", job.getId());
        assertFalse(saved.result().path("isPublished").asBoolean());
        assertTrue(saved.result().path("trace").path("keyframes").size() > 0);
    }
    @Test void generationStoresOnlyADraftWithProviderMocked() throws Exception {
        when(generator.generate(anyString(), any(), anyString())).thenReturn(mapper.readTree("{\"topics\":[{\"name\":\"Arrays\",\"time\":\"00:20:00\",\"topicOrder\":1,\"level\":\"BEGINNER\",\"courseId\":\"" + courseId + "\"}]}"));
        var generated = service.generate("admin", new AuthoringModels.GenerateRequest(Kind.TOPICS, "Create arrays topic", courseId, 1));
        assertEquals("DRAFT", generated.status());
        assertTrue(topicRepository.findByCourseIdOrderByTopicOrder(courseId).isEmpty());
        assertTrue(jobs.findById(generated.id()).isPresent());
    }
    @Test void rejectsOtherOwnerAndLocksJob() {
        var job = draft(1);
        assertThrows(jakarta.persistence.EntityNotFoundException.class, () -> service.save("other", job.getId()));
        new TransactionTemplate(transactionManager).executeWithoutResult(tx -> assertTrue(jobs.lockOwned(job.getId(), "admin").isPresent()));
    }
}
