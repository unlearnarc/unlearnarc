package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

/**
 * General authoring notes for a scene: a plain-language summary, "where to use"
 * applications, key takeaways and references. Mirrors the frontend AnimationNotes.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AnimationNotes {
    private String summary;
    private List<String> whereToUse;
    private List<String> keyPoints;
    private List<Reference> references;

    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Reference {
        private String label;
        private String url;
    }
}
