package com.unlearnarc.mapping.repository;

import com.unlearnarc.mapping.entity.SkillCourseMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SkillCourseMappingRepository extends JpaRepository<SkillCourseMapping, String> {
    List<SkillCourseMapping> findBySkillId(String skillId);
    List<SkillCourseMapping> findByCourseId(String courseId);
    Optional<SkillCourseMapping> findBySkillIdAndCourseId(String skillId, String courseId);
    boolean existsBySkillIdAndCourseId(String skillId, String courseId);
}
