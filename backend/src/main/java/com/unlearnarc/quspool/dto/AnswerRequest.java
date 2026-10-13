package com.unlearnarc.quspool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AnswerRequest {

    @NotBlank(message = "Answer text is required")
    private String answerText;

    @NotNull(message = "isCorrect flag is required")
    private Boolean isCorrect;

    private Integer displayOrder = 0;
}
