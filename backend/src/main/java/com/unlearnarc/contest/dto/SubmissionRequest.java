package com.unlearnarc.contest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * Posted by the STUDENT'S CLIENT after it has executed the code locally against
 * EVERY test case (public + hidden — the client receives hidden INPUTS only,
 * each wrapped in a server-signed challenge).
 *
 * The client reports, per test case id, the captured stdout / return value, the
 * signed challenge it was issued, and the local status. The SERVER:
 *   1. verifies each {@code signature} actually binds this user + problem +
 *      testCase + input (rejecting tampered/forged/expired cases), then
 *   2. re-validates {@code producedOutput} against the stored expected output.
 * The client's {@code clientStatus} is advisory only.
 */
@Data
public class SubmissionRequest {

    @NotBlank
    private String problemId;

    @NotBlank
    private String language;

    /** Source the client executed — stored for audit, never re-run server-side. */
    private String sourceCode;

    @NotEmpty
    @Valid
    private List<TestOutcome> results;

    @Data
    public static class TestOutcome {
        @NotBlank
        private String testCaseId;

        /** Server-signed challenge token issued for this case ("<issuedAt>.<hmac>"). */
        @NotBlank
        private String signature;

        /** The exact input the client ran — echoed so the server can verify the HMAC. */
        @NotNull
        private String input;

        /** stdout / JSON return captured on the client. */
        @NotNull
        private String producedOutput;

        /** Advisory client-side status: OK | TIMEOUT | RUNTIME_ERROR | COMPILE_ERROR. */
        private String clientStatus = "OK";

        /** Runtime the client measured for this case (ms). */
        private Integer runtimeMs;
    }
}
