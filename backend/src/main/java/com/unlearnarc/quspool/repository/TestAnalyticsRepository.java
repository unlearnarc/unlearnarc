package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Read-only analytics queries over the persisted test history.
 *
 * Deliberately separate from {@link TestResultRepository} (which stays a plain
 * CRUD repo) so the insight/dashboard concerns can evolve without touching the
 * write path. All queries are scoped to the attempts owned by a single user by
 * joining {@code user_test_attempts} → {@code test_result}.
 *
 * NOTE: we join through the attempt table rather than carrying a user_id on
 * test_result, matching the existing attempt/result split in the schema.
 */
@Repository
public interface TestAnalyticsRepository extends JpaRepository<TestResult, String> {

    /**
     * Every result belonging to a user, newest first. Used as the source rows for
     * the dashboard + improvement report. The JSON {@code answerSnapshot} is loaded
     * too so the report can mine per-question / per-topic weakness.
     */
    @Query("""
            SELECT r FROM TestResult r
            WHERE r.id IN (
                SELECT a.testId FROM UserTestAttempt a
                WHERE a.userId = :userId
                  AND (:since IS NULL OR a.createdAt >= :since)
            )
            ORDER BY r.createdAt DESC
            """)
    List<TestResult> findAllForUser(@Param("userId") String userId,
                                    @Param("since") Instant since);

    /**
     * Lightweight projection for the per-entity leaderboard in the improvement
     * report: average score and attempt count grouped by what the test was scoped
     * to (DOMAIN/COURSE/TOPIC + id). Aggregated in the DB so we never materialise
     * every row just to average them.
     */
    @Query("""
            SELECT r.entityType        AS entityType,
                   r.entityId          AS entityId,
                   r.poolName          AS poolName,
                   COUNT(r)            AS attempts,
                   AVG(r.scorePercentage) AS avgScore,
                   MIN(r.scorePercentage) AS minScore,
                   MAX(r.scorePercentage) AS maxScore,
                   SUM(r.correctCount) AS totalCorrect,
                   SUM(r.totalQuestions) AS totalQuestions,
                   SUM(CASE WHEN r.passed = true THEN 1 ELSE 0 END) AS passedCount,
                   MAX(r.createdAt)    AS lastAttemptedAt
            FROM TestResult r
            WHERE r.id IN (
                SELECT a.testId FROM UserTestAttempt a
                WHERE a.userId = :userId
                  AND (:since IS NULL OR a.createdAt >= :since)
            )
            GROUP BY r.entityType, r.entityId, r.poolName
            """)
    List<EntityPerformanceProjection> aggregateByEntity(@Param("userId") String userId,
                                                        @Param("since") Instant since);

    /** Projection for {@link #aggregateByEntity}. */
    interface EntityPerformanceProjection {
        com.unlearnarc.quspool.entity.QuestionPool.ScopeType getEntityType();
        String  getEntityId();
        String  getPoolName();
        Long    getAttempts();
        Double  getAvgScore();
        Double  getMinScore();
        Double  getMaxScore();
        Long    getTotalCorrect();
        Long    getTotalQuestions();
        Long    getPassedCount();
        Instant getLastAttemptedAt();
    }
}
