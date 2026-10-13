package com.unlearnarc.contest.dto;

import com.unlearnarc.contest.entity.ContestProblem.Difficulty;
import com.unlearnarc.contest.entity.ContestProblem.HarnessType;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Problem as served to a STUDENT during the contest.
 * Only PUBLIC sample test cases are included. Hidden expected outputs are never
 * part of this payload. {@code hiddenTestCount} tells the client how many
 * graded cases exist so it can show progress without revealing them.
 */
@Data
@Builder
public class ContestProblemResponse {
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

    /** Public sample cases (full input + expectedOutput). */
    private List<PublicTestCase> sampleTestCases;

    /** Count of hidden graded cases (no data exposed). */
    private Integer      hiddenTestCount;

    @Data
    @Builder
    public static class PublicTestCase {
        private String  id;
        private String  input;
        private String  expectedOutput;
        private Integer displayOrder;
    }
}
