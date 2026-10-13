package com.unlearnarc.algoviz.spec;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/** Instructs a renderer to colour specific elements in a step. */
@Data
public class Highlight {

    /** Which collection to target: "array", "nodes", "edges", "stack"... */
    @NotBlank
    private String target;

    /** Indices or node ids to highlight. */
    private List<Object> indices;

    @NotNull
    private Style style;

    public enum Style {
        COMPARE, SWAP, VISIT, ACTIVE, DONE, PATH, ERROR, INSERT, DELETE, PIVOT
    }
}
