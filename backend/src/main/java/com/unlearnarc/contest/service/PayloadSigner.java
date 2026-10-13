package com.unlearnarc.contest.service;

import com.unlearnarc.security.jwt.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

/**
 * Signs the hidden test-input "challenge" the server issues to a client, and
 * verifies the signature the client echoes back on submission.
 *
 * Why: code runs on the client, so a malicious client could try to (a) submit
 * for test-case ids it was never issued, or (b) claim it ran a different input
 * than the one we served. We bind each issued (userId, problemId, testCaseId,
 * inputHash, issuedAt) tuple into an HMAC-SHA256 token. On submit, the client
 * returns the token; we recompute the HMAC from our own stored data and reject
 * any mismatch or expired token.
 *
 * The signing key is derived from the existing JWT secret (already a 512-bit
 * secret), namespaced with a salt so it is independent of auth tokens.
 */
@Component
@RequiredArgsConstructor
public class PayloadSigner {

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final String KEY_SALT  = "contest-challenge::";

    /** Challenge validity window (ms). Defaults to 3h — long enough for a contest sitting. */
    private static final long DEFAULT_TTL_MS = 3 * 60 * 60 * 1000L;

    private final JwtProperties jwtProperties;

    // ── Issue ─────────────────────────────────────────────────────────────────────

    /**
     * Produce a signature binding this test case to the user who requested it.
     * Format returned to the client: {@code <issuedAtEpochMs>.<base64url(hmac)>}
     */
    public String sign(String userId, String problemId, String testCaseId, String input) {
        long issuedAt = Instant.now().toEpochMilli();
        String mac = hmac(canonical(userId, problemId, testCaseId, input, issuedAt));
        return issuedAt + "." + mac;
    }

    // ── Verify ──────────────────────────────────────────────────────────────────

    /**
     * Returns true iff the token was issued by us for exactly this tuple and has
     * not expired. Constant-time comparison avoids timing oracles.
     */
    public boolean verify(String token, String userId, String problemId,
                          String testCaseId, String input) {
        if (token == null || token.isBlank()) return false;
        int dot = token.indexOf('.');
        if (dot <= 0) return false;

        final long issuedAt;
        try {
            issuedAt = Long.parseLong(token.substring(0, dot));
        } catch (NumberFormatException e) {
            return false;
        }
        if (Instant.now().toEpochMilli() - issuedAt > DEFAULT_TTL_MS) {
            return false; // expired
        }
        String provided = token.substring(dot + 1);
        String expected = hmac(canonical(userId, problemId, testCaseId, input, issuedAt));
        return MessageDigest.isEqual(
                provided.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    private String canonical(String userId, String problemId, String testCaseId,
                             String input, long issuedAt) {
        // Hash the input so very large inputs don't bloat the HMAC message.
        return String.join("|",
                userId, problemId, testCaseId, sha256(input), Long.toString(issuedAt));
    }

    private String hmac(String message) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            byte[] keyBytes = (KEY_SALT + jwtProperties.getSecret()).getBytes(StandardCharsets.UTF_8);
            mac.init(new SecretKeySpec(keyBytes, HMAC_ALGO));
            byte[] raw = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign contest payload", e);
        }
    }

    private String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] raw = md.digest((s == null ? "" : s).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash contest input", e);
        }
    }
}
