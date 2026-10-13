package com.unlearnarc.algoviz.dto;

import com.unlearnarc.algoviz.entity.Algorithm.Difficulty;
import com.unlearnarc.algoviz.entity.Algorithm.Visualizer;
import com.unlearnarc.algoviz.spec.VisualizationSpec;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

/** Admin create/update payload. One of javaSource/pythonSource must be present. */
@Data
public class AlgorithmRequest {

    @NotBlank
    @Size(max = 160)
    @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
             message = "slug must be kebab-case (lowercase, digits, hyphens)")
    private String slug;

    @NotBlank
    private String title;

    @Size(max = 1000)
    private String summary;

    private String usage;

    @Size(max = 80)
    private String category;

    private Difficulty difficulty;

    /** e.g. {"time":"O(n log n)","space":"O(1)"} */
    private Map<String, Object> complexity;

    @NotNull
    private Visualizer visualizer;

    private String javaSource;
    private String pythonSource;

    @NotNull(message = "spec is required")
    @Valid
    private VisualizationSpec spec;

    private Boolean isPublished;
}
