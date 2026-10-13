package com.unlearnarc.mapping.service;

import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.mapping.dto.SkillCourseMappingRequest;
import com.unlearnarc.mapping.dto.SkillCourseMappingResponse;
import com.unlearnarc.mapping.entity.SkillCourseMapping;
import com.unlearnarc.mapping.mapper.MappingMapper;
import com.unlearnarc.mapping.repository.SkillCourseMappingRepository;
import com.unlearnarc.skill.repository.SkillRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SkillCourseMappingService {

    private final SkillCourseMappingRepository repository;
    private final SkillRepository skillRepository;
    private final CourseRepository courseRepository;
    private final MappingMapper mapper;

    public SkillCourseMappingResponse create(SkillCourseMappingRequest request) {
        if (!skillRepository.existsById(request.getSkillId())) {
            throw new EntityNotFoundException("Skill not found: " + request.getSkillId());
        }
        if (!courseRepository.existsById(request.getCourseId())) {
            throw new EntityNotFoundException("Course not found: " + request.getCourseId());
        }
        if (repository.existsBySkillIdAndCourseId(request.getSkillId(), request.getCourseId())) {
            throw new IllegalArgumentException("Mapping already exists for this skill and course");
        }
        SkillCourseMapping mapping = mapper.toEntity(request);
        return mapper.toResponse(repository.save(mapping));
    }

    @Transactional(readOnly = true)
    public List<SkillCourseMappingResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SkillCourseMappingResponse> findBySkillId(String skillId) {
        return repository.findBySkillId(skillId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SkillCourseMappingResponse> findByCourseId(String courseId) {
        return repository.findByCourseId(courseId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SkillCourseMappingResponse findById(String id) {
        return mapper.toResponse(getOrThrow(id));
    }

    public void delete(String id) {
        getOrThrow(id);
        repository.deleteById(id);
    }

    private SkillCourseMapping getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Skill-Course mapping not found: " + id));
    }
}
