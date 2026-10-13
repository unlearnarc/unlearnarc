package com.unlearnarc.security.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiter backed by Bucket4j.
 *
 * Two independent bucket pools:
 *  • loginBuckets  — per-IP, tight limit (10 req / 60 s) to blunt brute-force
 *  • apiBuckets    — per-JWT-email, generous limit (200 req / 60 s)
 */
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RateLimitProperties props;

    private final ConcurrentHashMap<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> apiBuckets   = new ConcurrentHashMap<>();

    // ── called from the login-rate-limit interceptor ───────────────────────────
    public boolean tryConsumeLogin(String ipAddress) {
        Bucket bucket = loginBuckets.computeIfAbsent(ipAddress, k -> newLoginBucket());
        return bucket.tryConsume(1);
    }

    // ── called from the API-rate-limit interceptor ─────────────────────────────
    public boolean tryConsumeApi(String principal) {
        Bucket bucket = apiBuckets.computeIfAbsent(principal, k -> newApiBucket());
        return bucket.tryConsume(1);
    }

    // ── how many tokens are left for diagnostics / X-RateLimit headers ─────────
    public long remainingLoginTokens(String ipAddress) {
        Bucket bucket = loginBuckets.get(ipAddress);
        return bucket == null ? props.getLogin().getCapacity()
                               : bucket.getAvailableTokens();
    }

    public long remainingApiTokens(String principal) {
        Bucket bucket = apiBuckets.get(principal);
        return bucket == null ? props.getApi().getCapacity()
                               : bucket.getAvailableTokens();
    }

    // ── bucket factories (Bucket4j 8.x modern API) ────────────────────────────
    private Bucket newLoginBucket() {
        RateLimitProperties.Bucket cfg = props.getLogin();
        Bandwidth limit = Bandwidth.builder()
                .capacity(cfg.getCapacity())
                .refillGreedy(cfg.getRefillTokens(), Duration.ofSeconds(cfg.getRefillSeconds()))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket newApiBucket() {
        RateLimitProperties.Bucket cfg = props.getApi();
        Bandwidth limit = Bandwidth.builder()
                .capacity(cfg.getCapacity())
                .refillGreedy(cfg.getRefillTokens(), Duration.ofSeconds(cfg.getRefillSeconds()))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
