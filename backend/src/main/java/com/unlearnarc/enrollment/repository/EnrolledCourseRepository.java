package com.unlearnarc.enrollment.repository;

import com.unlearnarc.enrollment.entity.EnrolledCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrolledCourseRepository extends JpaRepository<EnrolledCourse, String> {
    List<EnrolledCourse> findByUserIdOrderByEnrolledAtDesc(String userId);
    Optional<EnrolledCourse> findByUserIdAndCourseId(String userId, String courseId);
    boolean existsByUserIdAndCourseId(String userId, String courseId);
    void deleteByUserIdAndCourseId(String userId, String courseId);
}
