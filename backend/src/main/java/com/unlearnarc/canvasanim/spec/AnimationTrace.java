package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.List;

/**
 * The complete, serializable time-based animation produced by a simulator for
 * one tutorial — the JSON mirror of the frontend {@code AnimationTrace}.
 *
 * Stored as a JSON text column so the schema can evolve (new entity fields,
 * new statuses, new renderers) without a DB migration. Typed (de)serialization
 * happens in {@code AnimationSceneMapper} via Jackson.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnimationTrace {

    private String id;

    @NotNull(message = "trace.title is required")
    private String title;

    private String description;

    /** Total timeline length in milliseconds. */
    @NotNull(message = "trace.duration is required")
    @Positive(message = "trace.duration must be > 0")
    private Double duration;

    @NotNull(message = "trace.viewport is required")
    @Valid
    private Viewport viewport;

    @Valid
    @NotEmpty(message = "trace.keyframes must contain at least one keyframe")
    private List<Keyframe> keyframes;

    @Valid
    private AnimationTheme theme;

    /** Semantic domain, e.g. CONCURRENCY / SYSTEM_DESIGN / DSA / AI_ML / DATABASE. */
    private String category;

    /** Time-synced step-by-step instruction rail. */
    @Valid
    private List<InstructionStep> instructions;

    /** Mid-animation checkpoints that pause playback and ask a question. */
    @Valid
    private List<Checkpoint> checkpoints;

    /** General authoring notes: summary, where-to-use, key points, references. */
    @Valid
    private AnimationNotes notes;

    /** Source-code programs taught alongside the animation (LeetCode, SQL, …). */
    @Valid
    private List<CodeProgram> programs;

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Viewport {
        @NotNull @Positive
        private Double width;
        @NotNull @Positive
        private Double height;
    }
}
