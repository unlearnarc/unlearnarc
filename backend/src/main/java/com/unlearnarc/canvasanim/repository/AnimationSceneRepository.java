package com.unlearnarc.canvasanim.repository;

import com.unlearnarc.canvasanim.entity.AnimationScene;
import com.unlearnarc.canvasanim.entity.AnimationScene.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AnimationSceneRepository extends JpaRepository<AnimationScene, String> {

    Optional<AnimationScene> findBySlug(String slug);
    boolean existsBySlug(String slug);
    List<AnimationScene> findByIsPublishedTrue();

    /**
     * Catalog query with optional category filter and published gating.
     * {@code onlyPublished} gates drafts (students pass true, admins may pass false).
     */
    @Query("""
            SELECT s FROM AnimationScene s
            WHERE (:category IS NULL OR s.category = :category)
              AND (:onlyPublished = false OR s.isPublished = true)
            ORDER BY s.updatedAt DESC
            """)
    List<AnimationScene> catalog(@Param("category") Category category,
                                 @Param("onlyPublished") boolean onlyPublished);
}
