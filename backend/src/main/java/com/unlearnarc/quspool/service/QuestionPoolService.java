package com.unlearnarc.quspool.service;

import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.topic.repository.TopicRepository;
import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.entity.*;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class QuestionPoolService {

    private final QuestionPoolRepository     poolRepo;
    private final QuestionRepository         questionRepo;
    private final DomainPoolMappingRepository domainPoolRepo;
    private final CoursePoolMappingRepository coursePoolRepo;
    private final TopicPoolMappingRepository  topicPoolRepo;
    private final DomainRepository           domainRepo;
    private final CourseRepository           courseRepo;
    private final TopicRepository            topicRepo;
    // Needed to walk the domain → skill → course hierarchy for the aggregated
    // "pools available for this scope" readiness lookups.
    private final com.unlearnarc.mapping.repository.DomainSkillMappingRepository domainSkillRepo;
    private final com.unlearnarc.mapping.repository.SkillCourseMappingRepository skillCourseRepo;

    // ── CRUD ───────────────────────────────────────────────────────────────────

    public QuestionPoolResponse create(QuestionPoolRequest req) {
        validateDistribution(req);
        QuestionPool pool = QuestionPool.builder()
                .name(req.getName())
                .description(req.getDescription())
                .scopeType(req.getScopeType())
                .totalQuestions(req.getTotalQuestions())
                .easyCount(req.getEasyCount())
                .mediumCount(req.getMediumCount())
                .hardCount(req.getHardCount())
                .passPercentage(req.getPassPercentage())
                .timeLimitMinutes(req.getTimeLimitMinutes())
                .build();
        return toResponse(poolRepo.save(pool));
    }

    @Transactional(readOnly = true)
    public List<QuestionPoolResponse> findAll() {
        return poolRepo.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<QuestionPoolResponse> findByScopeType(ScopeType scopeType) {
        return poolRepo.findByScopeType(scopeType).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public QuestionPoolResponse findById(String id) {
        return toResponse(getPoolOrThrow(id));
    }

    public QuestionPoolResponse update(String id, QuestionPoolRequest req) {
        validateDistribution(req);
        QuestionPool pool = getPoolOrThrow(id);
        pool.setName(req.getName());
        pool.setDescription(req.getDescription());
        pool.setScopeType(req.getScopeType());
        pool.setTotalQuestions(req.getTotalQuestions());
        pool.setEasyCount(req.getEasyCount());
        pool.setMediumCount(req.getMediumCount());
        pool.setHardCount(req.getHardCount());
        pool.setPassPercentage(req.getPassPercentage());
        pool.setTimeLimitMinutes(req.getTimeLimitMinutes());
        return toResponse(poolRepo.save(pool));
    }

    public void delete(String id) {
        getPoolOrThrow(id);
        // Remove all scope mappings first
        domainPoolRepo.deleteByPoolId(id);
        coursePoolRepo.deleteByPoolId(id);
        topicPoolRepo.deleteByPoolId(id);
        poolRepo.deleteById(id);
    }

    public void toggleActive(String id) {
        QuestionPool pool = getPoolOrThrow(id);
        pool.setIsActive(!pool.getIsActive());
        poolRepo.save(pool);
    }

    // ── Pool ↔ Scope mappings ──────────────────────────────────────────────────

    public void mapToEntity(PoolMappingRequest req) {
        String poolId = req.getPoolId();
        QuestionPool pool = getPoolOrThrow(poolId);

        switch (pool.getScopeType()) {
            case DOMAIN -> {
                if (req.getDomainId() == null) throw new IllegalArgumentException("domainId required for DOMAIN scope pool");
                if (!domainRepo.existsById(req.getDomainId()))
                    throw new EntityNotFoundException("Domain not found: " + req.getDomainId());
                if (domainPoolRepo.existsByDomainIdAndPoolId(req.getDomainId(), poolId))
                    throw new IllegalArgumentException("This pool is already mapped to the domain");
                domainPoolRepo.save(DomainPoolMapping.builder()
                        .domainId(req.getDomainId()).poolId(poolId).build());
            }
            case COURSE -> {
                if (req.getCourseId() == null) throw new IllegalArgumentException("courseId required for COURSE scope pool");
                if (!courseRepo.existsById(req.getCourseId()))
                    throw new EntityNotFoundException("Course not found: " + req.getCourseId());
                if (coursePoolRepo.existsByCourseIdAndPoolId(req.getCourseId(), poolId))
                    throw new IllegalArgumentException("This pool is already mapped to the course");
                coursePoolRepo.save(CoursePoolMapping.builder()
                        .courseId(req.getCourseId()).poolId(poolId).build());
            }
            case TOPIC -> {
                if (req.getTopicId() == null) throw new IllegalArgumentException("topicId required for TOPIC scope pool");
                if (!topicRepo.existsById(req.getTopicId()))
                    throw new EntityNotFoundException("Topic not found: " + req.getTopicId());
                if (topicPoolRepo.existsByTopicIdAndPoolId(req.getTopicId(), poolId))
                    throw new IllegalArgumentException("This pool is already mapped to the topic");
                topicPoolRepo.save(TopicPoolMapping.builder()
                        .topicId(req.getTopicId()).poolId(poolId).build());
            }
        }
    }

    /**
     * Pools available for a DOMAIN test — the domain's own pools PLUS every pool
     * beneath it (each skill's courses, and those courses' topics). This mirrors
     * the union the test engine actually draws from, so the "N tests available"
     * readiness hint stays truthful even when questions live only at a lower level.
     */
    @Transactional(readOnly = true)
    public List<QuestionPoolResponse> findPoolsByDomain(String domainId) {
        return toResponsesInOrder(poolIdsForDomain(domainId));
    }

    /**
     * Pools available for a COURSE test — the course's own pools PLUS every pool
     * under each of its topics. Lets a course that only has topic-level questions
     * still surface a "Take course test" button and generate a quiz.
     */
    @Transactional(readOnly = true)
    public List<QuestionPoolResponse> findPoolsByCourse(String courseId) {
        return toResponsesInOrder(poolIdsForCourse(courseId));
    }

    /** Pools available for a TOPIC test — the topic's own pools (leaf of the tree). */
    @Transactional(readOnly = true)
    public List<QuestionPoolResponse> findPoolsByTopic(String topicId) {
        return toResponsesInOrder(poolIdsForTopic(topicId));
    }

    // ── Hierarchy-aware pool resolution (shared by the test engine's union) ──────

    /** Pool ids directly mapped to a topic (leaf scope). */
    private List<String> poolIdsForTopic(String topicId) {
        return topicPoolRepo.findByTopicId(topicId).stream()
                .map(TopicPoolMapping::getPoolId)
                .toList();
    }

    /** Course's own pools + every pool under each of its topics (own-first, de-duped). */
    private List<String> poolIdsForCourse(String courseId) {
        java.util.LinkedHashSet<String> ids = new java.util.LinkedHashSet<>();
        coursePoolRepo.findByCourseId(courseId).forEach(m -> ids.add(m.getPoolId()));
        topicRepo.findByCourseIdOrderByTopicOrder(courseId)
                .forEach(t -> ids.addAll(poolIdsForTopic(t.getId())));
        return new java.util.ArrayList<>(ids);
    }

    /** Domain's own pools + every course (and their topics') pools beneath it. */
    private List<String> poolIdsForDomain(String domainId) {
        java.util.LinkedHashSet<String> ids = new java.util.LinkedHashSet<>();
        domainPoolRepo.findByDomainId(domainId).forEach(m -> ids.add(m.getPoolId()));
        domainSkillRepo.findByDomainId(domainId).forEach(ds ->
                skillCourseRepo.findBySkillId(ds.getSkillId()).forEach(sc ->
                        ids.addAll(poolIdsForCourse(sc.getCourseId()))));
        return new java.util.ArrayList<>(ids);
    }

    /** Map pool ids → active pool responses, preserving order and dropping inactive. */
    private List<QuestionPoolResponse> toResponsesInOrder(List<String> poolIds) {
        return poolIds.stream()
                .map(this::getPoolOrThrow)
                .filter(QuestionPool::getIsActive)
                .map(this::toResponse)
                .toList();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void validateDistribution(QuestionPoolRequest req) {
        int sum = req.getEasyCount() + req.getMediumCount() + req.getHardCount();
        if (sum != req.getTotalQuestions()) {
            throw new IllegalArgumentException(
                    "easyCount(%d) + mediumCount(%d) + hardCount(%d) = %d must equal totalQuestions(%d)"
                    .formatted(req.getEasyCount(), req.getMediumCount(), req.getHardCount(), sum, req.getTotalQuestions()));
        }
    }

    public QuestionPool getPoolOrThrow(String id) {
        return poolRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("QuestionPool not found: " + id));
    }

    private QuestionPoolResponse toResponse(QuestionPool pool) {
        return QuestionPoolResponse.builder()
                .id(pool.getId())
                .name(pool.getName())
                .description(pool.getDescription())
                .scopeType(pool.getScopeType())
                .totalQuestions(pool.getTotalQuestions())
                .easyCount(pool.getEasyCount())
                .mediumCount(pool.getMediumCount())
                .hardCount(pool.getHardCount())
                .passPercentage(pool.getPassPercentage())
                .timeLimitMinutes(pool.getTimeLimitMinutes())
                .isActive(pool.getIsActive())
                .createdAt(pool.getCreatedAt())
                .activeQuestionCount(questionRepo.countByPoolIdAndIsActiveTrue(pool.getId()))
                .easyAvailable(questionRepo.countByPoolIdAndDifficultyAndIsActiveTrue(pool.getId(), com.unlearnarc.quspool.entity.Question.Difficulty.EASY))
                .mediumAvailable(questionRepo.countByPoolIdAndDifficultyAndIsActiveTrue(pool.getId(), com.unlearnarc.quspool.entity.Question.Difficulty.MEDIUM))
                .hardAvailable(questionRepo.countByPoolIdAndDifficultyAndIsActiveTrue(pool.getId(), com.unlearnarc.quspool.entity.Question.Difficulty.HARD))
                .build();
    }
}
