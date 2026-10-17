package com.unlearnarc.algoviz.dto;

import com.unlearnarc.algoviz.entity.Algorithm.Difficulty;
import com.unlearnarc.algoviz.entity.Algorithm.Visualizer;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

/** Lightweight catalog item (no code/spec) for grids and lists. */
@Data
@Builder
public class AlgorithmSummaryResponse {
    private String id;
    private String slug;
    private String title;
    private String summary;
    private String thumbnailUrl;
    private java.time.Instant createdAt;
    private String category;
    private Difficulty difficulty;
    private Map<String, Object> complexity;
    private Visualizer visualizer;
    private Boolean isPublished;
    private Integer stepCount;
    private Boolean hasJava;
    private Boolean hasPython;
}
