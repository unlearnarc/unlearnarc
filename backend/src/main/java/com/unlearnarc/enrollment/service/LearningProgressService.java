package com.unlearnarc.enrollment.service;

import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.enrollment.dto.CourseProgressResponse;
import com.unlearnarc.enrollment.dto.CourseProgressResponse.TopicProgress;
import com.unlearnarc.enrollment.repository.EnrolledCourseRepository;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.entity.TestResult;
import com.unlearnarc.quspool.repository.TestResultRepository;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.topic.repository.TopicRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningProgressService {
    public static final int COMPLETION_THRESHOLD = 65;
    private final TestResultRepository results;
    private final TopicRepository topics;
    private final EnrolledCourseRepository enrollments;
    private final CourseRepository courses;

    public CourseProgressResponse forCourse(String userId, String courseId) {
        if (!courses.existsById(courseId)) throw new EntityNotFoundException("Course not found: " + courseId);
        return forCourses(userId, List.of(courseId)).get(courseId);
    }

    /** One learner-scoped history query, regardless of the number of roadmap courses. */
    public Map<String, CourseProgressResponse> forCourses(String userId, Collection<String> courseIds) {
        Map<String, Double> courseScores = new HashMap<>();
        Map<String, Double> topicScores = new HashMap<>();
        Set<String> enrolled = new HashSet<>();
        if (userId != null && !userId.isBlank()) {
            enrollments.findByUserIdOrderByEnrolledAtDesc(userId).forEach(e -> enrolled.add(e.getCourseId()));
            for (TestResult result : results.findForLearner(userId)) {
                // Use the actual earned/total ratio: rounded 65.00 may still be above 65.
                if (result.getTotalPoints() == null || result.getTotalPoints() <= 0 || result.getEarnedPoints() == null) continue;
                double score = result.getEarnedPoints() * 100.0 / result.getTotalPoints();
                if (result.getEntityType() == ScopeType.COURSE) courseScores.merge(result.getEntityId(), score, Math::max);
                if (result.getEntityType() == ScopeType.TOPIC) topicScores.merge(result.getEntityId(), score, Math::max);
            }
        }
        Map<String, CourseProgressResponse> progress = new HashMap<>();
        for (String courseId : new LinkedHashSet<>(courseIds)) {
            List<Topic> courseTopics = topics.findByCourseIdOrderByTopicOrder(courseId);
            List<TopicProgress> topicProgress = courseTopics.stream().map(topic -> {
                Double score = topicScores.get(topic.getId());
                return new TopicProgress(topic.getId(), topic.getName(), qualifies(score), score);
            }).toList();
            int done = (int) topicProgress.stream().filter(TopicProgress::completed).count();
            Double courseScore = courseScores.get(courseId);
            boolean completed = qualifies(courseScore) || (!courseTopics.isEmpty() && done == courseTopics.size());
            int percent = completed ? 100 : courseTopics.isEmpty() ? 0 : (int) Math.round(done * 100.0 / courseTopics.size());
            progress.put(courseId, new CourseProgressResponse(courseId, enrolled.contains(courseId), completed,
                    percent, courseTopics.size(), done, courseScore, topicProgress));
        }
        return progress;
    }

    private boolean qualifies(Double score) {
        return score != null && score > COMPLETION_THRESHOLD;
    }
}
