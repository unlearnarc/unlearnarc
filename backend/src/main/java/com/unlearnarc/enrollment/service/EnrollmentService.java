package com.unlearnarc.enrollment.service;

import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.enrollment.dto.EnrolledCourseResponse;
import com.unlearnarc.enrollment.entity.EnrolledCourse;
import com.unlearnarc.enrollment.repository.EnrolledCourseRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Manages a learner's "my learnings" — the courses they have started.
 * Enrollment is idempotent: starting an already-started course returns the
 * existing row rather than failing.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class EnrollmentService {

    private final EnrolledCourseRepository repository;
    private final CourseRepository courseRepository;

    /** Start learning a course for the given user. Idempotent. */
    public EnrolledCourseResponse enroll(String userId, String courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new EntityNotFoundException("Course not found: " + courseId);
        }
        EnrolledCourse mapping = repository.findByUserIdAndCourseId(userId, courseId)
                .orElseGet(() -> repository.save(
                        EnrolledCourse.builder()
                                .userId(userId)
                                .courseId(courseId)
                                .build()));
        return toResponse(mapping);
    }

    /** Stop learning a course (removes it from "my learnings"). */
    public void unenroll(String userId, String courseId) {
        repository.deleteByUserIdAndCourseId(userId, courseId);
    }

    @Transactional(readOnly = true)
    public List<EnrolledCourseResponse> findMine(String userId) {
        return repository.findByUserIdOrderByEnrolledAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isEnrolled(String userId, String courseId) {
        return repository.existsByUserIdAndCourseId(userId, courseId);
    }

    private EnrolledCourseResponse toResponse(EnrolledCourse e) {
        return EnrolledCourseResponse.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .courseId(e.getCourseId())
                .enrolledAt(e.getEnrolledAt())
                .build();
    }
}
