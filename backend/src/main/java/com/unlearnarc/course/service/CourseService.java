package com.unlearnarc.course.service;

import com.unlearnarc.course.dto.CourseRequest;
import com.unlearnarc.course.dto.CourseResponse;
import com.unlearnarc.course.entity.Course;
import com.unlearnarc.course.mapper.CourseMapper;
import com.unlearnarc.course.repository.CourseRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CourseService {

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;

    public CourseResponse create(CourseRequest request) {
        if (courseRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Course already exists: " + request.getName());
        }
        Course course = courseMapper.toEntity(request);
        return courseMapper.toResponse(courseRepository.save(course));
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> findAll() {
        return courseRepository.findAll().stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseResponse findById(String id) {
        return courseMapper.toResponse(getOrThrow(id));
    }

    public CourseResponse update(String id, CourseRequest request) {
        Course course = getOrThrow(id);
        courseMapper.updateEntity(request, course);
        return courseMapper.toResponse(courseRepository.save(course));
    }

    public void delete(String id) {
        getOrThrow(id);
        courseRepository.deleteById(id);
    }

    private Course getOrThrow(String id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found: " + id));
    }
}
