package com.unlearnarc.quspool.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A single question inside a Question Pool.
 *
 * Question types:
 *   MCQ             – exactly one correct answer
 *   MULTIPLE_CORRECT – one or more correct answers
 *
 * Difficulty:
 *   EASY | MEDIUM | HARD — used for random selection in test generation
 *
 * Answers are stored in the `answer` table (FK → question.id)
 * and loaded via AnswerRepository, NOT via JPA @OneToMany
 * (avoids bidirectional mapping issues with String PK).
 */
@Entity
@Table(name = "question", indexes = {
        @Index(name = "idx_question_pool",  columnList = "pool_id"),
        @Index(name = "idx_question_level", columnList = "difficulty"),
        @Index(name = "idx_question_type",  columnList = "question_type")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Question {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "pool_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String poolId;

    @Column(name = "question_text", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 20)
    private QuestionType questionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false, length = 10)
    private Difficulty difficulty;

    @Column(name = "points", nullable = false)
    @Builder.Default
    private Integer points = 1;

    @Column(name = "explanation", columnDefinition = "LONGTEXT")
    private String explanation;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum QuestionType {
        MCQ,
        MULTIPLE_CORRECT
    }

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }
}
