package com.unlearnarc.algoviz.spec;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/** A prompt shown at a step that pauses playback until the learner answers. */
@Data
public class UserInputRequest {

    @NotBlank
    private String key;

    @NotBlank
    private String prompt;

    @NotNull
    private InputType type;

    @Valid
    private List<Option> options;

    /** Optional correct answer for self-check. */
    private Object expected;

    private String placeholder;

    public enum InputType { NUMBER, TEXT, CHOICE, BOOLEAN }

    @Data
    public static class Option {
        @NotBlank
        private String label;
        private Object value;
        /** If set, selecting this option branches the player to that step id. */
        private String nextStepId;
    }
}
