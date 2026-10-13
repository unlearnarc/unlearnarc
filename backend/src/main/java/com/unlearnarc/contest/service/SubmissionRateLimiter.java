package com.unlearnarc.contest.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dedicated, stricter rate limiter for contest submissions.
 *
 * Why separate from the global API limiter: a malicious client could brute-force
 * hidden expected outputs by submitting many slightly-different outputs and
 * watching which flip a hidden case to "passed". Throttling submissions per
 * (user, problem) makes that economically infeasible while still allowing
 * legitimate iterative solving.
 *
 * Key = userId + ":" + problemId. Defaults: 12 submissions / 60s burst,
 * refilling 12 tokens each minute. Tune via app.contest.* properties.
 */
@Component
public class SubmissionRateLimiter {

    private final int capacity;
    private final int refillTokens;
    private final int refillSeconds;

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public SubmissionRateLimiter(
            @Value("${app.contest.submit-rate-limit.capacity:12}") int capacity,
            @Value("${app.contest.submit-rate-limit.refill-tokens:12}") int refillTokens,
            @Value("${app.contest.submit-rate-limit.refill-seconds:60}") int refillSeconds) {
        this.capacity = capacity;
        this.refillTokens = refillTokens;
        this.refillSeconds = refillSeconds;
    }

    /** @return true if the submission is allowed; false if the limit is exceeded. */
    public boolean tryConsume(String userId, String problemId) {
        String key = userId + ":" + problemId;
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket());
        return bucket.tryConsume(1);
    }

    public long remaining(String userId, String problemId) {
        Bucket bucket = buckets.get(userId + ":" + problemId);
        return bucket == null ? capacity : bucket.getAvailableTokens();
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(refillTokens, Duration.ofSeconds(refillSeconds))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
