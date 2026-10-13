package com.unlearnarc.contest.repository;

import com.unlearnarc.contest.entity.Contest;
import com.unlearnarc.contest.entity.Contest.ContestStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContestRepository extends JpaRepository<Contest, String> {

    @Query("""
            SELECT c FROM Contest c
            WHERE (:q = '' OR LOWER(c.title)       LIKE CONCAT('%', :q, '%')
                           OR LOWER(c.slug)        LIKE CONCAT('%', :q, '%')
                           OR LOWER(c.description) LIKE CONCAT('%', :q, '%'))
              AND (:status IS NULL OR c.status = :status)
            """)
    List<Contest> search(@Param("q") String q,
                        @Param("status") ContestStatus status,
                        Pageable pageable);

    @Query("""
            SELECT COUNT(c) FROM Contest c
            WHERE (:q = '' OR LOWER(c.title)       LIKE CONCAT('%', :q, '%')
                           OR LOWER(c.slug)        LIKE CONCAT('%', :q, '%')
                           OR LOWER(c.description) LIKE CONCAT('%', :q, '%'))
              AND (:status IS NULL OR c.status = :status)
            """)
    long countSearch(@Param("q") String q, @Param("status") ContestStatus status);

    Optional<Contest> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Contest> findByStatusOrderByStartTimeDesc(ContestStatus status);

    List<Contest> findAllByOrderByCreatedAtDesc();
}
