package com.unlearnarc.canvasanim.dto;

import com.unlearnarc.canvasanim.entity.AnimationScene.Category;
import com.unlearnarc.canvasanim.entity.AnimationScene.Source;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

/**
 * Admin create/update payload for a canvas animation scene.
 *
 * AUTHORED scenes supply {@code trace} directly. GENERATED scenes supply
 * {@code kind} (+ optional {@code simulatorParams}) and the server produces the
 * trace via the matching {@code SceneSimulator}.
 */
@Data
public class AnimationSceneRequest {

    @NotBlank
    @Size(max = 160)
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
             message = "slug must be kebab-case (lowercase, digits, hyphens)")
    private String slug;

    @NotBlank
    private String title;

    @Size(max = 1000)
    private String description;

    private Category category;

    @NotNull(message = "source is required (AUTHORED or GENERATED)")
    private Source source;

    /** Required when source = GENERATED. */
    private String kind;

    /** Optional simulator inputs when source = GENERATED. */
    private Map<String, Object> simulatorParams;

    /** Required when source = AUTHORED. */
    @Valid
    private AnimationTrace trace;

    private Boolean isPublished;
}
