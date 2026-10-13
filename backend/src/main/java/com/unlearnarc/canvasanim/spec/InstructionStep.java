package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

/**
 * A single step in the time-synced instruction rail. The frontend highlights the
 * last step whose {@code time <= playhead}. Mirrors the frontend InstructionStep.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InstructionStep {

    @NotBlank(message = "instruction.id is required")
    private String id;

    @NotNull(message = "instruction.time is required")
    @PositiveOrZero
    private Double time;

    @NotBlank(message = "instruction.title is required")
    private String title;

    private String detail;
}
