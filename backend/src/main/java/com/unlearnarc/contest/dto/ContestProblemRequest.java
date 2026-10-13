package com.unlearnarc.contest.dto;

import com.unlearnarc.contest.entity.ContestProblem.Difficulty;
import com.unlearnarc.contest.entity.ContestProblem.HarnessType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** Admin create/update problem payload (with its test cases). */
@Data
public class ContestProblemRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String statement;

    private String constraints;

    @NotNull
    private Difficulty difficulty;

    private Integer maxPoints = 100;

    /** JSON map of starter code keyed by language. */
    private String starterCodeJson;

    private HarnessType harnessType = HarnessType.STDIN_STDOUT;

    private Integer timeLimitMs = 2000;

    private Integer displayOrder = 0;

    @Valid
    private List<TestCaseRequest> testCases = new ArrayList<>();

    @Data
    public static class TestCaseRequest {
        @NotNull
        private String input;
        @NotNull
        private String expectedOutput;
        private Boolean isHidden = true;
        private Integer weight = 1;
        private Boolean strictMatch = false;
        private Integer displayOrder = 0;
    }
}
