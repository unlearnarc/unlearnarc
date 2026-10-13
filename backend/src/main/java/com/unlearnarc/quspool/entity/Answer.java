package com.unlearnarc.quspool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * An answer option for a Question.
 *
 * For MCQ:             exactly one Answer has is_correct = true
 * For MULTIPLE_CORRECT: one or more Answers have is_correct = true
 *
 * The answer text supports rich content (mediumtext) so code snippets,
 * formulas, etc. can be embedded.
 */
@Entity
@Table(name = "answer", indexes = {
        @Index(name = "idx_answer_question", columnList = "question_id"),
        @Index(name = "idx_answer_correct",  columnList = "question_id, is_correct")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Answer {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "question_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String questionId;

    @Column(name = "answer_text", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String answerText;

    @Column(name = "is_correct", nullable = false)
    @Builder.Default
    private Boolean isCorrect = false;

    /** Display order for the answer options (A, B, C, D …) */
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
