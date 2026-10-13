package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.CoursePoolMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CoursePoolMappingRepository extends JpaRepository<CoursePoolMapping, String> {

    List<CoursePoolMapping> findByCourseId(String courseId);

    List<CoursePoolMapping> findByPoolId(String poolId);

    Optional<CoursePoolMapping> findByCourseIdAndPoolId(String courseId, String poolId);

    boolean existsByCourseIdAndPoolId(String courseId, String poolId);

    void deleteByPoolId(String poolId);
}
