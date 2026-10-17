package com.unlearnarc.canvasanim.dto;

import com.unlearnarc.canvasanim.entity.AnimationScene.Category;
import com.unlearnarc.canvasanim.entity.AnimationScene.Source;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/** Full payload consumed by the frontend CanvasAnimator. */
@Data
@Builder
public class AnimationSceneResponse {
    private String id;
    private String slug;
    private String title;
    private String description;
    private String thumbnailUrl;
    private Category category;
    private Source source;
    private String kind;
    /** The resolved trace (authored verbatim, or freshly generated). */
    private AnimationTrace trace;
    private Boolean isPublished;
    private Integer version;
    private Instant createdAt;
    private Instant updatedAt;
}
