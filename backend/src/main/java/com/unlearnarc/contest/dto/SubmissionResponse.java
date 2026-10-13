package com.unlearnarc.contest.dto;

import com.unlearnarc.contest.entity.ContestSubmission.Verdict;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Authoritative grading result returned to the student after the server
 * re-validates the client-reported outputs against the hidden expected outputs.
 */
@Data
@Builder
public class SubmissionResponse {
    private String        submissionId;
    private String        problemId;
    private Verdict       verdict;
    private Integer       passedTests;
    private Integer       totalTests;
    private Integer       score;          // points earned by THIS submission
    private Integer       maxPoints;
    private Integer       scoreDelta;     // added to participant total (best-score improvement)
    private Integer       participantTotalScore;
    private Integer       runtimeMs;

    /** Per hidden-case verdict (never reveals expected output). */
    private List<CaseVerdict> caseVerdicts;

    @Data
    @Builder
    public static class CaseVerdict {
        private String  testCaseId;
        private Boolean passed;
        private Integer displayOrder;
        /** Only populated for PUBLIC cases on failure (debugging aid). */
        private String  expectedOutput;
        private String  producedOutput;
    }
}
