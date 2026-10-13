package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.Question.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Question sent to the user during a test.
 * NOTE: isCorrect is intentionally OMITTED from answers — never expose it to the client.
 */
@Data
@Builder
public class TestQuestionResponse {
    private String         id;
    private String       questionText;
    private QuestionType questionType;
    private Difficulty   difficulty;
    private Integer      points;
    private List<TestAnswerOption> answers;

    @Data
    @Builder
    public static class TestAnswerOption {
        private String   id;
        private String answerText;
        private Integer displayOrder;
        // isCorrect intentionally excluded
    }
}
