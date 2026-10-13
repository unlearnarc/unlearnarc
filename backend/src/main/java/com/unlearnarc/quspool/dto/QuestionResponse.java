package com.unlearnarc.quspool.dto;

import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.Question.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class QuestionResponse {
    private String             id;
    private String             poolId;
    private String           questionText;
    private QuestionType     questionType;
    private Difficulty       difficulty;
    private Integer          points;
    private String           explanation;
    private Boolean          isActive;
    private Instant          createdAt;
    private Instant          updatedAt;
    private List<AnswerResponse> answers;
}
