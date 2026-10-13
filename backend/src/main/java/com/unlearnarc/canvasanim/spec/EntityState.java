package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

/**
 * A single visual entity's state at a keyframe — the exact JSON mirror of the
 * frontend {@code EntityState} (src/types/animation.ts).
 *
 * Numeric fields (x, y, width, height, radius, opacity, scale, rotation,
 * progress) are interpolated between keyframes on the client; discrete fields
 * (label, color, status, shape, visible) snap to the source keyframe.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EntityState {

    @NotBlank(message = "entity.id is required")
    private String id;

    // ── interpolated ──────────────────────────────────────────────────────────
    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private Double radius;
    private Double opacity;
    private Double scale;
    private Double rotation;
    private Double progress;

    // ── discrete ──────────────────────────────────────────────────────────────
    private String label;
    private String sublabel;
    private String color;
    // circle | rect | diamond | pill | text | node | cylinder | matrix | table | packet | arrayCell
    private String shape;
    private EntityStatus status;
    private Boolean visible;

    /** Renderer-specific metadata; never interpolated. */
    private Map<String, Object> meta;
}
