package com.unlearnarc.algoviz.spec;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

/** A single frame: the canvas state + narration + optional input/branch. */
@Data
public class Step {

    private String id;
    private String title;
    private String explanation;

    /** Full renderable state for this frame (array, nodes, edges, matrix...). */
    @NotNull(message = "step.state is required")
    private Map<String, Object> state;

    /** Snapshot of tracked variable values at this frame. */
    private Map<String, Object> variables;

    @Valid
    private List<Highlight> highlights;

    /** 1-based source line to highlight. */
    private Integer line;

    /** "java" or "python" — which source the line belongs to. */
    private String lang;

    @Valid
    private UserInputRequest input;

    /** Named cursors, e.g. {"i":2,"j":3} rendered above array cells. */
    private Map<String, Object> pointers;
}
