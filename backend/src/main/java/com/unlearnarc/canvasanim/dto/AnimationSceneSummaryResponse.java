package com.unlearnarc.canvasanim.dto;

import com.unlearnarc.canvasanim.entity.AnimationScene.Category;
import com.unlearnarc.canvasanim.entity.AnimationScene.Source;
import lombok.Builder;
import lombok.Data;

/** Lightweight catalog item (no trace) for grids and lists. */
@Data
@Builder
public class AnimationSceneSummaryResponse {
    private String id;
    private String slug;
    private String title;
    private String description;
    private Category category;
    private Source source;
    private String kind;
    private Boolean isPublished;
    private Integer keyframeCount;
    private Double duration;
}
