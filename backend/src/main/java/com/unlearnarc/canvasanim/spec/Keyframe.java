package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.util.Map;

/**
 * A single snapshot of the whole scene at an exact timestamp.
 * Keyframes within a trace MUST be sorted ascending by {@code time}.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Keyframe {

    /** Absolute timestamp in milliseconds from the start of the trace. */
    @NotNull(message = "keyframe.time is required")
    @PositiveOrZero(message = "keyframe.time must be >= 0")
    private Double time;

    /** Entities present at this instant, keyed by id. */
    @Valid
    @NotNull(message = "keyframe.entities is required")
    private Map<String, EntityState> entities;

    /** Optional connections/edges present at this instant. */
    @Valid
    private Map<String, ConnectionState> connections;

    /** Global scalar variables rendered in a side panel / HUD. */
    private Map<String, Object> variables;

    /** Human-readable caption describing what happens at this moment. */
    private String caption;
}
