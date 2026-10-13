package com.unlearnarc.contest.repository;

import com.unlearnarc.contest.entity.ContestProblem;
import com.unlearnarc.contest.entity.ContestProblem.Difficulty;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContestProblemRepository extends JpaRepository<ContestProblem, String> {

    List<ContestProblem> findByContestIdOrderByDisplayOrder(String contestId);

    List<ContestProblem> findByContestIdAndIsActiveTrueOrderByDisplayOrder(String contestId);

    long countByContestId(String contestId);

    /**
     * Relevance search over problem title / statement / constraints, restricted
     * to active problems. {@code difficulty} is an optional filter.
     */
    @Query("""
            SELECT p FROM ContestProblem p
            WHERE p.isActive = true
              AND (:q = '' OR LOWER(p.title)       LIKE CONCAT('%', :q, '%')
                           OR LOWER(p.statement)   LIKE CONCAT('%', :q, '%')
                           OR LOWER(p.constraints) LIKE CONCAT('%', :q, '%'))
              AND (:difficulty IS NULL OR p.difficulty = :difficulty)
            """)
    List<ContestProblem> search(@Param("q") String q,
                                @Param("difficulty") Difficulty difficulty,
                                Pageable pageable);
}
