package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.util.List;

/**
 * A mid-animation checkpoint: when the playhead reaches {@code time}, the client
 * pauses and asks this question. Mirrors the frontend Checkpoint.
 *
 * {@code answer} is polymorphic (String / List / Boolean / Number) to match the
 * four {@code kind}s; validated semantically rather than by bean annotations.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Checkpoint {

    public enum Kind { single, multiple, bool, number }

    @NotBlank(message = "checkpoint.id is required")
    private String id;

    @NotNull(message = "checkpoint.time is required")
    @PositiveOrZero
    private Double time;

    @NotNull(message = "checkpoint.kind is required")
    private String kind;   // single | multiple | boolean | number (kept as String to mirror FE)

    @NotBlank(message = "checkpoint.prompt is required")
    private String prompt;

    private List<Option> options;

    /** single -> String, multiple -> List<String>, boolean -> Boolean, number -> Number. */
    @NotNull(message = "checkpoint.answer is required")
    private Object answer;

    private Double tolerance;
    private String explanation;
    private String hint;
    private Boolean blocking;

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Option {
        @NotBlank private String id;
        @NotBlank private String label;
    }
}
