package com.unlearnarc.topic.repository;

import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.topic.entity.Topic.TopicLevel;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TopicRepository extends JpaRepository<Topic, String> {
    List<Topic> findByCourseIdOrderByTopicOrder(String courseId);
    boolean existsByNameAndCourseId(String name, String courseId);

    @Query("""
            SELECT t FROM Topic t
            WHERE (:q = '' OR LOWER(t.name) LIKE CONCAT('%', :q, '%'))
              AND (:level IS NULL OR t.level = :level)
              AND (:courseId IS NULL OR t.courseId = :courseId)
            """)
    List<Topic> search(@Param("q") String q,
                       @Param("level") TopicLevel level,
                       @Param("courseId") String courseId,
                       Pageable pageable);

    @Query("""
            SELECT COUNT(t) FROM Topic t
            WHERE (:q = '' OR LOWER(t.name) LIKE CONCAT('%', :q, '%'))
              AND (:level IS NULL OR t.level = :level)
              AND (:courseId IS NULL OR t.courseId = :courseId)
            """)
    long countSearch(@Param("q") String q,
                     @Param("level") TopicLevel level,
                     @Param("courseId") String courseId);
}
