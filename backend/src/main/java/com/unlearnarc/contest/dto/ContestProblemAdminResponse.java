package com.unlearnarc.contest.dto;

import com.unlearnarc.contest.entity.ContestProblem.Difficulty;
import com.unlearnarc.contest.entity.ContestProblem.HarnessType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Full problem view for ADMINs — includes ALL test cases (hidden + public)
 * with expected outputs. Never served to students.
 */
@Data
@Builder
public class ContestProblemAdminResponse {
    private String       id;
    private String       contestId;
    private String       title;
    private String       statement;
    private String       constraints;
    private Difficulty   difficulty;
    private Integer      maxPoints;
    private String       starterCodeJson;
    private HarnessType  harnessType;
    private Integer      timeLimitMs;
    private Integer      displayOrder;
    private Boolean      isActive;
    private List<TestCaseAdminView> testCases;

    @Data
    @Builder
    public static class TestCaseAdminView {
        private String  id;
        private String  input;
        private String  expectedOutput;
        private Boolean isHidden;
        private Integer weight;
        private Boolean strictMatch;
        private Integer displayOrder;
    }
}
