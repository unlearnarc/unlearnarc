package com.unlearnarc.role.service;

import com.unlearnarc.course.entity.Course;
import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.domain.entity.Domain;
import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.enrollment.service.LearningProgressService;
import com.unlearnarc.enrollment.dto.CourseProgressResponse;
import com.unlearnarc.mapping.repository.DomainSkillMappingRepository;
import com.unlearnarc.mapping.repository.SkillCourseMappingRepository;
import com.unlearnarc.role.dto.RoadmapResponse;
import com.unlearnarc.role.dto.RoadmapResponse.*;
import com.unlearnarc.role.entity.Role;
import com.unlearnarc.role.repository.RoleDomainMappingRepository;
import com.unlearnarc.role.repository.RoleRepository;
import com.unlearnarc.role.repository.RoleSkillMappingRepository;
import com.unlearnarc.skill.entity.Skill;
import com.unlearnarc.skill.entity.Skill.SkillLevel;
import com.unlearnarc.skill.repository.SkillRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Builds a learning roadmap for a role by walking the existing graph:
 *
 *   Role ──┬─ role_domain_mapping ─ Domain ─ domain_skill_mapping ─┐
 *          └─ role_skill_mapping ──────────────────────────────────┴─ Skill
 *                                                 Skill ─ skill_course_mapping ─ Course
 *
 * Skills (and thus their courses) are grouped into ordered stages by
 * {@link SkillLevel} so the learner progresses BEGINNER → EXPERT. Course
 * completion is derived from the caller's persisted quiz results.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoadmapService {

    private final RoleRepository roleRepository;
    private final RoleDomainMappingRepository roleDomainRepo;
    private final RoleSkillMappingRepository roleSkillRepo;
    private final DomainSkillMappingRepository domainSkillRepo;
    private final SkillCourseMappingRepository skillCourseRepo;
    private final DomainRepository domainRepository;
    private final SkillRepository skillRepository;
    private final CourseRepository courseRepository;
    private final LearningProgressService progressService;

    /** Stage ordering: lower levels come first in the roadmap. */
    private static final List<SkillLevel> LEVEL_ORDER = List.of(
            SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED, SkillLevel.EXPERT);

    /**
     * @param roleId the target role
     * @param userId current user (nullable) — used only to flag completed courses
     */
    public RoadmapResponse build(String roleId, String userId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleId));

        // 1. Collect domains for this role.
        List<String> domainIds = roleDomainRepo.findByRoleId(roleId).stream()
                .map(m -> m.getDomainId())
                .distinct()
                .toList();

        // 2. Resolve skill ids: domain-derived + directly-mapped.
        Set<String> skillIds = new LinkedHashSet<>();
        for (String domainId : domainIds) {
            domainSkillRepo.findByDomainId(domainId)
                    .forEach(m -> skillIds.add(m.getSkillId()));
        }
        roleSkillRepo.findByRoleId(roleId).forEach(m -> skillIds.add(m.getSkillId()));

        // 3. Load skills (filter out dangling ids) and courses per skill.
        List<Skill> skills = skillIds.isEmpty()
                ? List.of()
                : skillRepository.findAllById(skillIds);

        Set<String> roadmapCourseIds = new LinkedHashSet<>();
        for (Skill skill : skills) {
            skillCourseRepo.findBySkillId(skill.getId()).forEach(m -> roadmapCourseIds.add(m.getCourseId()));
        }
        Map<String, CourseProgressResponse> progressByCourse = progressService.forCourses(userId, roadmapCourseIds);

        // Build SkillNode list, de-duplicating courses within a skill.
        List<SkillNode> skillNodes = new ArrayList<>();
        int totalCourses = 0;
        int completedCourses = 0;
        Set<String> seenCourseIds = new HashSet<>(); // de-dup across skills for counts

        for (Skill skill : skills) {
            List<String> courseIds = skillCourseRepo.findBySkillId(skill.getId()).stream()
                    .map(m -> m.getCourseId())
                    .distinct()
                    .toList();
            List<Course> courses = courseIds.isEmpty()
                    ? List.of()
                    : courseRepository.findAllById(courseIds);

            List<CourseNode> courseNodes = new ArrayList<>();
            for (Course c : courses) {
                CourseProgressResponse progress = progressByCourse.get(c.getId());
                boolean done = progress.completed();
                courseNodes.add(CourseNode.builder()
                        .courseId(c.getId())
                        .courseName(c.getName())
                        .imgUrl(c.getImgUrl())
                        .level(c.getLevel())
                        .topicsCount(progress.totalTopics())
                        .enrolled(progress.enrolled())
                        .progressPercent(progress.progressPercent())
                        .completedTopics(progress.completedTopics())
                        .bestCourseScore(progress.bestCourseScore())
                        .totalTime(c.getTotalTime() == null ? null : c.getTotalTime().toString())
                        .completed(done)
                        .build());
                if (seenCourseIds.add(c.getId())) {
                    totalCourses++;
                    if (done) completedCourses++;
                }
            }

            skillNodes.add(SkillNode.builder()
                    .skillId(skill.getId())
                    .skillName(skill.getName())
                    .level(skill.getLevel())
                    .courses(courseNodes)
                    .build());
        }

        // 4. Group skills into ordered stages by level.
        Map<SkillLevel, List<SkillNode>> byLevel = skillNodes.stream()
                .collect(Collectors.groupingBy(SkillNode::getLevel));

        List<RoadmapStage> stages = new ArrayList<>();
        int order = 0;
        for (SkillLevel level : LEVEL_ORDER) {
            List<SkillNode> group = byLevel.get(level);
            if (group == null || group.isEmpty()) continue;
            group.sort(Comparator.comparing(SkillNode::getSkillName, String.CASE_INSENSITIVE_ORDER));
            stages.add(RoadmapStage.builder()
                    .level(level)
                    .order(order++)
                    .skills(group)
                    .build());
        }

        // 5. Domain summary nodes.
        List<Node> domainNodes = domainIds.isEmpty()
                ? List.of()
                : domainRepository.findAllById(domainIds).stream()
                    .map(d -> Node.builder().id(d.getId()).name(d.getName()).build())
                    .sorted(Comparator.comparing(Node::getName, String.CASE_INSENSITIVE_ORDER))
                    .toList();

        int progress = totalCourses == 0 ? 0 : (int) Math.round(100.0 * completedCourses / totalCourses);

        return RoadmapResponse.builder()
                .roleId(role.getId())
                .roleName(role.getName())
                .roleDescription(role.getDescription())
                .totalSkills(skillNodes.size())
                .totalCourses(totalCourses)
                .completedCourses(completedCourses)
                .progressPercent(progress)
                .stages(stages)
                .domains(domainNodes)
                .build();
    }
}
