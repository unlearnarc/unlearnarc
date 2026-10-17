package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.Question;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.Question.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, String> {

    List<Question> findByPoolId(String poolId);

    List<Question> findByPoolIdAndIsActiveTrue(String poolId);

    List<Question> findByPoolIdAndDifficultyAndIsActiveTrue(String poolId, Difficulty difficulty);

    List<Question> findByPoolIdAndQuestionTypeAndIsActiveTrue(String poolId, QuestionType questionType);

    long countByPoolIdAndDifficultyAndIsActiveTrue(String poolId, Difficulty difficulty);

    long countByPoolIdAndIsActiveTrue(String poolId);

    /**
     * Randomly pick N active questions by pool + difficulty.
     * Used by the test-generation engine to build a balanced question set.
     */
    @Query(value = """
            SELECT * FROM question
            WHERE pool_id = :poolId
              AND difficulty = :difficulty
              AND is_active  = true
            ORDER BY RAND()
            LIMIT :count
            """, nativeQuery = true)
    List<Question> findRandomByPoolAndDifficulty(
            @Param("poolId")     String poolId,
            @Param("difficulty") String difficulty,
            @Param("count")      int count);

    /**
     * Randomly pick N active questions by pool (any difficulty).
     */
    @Query(value = """
            SELECT * FROM question
            WHERE pool_id = :poolId
              AND is_active = true
            ORDER BY RAND()
            LIMIT :count
            """, nativeQuery = true)
    List<Question> findRandomByPool(
            @Param("poolId") String poolId,
            @Param("count")  int count);

    /**
     * Randomly pick N active questions across MANY pools + a difficulty.
     * Used by the test engine to aggregate child pools (a course test draws from
     * every topic pool under it; a domain test draws from every course+topic pool).
     * Duplicate questions cannot occur because each question belongs to one pool.
     */
    @Query(value = """
            SELECT * FROM question
            WHERE pool_id IN (:poolIds)
              AND difficulty = :difficulty
              AND is_active  = true
            ORDER BY RAND()
            LIMIT :count
            """, nativeQuery = true)
    List<Question> findRandomByPoolsAndDifficulty(
            @Param("poolIds")    List<String> poolIds,
            @Param("difficulty") String difficulty,
            @Param("count")      int count);

    /** Count active questions of a difficulty across MANY pools. */
    @Query("""
            SELECT COUNT(q) FROM Question q
            WHERE q.poolId IN :poolIds
              AND q.difficulty = :difficulty
              AND q.isActive = true
            """)
    long countByPoolIdsAndDifficulty(
            @Param("poolIds")    List<String> poolIds,
            @Param("difficulty") Difficulty difficulty);
}
