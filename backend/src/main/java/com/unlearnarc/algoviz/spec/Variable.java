package com.unlearnarc.algoviz.spec;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** A tracked variable rendered in the narration panel (e.g. i, j, pivot). */
@Data
public class Variable {
    @NotBlank
    private String name;
    private String label;
    private String color;
}
