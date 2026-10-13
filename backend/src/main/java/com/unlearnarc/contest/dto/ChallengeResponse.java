package com.unlearnarc.contest.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Issued to the client right before it runs code locally. Contains, per test
 * case, the INPUT the client must feed to the user's code plus a server-signed
 * {@code signature} that binds (user, problem, testCase, input, issuedAt).
 *
 * The client MUST echo each {@code testCaseId} + {@code signature} back in the
 * submission; the server rejects any output for a case whose signature is
 * missing, tampered, or expired. Hidden expected outputs are NEVER included.
 */
@Data
@Builder
public class ChallengeResponse {
    private String problemId;
    private String harnessType;
    private Integer timeLimitMs;
    private List<ChallengeCase> cases;

    @Data
    @Builder
    public static class ChallengeCase {
        private String  testCaseId;
        private String  input;        // stdin or JSON args — safe to expose
        private Boolean isHidden;     // client may hide hidden-case I/O in the UI
        private Integer displayOrder;
        private String  signature;    // "<issuedAt>.<hmac>"
    }
}
