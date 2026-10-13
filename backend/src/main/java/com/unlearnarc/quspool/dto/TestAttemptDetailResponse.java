package com.unlearnarc.quspool.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Full detail of one past attempt: all the metadata from the summary plus the
 * complete graded breakdown ({@link TestResultResponse}) reconstructed from the
 * stored answer snapshot. Used by the "review a past attempt" screen.
 */
@Data
@Builder
public class TestAttemptDetailResponse {

    private String  attemptId;
    private String  resultId;
    private Instant attemptedAt;
    private Integer timeTakenSeconds;

    /** The graded result exactly as it was returned when the test was submitted. */
    private TestResultResponse result;
}
