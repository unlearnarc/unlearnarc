package com.unlearnarc.algoviz.dto;

import com.unlearnarc.algoviz.entity.Algorithm.Difficulty;
import com.unlearnarc.algoviz.entity.Algorithm.Visualizer;
import com.unlearnarc.algoviz.spec.VisualizationSpec;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

/** Full payload consumed by the frontend canvas player. */
@Data
@Builder
public class AlgorithmResponse {
    private String id;
    private String slug;
    private String title;
    private String summary;
    private String thumbnailUrl;
    private String usage;
    private String category;
    private Difficulty difficulty;
    private Map<String, Object> complexity;
    private Visualizer visualizer;
    private String javaSource;
    private String pythonSource;
    private VisualizationSpec spec;
    private Boolean isPublished;
    private Integer version;
    private Instant createdAt;
    private Instant updatedAt;
}
