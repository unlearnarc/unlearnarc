package com.unlearnarc.authoring;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.unlearnarc.authoring.AuthoringModels.Kind;
import com.unlearnarc.canvasanim.dto.*;
import com.unlearnarc.canvasanim.service.AnimationSceneService;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.course.service.CourseService;
import com.unlearnarc.topic.dto.*;
import com.unlearnarc.topic.service.TopicService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthoringServiceTest {
    @Mock AuthoringJobRepository jobs;
    @Mock AiContentGenerator generator;
    @Mock CourseService courses;
    @Mock TopicService topics;
    @Mock AnimationSceneService scenes;
    ObjectMapper mapper = JsonMapper.builder().findAndAddModules().build();
    AuthoringService service;
    AuthoringJob job;
    @BeforeEach void setup() {
        service = new AuthoringService(jobs, generator, mapper, Validation.buildDefaultValidatorFactory().getValidator(), courses, topics, scenes);
        job = new AuthoringJob(); job.setId("job-1"); job.setOwner("admin"); job.setKind(Kind.TOPICS); job.setCourseId("course-1"); job.setPrompt("Arrays");
    }
    JsonNode topic(String extra) throws Exception {
        return mapper.readTree("{\"topics\":[{\"name\":\"Arrays\",\"time\":\"00:20:00\",\"topicOrder\":1,\"level\":\"BEGINNER\",\"courseId\":\"course-1\"" + extra + "}]}");
    }
    @Test void validatesTopics() throws Exception { assertTrue(service.validate(job, topic("")).isNull()); }
    @Test void rejectsUnknownFields() { assertThrows(IllegalArgumentException.class, () -> service.validate(job, topic(",\"isPublished\":true"))); }
    @Test void rejectsOtherCourse() throws Exception {
        var proposal = topic(""); ((com.fasterxml.jackson.databind.node.ObjectNode) proposal.path("topics").path(0)).put("courseId", "other");
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, proposal));
    }
    @Test void rejectsDuplicateExistingNameIgnoringCase() throws Exception {
        when(topics.findByCourseId("course-1")).thenReturn(List.of(TopicResponse.builder().name("ARRAYS").topicOrder(5L).build()));
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, topic("")));
    }
    @Test void rejectsOrderCollision() throws Exception {
        when(topics.findByCourseId("course-1")).thenReturn(List.of(TopicResponse.builder().name("Intro").topicOrder(1L).build()));
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, topic("")));
    }
    @Test void rejectsEmptyAndOversizedBatches() throws Exception {
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, mapper.readTree("{\"topics\":[]}")));
        var list = mapper.createArrayNode(); for (int i = 0; i < 13; i++) list.add(topic("").path("topics").path(0));
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, mapper.createObjectNode().set("topics", list)));
    }
    @Test void rejectsZeroDurationAndInvalidEnums() throws Exception {
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, mapper.readTree(topic("").toString().replace("00:20:00", "00:00:00"))));
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, mapper.readTree(topic("").toString().replace("BEGINNER", "MASTER"))));
    }
    @Test void approvalCreatesRecordsAndRetryReturnsSameResult() throws Exception {
        job.setProposal(topic("").toString());
        when(jobs.lockOwned("job-1", "admin")).thenReturn(Optional.of(job));
        when(topics.create(any())).thenReturn(TopicResponse.builder().id("new-topic").build());
        var first = service.save("admin", "job-1");
        var retry = service.save("admin", "job-1");
        assertEquals("SAVED", first.status()); assertEquals(first.result(), retry.result());
        verify(topics, times(1)).create(any()); assertNotNull(job.getSavedAt());
    }
    @Test void draftReviewDoesNotCreateContent() throws Exception {
        when(jobs.lockOwned("job-1", "admin")).thenReturn(Optional.of(job));
        service.review("admin", "job-1", topic(""));
        verify(topics, never()).create(any()); verify(scenes, never()).create(any());
    }
    @Test void cannotEditSavedOrAccessUnownedJobs() throws Exception {
        job.setStatus("SAVED");
        when(jobs.lockOwned("job-1", "admin")).thenReturn(Optional.of(job));
        assertThrows(IllegalArgumentException.class, () -> service.review("admin", "job-1", topic("")));
        assertThrows(jakarta.persistence.EntityNotFoundException.class, () -> service.save("other", "job-1"));
    }
    JsonNode animation(boolean published) throws Exception {
        return mapper.readTree("{\"slug\":\"two-sum-demo\",\"title\":\"Two Sum\",\"category\":\"DSA\",\"source\":\"GENERATED\",\"kind\":\"two-sum\",\"simulatorParams\":{\"nums\":\"2,7\"},\"isPublished\":" + published + "}");
    }
    @Test void rejectsPublishingAndAuthoredScenes() throws Exception {
        job.setKind(Kind.ANIMATION);
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, animation(true)));
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, mapper.readTree(animation(false).toString().replace("GENERATED", "AUTHORED"))));
    }
    @Test void validatesSimulatorAndForcesUnpublishedSave() throws Exception {
        job.setKind(Kind.ANIMATION); job.setProposal(animation(false).toString());
        when(jobs.lockOwned("job-1", "admin")).thenReturn(Optional.of(job));
        when(scenes.simulatorCatalog()).thenReturn(List.of(Map.of("kind", "two-sum", "category", "DSA", "paramSchema", Map.of("nums", Map.of("type", "string")))));
        when(scenes.validate(any())).thenReturn(new AnimationTrace());
        when(scenes.create(any())).thenReturn(AnimationSceneResponse.builder().id("scene-1").isPublished(false).build());
        service.save("admin", "job-1");
        var captured = ArgumentCaptor.forClass(AnimationSceneRequest.class); verify(scenes).create(captured.capture());
        assertEquals(false, captured.getValue().getIsPublished());
    }
    @Test void boundsSimulatorInputsBeforeRunningSimulation() throws Exception {
        job.setKind(Kind.ANIMATION);
        when(scenes.simulatorCatalog()).thenReturn(List.of(Map.of("kind", "two-sum", "category", "DSA", "paramSchema", Map.of("nums", Map.of("type", "string")))));
        JsonNode proposal = mapper.readTree(animation(false).toString().replace("2,7", "1,2,3,4,5,6,7,8,9,10,11,12,13"));
        assertThrows(IllegalArgumentException.class, () -> service.validate(job, proposal));
        verify(scenes, never()).validate(any());
    }
}
