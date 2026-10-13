package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** A directed/undirected visual link between two entities at a keyframe. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConnectionState {

    @NotBlank(message = "connection.id is required")
    private String id;

    @NotBlank(message = "connection.from is required")
    private String from;

    @NotBlank(message = "connection.to is required")
    private String to;

    private String color;
    /** 0‑1, interpolated — animates a packet travelling along the link. */
    private Double progress;
    private Double opacity;
    private String label;
    private Boolean dashed;
}
