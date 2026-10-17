package com.unlearnarc.role.dto;

import com.unlearnarc.course.entity.Course.CourseLevel;
import com.unlearnarc.skill.entity.Skill.SkillLevel;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * A complete learning roadmap for a role:
 *   Role → Domains → Skills → Courses
 *
 * Courses are grouped into ordered "steps" by skill level (BEGINNER → EXPERT)
 * so the UI can render a progressive path. Each course carries a
 * {@code completed} flag computed from the current user's persisted quiz results.
 */
@Data
@Builder
public class RoadmapResponse {

    private String roleId;
    private String roleName;
    private String roleDescription;

    private int totalSkills;
    private int totalCourses;
    private int completedCourses;
    private int progressPercent;

    /** Ordered learning stages (Beginner first). */
    private List<RoadmapStage> stages;

    /** The domains this role spans (for a summary header). */
    private List<Node> domains;

    @Data
    @Builder
    public static class RoadmapStage {
        private SkillLevel level;          // BEGINNER / INTERMEDIATE / ADVANCED / EXPERT
        private int order;                 // 0-based stage order
        private List<SkillNode> skills;
    }

    @Data
    @Builder
    public static class SkillNode {
        private String skillId;
        private String skillName;
        private SkillLevel level;
        private List<CourseNode> courses;
    }

    @Data
    @Builder
    public static class CourseNode {
        private String courseId;
        private String courseName;
        private String imgUrl;
        private CourseLevel level;
        private Integer topicsCount;
        private String totalTime;          // formatted HH:mm:ss
        private boolean completed;         // quiz mastery, not enrollment
        private boolean enrolled;
        private int progressPercent;
        private int completedTopics;
        private Double bestCourseScore;
    }

    @Data
    @Builder
    public static class Node {
        private String id;
        private String name;
    }
}
