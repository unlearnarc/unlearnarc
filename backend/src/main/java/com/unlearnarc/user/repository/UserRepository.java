package com.unlearnarc.user.repository;

import com.unlearnarc.user.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByProfileShareTokenAndIsActiveTrue(String profileShareToken);

    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :userId")
    Optional<User> lockForContestScoring(@Param("userId") String userId);

    // ── Global leaderboard (highest points first; tie-break alphabetical) ──
    @Query("""
            SELECT u FROM User u
            WHERE u.points > 0 AND u.isActive = true
            ORDER BY u.points DESC, u.name ASC
            """)
    List<User> findGlobalLeaderboard(Pageable pageable);

    // ── Region leaderboard ──
    @Query("""
            SELECT u FROM User u
            WHERE u.region = :region AND u.points > 0 AND u.isActive = true
            ORDER BY u.points DESC, u.name ASC
            """)
    List<User> findRegionLeaderboard(@Param("region") String region, Pageable pageable);

    // Distinct regions that actually have scored users (powers the region picker).
    @Query("""
            SELECT DISTINCT u.region FROM User u
            WHERE u.region IS NOT NULL AND u.region <> '' AND u.points > 0 AND u.isActive = true
            ORDER BY u.region ASC
            """)
    List<String> findActiveRegions();

    // How many active users have strictly MORE points than the given user
    // (used to compute a live 1-based global rank: result + 1).
    @Query("""
            SELECT COUNT(u) FROM User u
            WHERE u.isActive = true AND u.points > :points
            """)
    long countWithMorePoints(@Param("points") long points);

    // ── Atomic increment used on quiz/contest scoring (no read-modify-write race) ──
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE User u SET u.points = COALESCE(u.points, 0) + :delta WHERE u.id = :userId")
    int incrementPoints(@Param("userId") String userId, @Param("delta") long delta);

    // ── Source-of-truth totals for the nightly self-heal recompute ──
    // Sum of per-attempt earned points for every user (quizzes/tests).
    @Query("""
            SELECT a.userId AS userId, COALESCE(SUM(r.earnedPoints), 0) AS total
            FROM UserTestAttempt a, TestResult r
            WHERE r.id = a.testId
            GROUP BY a.userId
            """)
    List<PointsAgg> aggregateQuizPoints();

    // Sum of contest totals for every user.
    @Query("""
            SELECT p.userId AS userId, COALESCE(SUM(p.totalScore), 0) AS total
            FROM ContestParticipant p
            GROUP BY p.userId
            """)
    List<PointsAgg> aggregateContestPoints();

    interface PointsAgg {
        String getUserId();
        Long getTotal();
    }
}
