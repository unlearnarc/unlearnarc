package com.unlearnarc.enrollment.dto;

import java.util.List;

/** Quiz mastery is independent of enrollment and pool-specific pass settings. */
public record CourseProgressResponse(
        String courseId, boolean enrolled, boolean completed, int progressPercent,
        int totalTopics, int completedTopics, Double bestCourseScore, List<TopicProgress> topics) {
    public record TopicProgress(String topicId, String topicName, boolean completed, Double bestScore) {}
}
