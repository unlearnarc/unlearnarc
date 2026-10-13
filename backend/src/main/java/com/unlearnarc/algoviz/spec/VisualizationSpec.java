package com.unlearnarc.algoviz.spec;

import com.unlearnarc.algoviz.entity.Algorithm.Visualizer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

/** Declarative meta spec the frontend canvas replays. Stored as JSON. */
@Data
public class VisualizationSpec {

    @NotNull(message = "visualizer is required")
    private Visualizer visualizer;

    /** Optional initial canvas state before step 0. */
    private Map<String, Object> initialState;

    @Valid
    private List<Variable> variables;

    @Valid
    @NotEmpty(message = "steps must contain at least one step")
    private List<Step> steps;
}
