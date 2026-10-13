package com.unlearnarc.interview.repository;

import com.unlearnarc.interview.entity.InterviewExperience;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewExperienceRepository extends JpaRepository<InterviewExperience, String> {

    // ── global-search queries ──────────────────────────────────────────────────

    /**
     * Full-text-ish search across company, role, city and the experience body.
     * {@code verifiedOnly=true} restricts to the public (moderated) feed.
     * {@code company} is an optional exact-ish filter (case-insensitive).
     */
    @Query("""
            SELECT e FROM InterviewExperience e
            WHERE (:verifiedOnly = false OR e.isVerified = true)
              AND (:company IS NULL OR LOWER(e.company) = LOWER(:company))
              AND (:q = '' OR LOWER(e.company)    LIKE CONCAT('%', :q, '%')
                           OR LOWER(e.role)       LIKE CONCAT('%', :q, '%')
                           OR LOWER(e.city)       LIKE CONCAT('%', :q, '%')
                           OR LOWER(e.experience) LIKE CONCAT('%', :q, '%'))
            """)
    List<InterviewExperience> search(@Param("q") String q,
                                     @Param("company") String company,
                                     @Param("verifiedOnly") boolean verifiedOnly,
                                     Pageable pageable);

    @Query("""
            SELECT COUNT(e) FROM InterviewExperience e
            WHERE (:verifiedOnly = false OR e.isVerified = true)
              AND (:company IS NULL OR LOWER(e.company) = LOWER(:company))
              AND (:q = '' OR LOWER(e.company)    LIKE CONCAT('%', :q, '%')
                           OR LOWER(e.role)       LIKE CONCAT('%', :q, '%')
                           OR LOWER(e.city)       LIKE CONCAT('%', :q, '%')
                           OR LOWER(e.experience) LIKE CONCAT('%', :q, '%'))
            """)
    long countSearch(@Param("q") String q,
                     @Param("company") String company,
                     @Param("verifiedOnly") boolean verifiedOnly);

    /** Distinct companies (verified feed) that match the query — powers the COMPANY virtual type. */
    @Query("""
            SELECT DISTINCT e.company FROM InterviewExperience e
            WHERE (:verifiedOnly = false OR e.isVerified = true)
              AND (:q = '' OR LOWER(e.company) LIKE CONCAT('%', :q, '%'))
            ORDER BY e.company ASC
            """)
    List<String> searchCompanies(@Param("q") String q,
                                 @Param("verifiedOnly") boolean verifiedOnly);

    List<InterviewExperience> findAllByOrderByCreatedAtDesc();

    List<InterviewExperience> findByUserIdOrderByCreatedAtDesc(String userId);

    List<InterviewExperience> findByCompanyIgnoreCaseOrderByCreatedAtDesc(String company);

    // ── moderation-aware queries ─────────────────────────────────────────────

    /** Public feed: only verified posts. */
    List<InterviewExperience> findByIsVerifiedTrueOrderByCreatedAtDesc();

    /** Public feed, filtered by company: only verified posts. */
    List<InterviewExperience> findByIsVerifiedTrueAndCompanyIgnoreCaseOrderByCreatedAtDesc(String company);

    /** Admin moderation queue: filter by verified flag. */
    List<InterviewExperience> findByIsVerifiedOrderByCreatedAtDesc(Boolean isVerified);
}
