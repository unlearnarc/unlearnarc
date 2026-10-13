package com.unlearnarc.quspool.dto;

import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class AnswerResponse {
    private String    id;
    private String    questionId;
    private String  answerText;
    private Boolean isCorrect;
    private Integer displayOrder;
}
