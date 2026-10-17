package com.unlearnarc.enrollment;

import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.enrollment.entity.EnrolledCourse;
import com.unlearnarc.enrollment.repository.EnrolledCourseRepository;
import com.unlearnarc.enrollment.service.LearningProgressService;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.entity.TestResult;
import com.unlearnarc.quspool.repository.TestResultRepository;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.topic.repository.TopicRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class LearningProgressServiceTest {
    TestResultRepository results = mock(TestResultRepository.class);
    TopicRepository topics = mock(TopicRepository.class);
    EnrolledCourseRepository enrollments = mock(EnrolledCourseRepository.class);
    CourseRepository courses = mock(CourseRepository.class);
    LearningProgressService service = new LearningProgressService(results, topics, enrollments, courses);

    @BeforeEach void setup() {
        when(topics.findByCourseIdOrderByTopicOrder("course")).thenReturn(List.of(topic("one"), topic("two")));
        when(enrollments.findByUserIdOrderByEnrolledAtDesc("user")).thenReturn(List.of(
                EnrolledCourse.builder().userId("user").courseId("course").build()));
    }

    @Test void enrollmentAndExactly65DoNotCompleteCourse() {
        when(results.findForLearner("user")).thenReturn(List.of(result(ScopeType.COURSE, "course", 65, 100)));
        var progress = service.forCourses("user", List.of("course")).get("course");
        assertThat(progress.enrolled()).isTrue();
        assertThat(progress.completed()).isFalse();
        assertThat(progress.progressPercent()).isZero();
    }

    @Test void courseQuizAbove65CompletesWithoutMarkingUnattemptedTopics() {
        when(results.findForLearner("user")).thenReturn(List.of(result(ScopeType.COURSE, "course", 66, 100)));
        var progress = service.forCourses("user", List.of("course")).get("course");
        assertThat(progress.completed()).isTrue();
        assertThat(progress.completedTopics()).isZero();
        assertThat(progress.progressPercent()).isEqualTo(100);
    }

    @Test void allTopicsCompleteCourseAndLaterFailuresDoNotEraseMastery() {
        when(results.findForLearner("user")).thenReturn(List.of(
                result(ScopeType.TOPIC, "one", 70, 100), result(ScopeType.TOPIC, "one", 20, 100),
                result(ScopeType.TOPIC, "two", 80, 100)));
        var progress = service.forCourses("user", List.of("course")).get("course");
        assertThat(progress.completed()).isTrue();
        assertThat(progress.completedTopics()).isEqualTo(2);
    }

    @Test void partialTopicsAndUnrelatedScopesDoNotCompleteCourse() {
        when(results.findForLearner("user")).thenReturn(List.of(
                result(ScopeType.TOPIC, "one", 70, 100), result(ScopeType.TOPIC, "two", 65, 100),
                result(ScopeType.DOMAIN, "course", 100, 100), result(ScopeType.COURSE, "other", 100, 100)));
        var progress = service.forCourses("user", List.of("course")).get("course");
        assertThat(progress.completed()).isFalse();
        assertThat(progress.progressPercent()).isEqualTo(50);
    }

    @Test void anonymousAndEmptyCoursesNeverAutoComplete() {
        when(topics.findByCourseIdOrderByTopicOrder("empty")).thenReturn(List.of());
        var progress = service.forCourses(null, List.of("empty")).get("empty");
        assertThat(progress.completed()).isFalse();
        assertThat(progress.enrolled()).isFalse();
        verifyNoInteractions(results, enrollments);
    }

    @Test void zeroPointAttemptsDoNotCount() {
        when(results.findForLearner("user")).thenReturn(List.of(result(ScopeType.COURSE, "course", 0, 0)));
        assertThat(service.forCourses("user", List.of("course")).get("course").completed()).isFalse();
    }

    private Topic topic(String id) { return Topic.builder().id(id).name(id).courseId("course").build(); }
    private TestResult result(ScopeType scope, String id, int earned, int total) {
        return TestResult.builder().entityType(scope).entityId(id).earnedPoints(earned).totalPoints(total).build();
    }
}
