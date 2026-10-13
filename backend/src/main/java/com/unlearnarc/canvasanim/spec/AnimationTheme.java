package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.Map;

/** Optional per-trace canvas theming. Mirrors the frontend AnimationTheme. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnimationTheme {
    private String background;
    private String gridColor;
    private String textColor;
    private String mutedTextColor;
    private String font;
    /** status name -> colour, e.g. {"LOCKED":"#F59E0B"}. */
    private Map<String, String> statusColors;
    /** semantic token -> colour, e.g. {"primary":"#2563EB"}. */
    private Map<String, String> tokens;
}
