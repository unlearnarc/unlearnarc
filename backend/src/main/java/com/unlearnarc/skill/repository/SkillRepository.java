package com.unlearnarc.skill.repository;

import com.unlearnarc.skill.entity.Skill;
import com.unlearnarc.skill.entity.Skill.SkillLevel;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String> {
    boolean existsByNameAndLevel(String name, Skill.SkillLevel level);

    @Query("""
            SELECT s FROM Skill s
            WHERE (:q = '' OR LOWER(s.name) LIKE CONCAT('%', :q, '%'))
              AND (:level IS NULL OR s.level = :level)
            """)
    List<Skill> search(@Param("q") String q,
                      @Param("level") SkillLevel level,
                      Pageable pageable);

    @Query("""
            SELECT COUNT(s) FROM Skill s
            WHERE (:q = '' OR LOWER(s.name) LIKE CONCAT('%', :q, '%'))
              AND (:level IS NULL OR s.level = :level)
            """)
    long countSearch(@Param("q") String q, @Param("level") SkillLevel level);
}
