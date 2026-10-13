package com.unlearnarc.algoviz.repository;

import com.unlearnarc.algoviz.entity.Algorithm;
import com.unlearnarc.algoviz.entity.Algorithm.Difficulty;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AlgorithmRepository extends JpaRepository<Algorithm, String> {
    Optional<Algorithm> findBySlug(String slug);
    boolean existsBySlug(String slug);
    List<Algorithm> findByIsPublishedTrue();

    /**
     * Relevance search over title / slug / summary / category.
     * {@code onlyPublished} gates unpublished algorithms (students pass true,
     * admins may pass false). {@code difficulty} is an optional filter.
     */
    @Query("""
            SELECT a FROM Algorithm a
            WHERE (:q = '' OR LOWER(a.title)    LIKE CONCAT('%', :q, '%')
                           OR LOWER(a.slug)     LIKE CONCAT('%', :q, '%')
                           OR LOWER(a.summary)  LIKE CONCAT('%', :q, '%')
                           OR LOWER(a.category) LIKE CONCAT('%', :q, '%'))
              AND (:difficulty IS NULL OR a.difficulty = :difficulty)
              AND (:onlyPublished = false OR a.isPublished = true)
            """)
    List<Algorithm> search(@Param("q") String q,
                           @Param("difficulty") Difficulty difficulty,
                           @Param("onlyPublished") boolean onlyPublished,
                           Pageable pageable);
}
