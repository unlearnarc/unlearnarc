package com.unlearnarc.contest.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.contest.dto.*;
import com.unlearnarc.contest.entity.ContestSubmission;
import com.unlearnarc.contest.service.ContestParticipationService;
import com.unlearnarc.contest.service.SubmissionRateLimiter;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * STUDENT-facing contest API.
 *
 * Execution model: the student's browser/client runs the code against the test
 * inputs locally (we never run code server-side). Flow:
 *   1. GET  /{contestId}/problems/{problemId}/challenge  → signed test inputs
 *   2. client runs code locally against those inputs
 *   3. POST /{contestId}/submit  → client-captured outputs + echoed signatures
 *      → server verifies signatures, re-validates outputs vs hidden expected
 *        outputs, returns the authoritative verdict + score.
 *
 * {@code /submit} is additionally throttled per (user, problem) to deter
 * brute-force harvesting of hidden expected outputs.
 */
@RestController
@RequestMapping("/api/v1/contests")
@RequiredArgsConstructor
// TEST-ONLY: class-level auth disabled so the contest flow works without a JWT
// while debugging the WASM sandbox. TODO: restore @PreAuthorize("hasAnyRole('USER','ADMIN')").
public class ContestController {

    private final ContestParticipationService service;
    private final SubmissionRateLimiter rateLimiter;
    private final UserRepository userRepo;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ContestResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(service.listPublished(), "Contests fetched"));
    }

    @GetMapping("/{contestId}")
    public ResponseEntity<ApiResponse<ContestResponse>> get(@PathVariable String contestId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getContest(contestId), "Contest fetched"));
    }

    @GetMapping("/{contestId}/problems")
    public ResponseEntity<ApiResponse<List<ContestProblemResponse>>> problems(
            @PathVariable String contestId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listProblems(contestId), "Problems fetched"));
    }

    @GetMapping("/{contestId}/problems/{problemId}")
    public ResponseEntity<ApiResponse<ContestProblemResponse>> problem(
            @PathVariable String contestId, @PathVariable String problemId) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.getProblem(contestId, problemId), "Problem fetched"));
    }

    /** Issue signed test inputs the client will run locally. */
    @GetMapping("/{contestId}/problems/{problemId}/challenge")
    public ResponseEntity<ApiResponse<ChallengeResponse>> challenge(
            @PathVariable String contestId, @PathVariable String problemId,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.issueChallenge(contestId, problemId, currentUserId(auth)),
                "Challenge issued"));
    }

    @PostMapping("/{contestId}/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @PathVariable String contestId, Authentication auth) {
        service.register(contestId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.ok(null, "Registered"));
    }

    /** Client posts locally-executed outputs; server re-validates & scores. */
    @PostMapping("/{contestId}/submit")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submit(
            @PathVariable String contestId,
            @Valid @RequestBody SubmissionRequest req,
            Authentication auth) {
        String userId = currentUserId(auth);
        if (!rateLimiter.tryConsume(userId, req.getProblemId())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error(
                            "Too many submissions for this problem. Please wait before retrying."));
        }
        return ResponseEntity.ok(ApiResponse.ok(
                service.submit(contestId, userId, req), "Submission graded"));
    }

    @GetMapping("/{contestId}/leaderboard")
    public ResponseEntity<ApiResponse<List<LeaderboardEntry>>> leaderboard(
            @PathVariable String contestId) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.leaderboard(contestId), "Leaderboard fetched"));
    }

    @GetMapping("/{contestId}/my-submissions")
    public ResponseEntity<ApiResponse<List<ContestSubmission>>> mySubmissions(
            @PathVariable String contestId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.mySubmissions(contestId, currentUserId(auth)), "Submissions fetched"));
    }

    /**
     * Resolves the authenticated user's id. For USER tokens the JWT filter sets
     * the principal name to the email, so we look up the user by email.
     *
     * TEST-ONLY: when auth is null (contest endpoints are temporarily public for
     * WASM-sandbox testing), fall back to the first user in the DB so the
     * challenge/submit flow still has a valid user id. TODO: remove the fallback
     * and restore the strict null check before production.
     */
    private String currentUserId(Authentication auth) {
        if (auth != null && auth.getName() != null) {
            String email = auth.getName();
            return userRepo.findByEmail(email)
                    .map(User::getId)
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + email));
        }
        // TEST-ONLY fallback: use any existing user so public contest calls work.
        return userRepo.findAll().stream()
                .findFirst()
                .map(User::getId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No users in DB for test-only contest fallback"));
    }
}
