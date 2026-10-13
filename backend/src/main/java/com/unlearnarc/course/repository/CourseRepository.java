package com.unlearnarc.course.repository;

import com.unlearnarc.course.entity.Course;
import com.unlearnarc.course.entity.Course.CourseLevel;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, String> {
    boolean existsByName(String name);

    /**
     * Search by name (case-insensitive substring) with optional level filter.
     * Blank {@code q} matches everything (browse mode). Pushed to the DB so only
     * a bounded page of rows is materialised.
     */
    @Query("""
            SELECT c FROM Course c
            WHERE (:q = '' OR LOWER(c.name) LIKE CONCAT('%', :q, '%'))
              AND (:level IS NULL OR c.level = :level)
            """)
    List<Course> search(@Param("q") String q,
                        @Param("level") CourseLevel level,
                        Pageable pageable);

    @Query("""
            SELECT COUNT(c) FROM Course c
            WHERE (:q = '' OR LOWER(c.name) LIKE CONCAT('%', :q, '%'))
              AND (:level IS NULL OR c.level = :level)
            """)
    long countSearch(@Param("q") String q, @Param("level") CourseLevel level);
}
