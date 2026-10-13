package com.unlearnarc.canvasanim.spec;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

/**
 * A source-code program taught alongside the animation — e.g. a LeetCode
 * solution, an SQL query, or an ML snippet. The JSON mirror of the frontend
 * {@code CodeProgram}.
 *
 * <p>Line highlights are time-synced to the playhead so the "current" lines of
 * code light up in lock-step with the animation. Runnable languages
 * (python / javascript) can be executed in the client sandbox; all other
 * languages (sql, java, cpp, …) are display-only (highlighting still works).
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CodeProgram {

    @NotBlank(message = "program.id is required")
    private String id;

    @NotBlank(message = "program.label is required")
    private String label;

    /** python | javascript | typescript | java | cpp | c | sql | go | rust | text */
    @NotBlank(message = "program.language is required")
    private String language;

    @NotBlank(message = "program.source is required")
    private String source;

    @Valid
    private List<CodeHighlight> highlights;

    /** Only honoured for runnable languages (python/javascript) on the client. */
    private Boolean runnable;

    private String stdin;

    private String explanation;

    /** A time-synced highlight of one or more 1-based source lines. */
    @Data
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CodeHighlight {
        /** Timestamp (ms) from which these lines become "current". */
        private Double time;
        /** 1-based line numbers to highlight. */
        private List<Integer> lines;
        /** Optional caption shown beneath the code for this span. */
        private String note;
    }
}
