package com.unlearnarc.studyplan;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;

public final class StudyPlanModels {
    private StudyPlanModels() {}
    public record Preferences(
        @NotEmpty @Size(max = 100) Set<@NotBlank String> domainIds,
        @NotBlank @Pattern(regexp = "PROJECTS|INTERVIEWS|FUNDAMENTALS|CAREER") String goal,
        @NotBlank @Pattern(regexp = "BEGINNER|INTERMEDIATE|ADVANCED") String skillLevel,
        @Min(15) @Max(90) int dailyMinutes,
        @NotEmpty @Size(max = 7) Set<@Min(1) @Max(7) Integer> studyDays,
        @NotBlank @Pattern(regexp = "RECOMMEND|MANUAL|ALL") String courseMode,
        @NotNull @Size(max = 500) Set<@NotBlank String> courseIds,
        @NotBlank @Size(max = 100) String timeZone) {}
    public record DomainOption(String id, String name) {}
    public record CourseOption(String id, String name, String description, String level, Set<String> domainIds, int topics) {}
    public record Catalog(List<DomainOption> domains, List<CourseOption> courses) {}
    public record GenerateRequest(boolean replaceFuture) {}
    public record TaskView(String id, String topicId, String title, String courseName, String taskType,
        String activity, LocalDate scheduledDate, LocalDate originalLearningDate, int revisionInterval,
        int estimatedMinutes, Instant completedAt, boolean available, String href, String noteId) {}
    public record Summary(long completed, long remaining, int revisionCompletionRate, long activeTopics) {}
    public record Dashboard(Preferences preferences, String planId, int generationVersion, LocalDate today,
        List<TaskView> todayTasks, List<TaskView> overdueTasks, List<TaskView> weekTasks,
        List<TaskView> upcomingRevisions, Summary summary) {}
}
