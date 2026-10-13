package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.Question.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class QuestionRequest {

    @NotNull(message = "poolId is required")
    private String poolId;

    @NotBlank(message = "Question text is required")
    private String questionText;

    @NotNull(message = "questionType is required (MCQ or MULTIPLE_CORRECT)")
    private QuestionType questionType;

    @NotNull(message = "difficulty is required (EASY, MEDIUM or HARD)")
    private Difficulty difficulty;

    @Min(value = 1, message = "Points must be at least 1")
    @Max(value = 100, message = "Points cannot exceed 100")
    private Integer points = 1;

    private String explanation;

    /**
     * Answers are embedded in the question creation request.
     *
     * Rules:
     *  - MCQ:              must have exactly one answer where isCorrect=true
     *  - MULTIPLE_CORRECT: must have at least two answers where isCorrect=true
     *  - Minimum 2 answers total; maximum 10
     */
    @NotEmpty(message = "At least 2 answers are required")
    @Size(min = 2, max = 10, message = "A question must have between 2 and 10 answers")
    @Valid
    private List<AnswerRequest> answers;
}
