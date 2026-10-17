package com.unlearnarc.quspool.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.service.TestEngineService;
import com.unlearnarc.quspool.service.TestHistoryService;
import com.unlearnarc.quspool.service.TestInsightsService;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tests")
@RequiredArgsConstructor
public class TestEngineController {

    private final TestEngineService   testEngineService;
    private final TestHistoryService  testHistoryService;
    private final TestInsightsService testInsightsService;
    private final UserRepository      userRepo;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<TestSessionResponse>> generate(
            @Valid @RequestBody TestGenerationRequest req,
            Authentication auth) {
        // Pass the resolved userId so the adaptive flow (req.adaptive=true) can read
        // the learner's past attempts. Direct quiz flow ignores it.
        return ResponseEntity.ok(ApiResponse.ok(
                testEngineService.generate(req, currentUserId(auth)), "Test session generated"));
    }

    @PostMapping("/grade")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<TestResultResponse>> grade(
            @Valid @RequestBody TestSubmissionRequest req,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                testEngineService.grade(req, currentUserId(auth)), "Test graded"));
    }

    // ── History ────────────────────────────────────────────────────────────────

    /** Paginated list of the authenticated user's past attempts (newest first). */
    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<Page<TestAttemptSummaryResponse>>> history(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                testHistoryService.history(currentUserId(auth), page, size),
                "Test history fetched"));
    }

    /** Full graded detail of a single past attempt (owned by the caller). */
    @GetMapping("/history/{attemptId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<TestAttemptDetailResponse>> historyDetail(
            @PathVariable String attemptId,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                testHistoryService.detail(currentUserId(auth), attemptId),
                "Attempt detail fetched"));
    }

    // ── Insights ─────────────────────────────────────────────────────────────────

    /**
     * Quick "at a glance" dashboard: KPIs, score trend, per-difficulty accuracy and
     * a pointer to the weakest area. {@code windowDays} optionally restricts to the
     * last N days (omit / 0 = all time).
     */
    @GetMapping("/insights/dashboard")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<InsightsDashboardResponse>> insightsDashboard(
            @RequestParam(required = false) Integer windowDays,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                testInsightsService.dashboard(requireUserId(auth), windowDays),
                "Insights dashboard computed"));
    }

    /**
     * Detailed "where to improve" report: weak domains/courses/topics ranked
     * worst-first, difficulty gaps, and recurring mistakes mined from past attempts.
     */
    @GetMapping("/insights/improvement")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<ImprovementReportResponse>> improvementReport(
            @RequestParam(required = false) Integer windowDays,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                testInsightsService.improvementReport(requireUserId(auth), windowDays),
                "Improvement report computed"));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /**
     * Like {@link #currentUserId} but rejects callers without a backing user row
     * (e.g. ADMIN tokens), since insights are computed from a user's own history.
     */
    private String requireUserId(Authentication auth) {
        String id = currentUserId(auth);
        if (id == null) {
            throw new EntityNotFoundException(
                    "No learner profile for this account — insights require a USER login.");
        }
        return id;
    }


    /**
     * Resolves the authenticated user's id. For USER tokens the JWT filter sets the
     * principal name to the email; ADMIN tokens have no user row, so we return null
     * (admins can still take/grade tests — the attempt just isn't recorded).
     */
    private String currentUserId(Authentication auth) {
        if (auth == null) {
            throw new EntityNotFoundException("Unauthenticated");
        }
        return userRepo.findByEmail(auth.getName())
                .map(u -> u.getId())
                .orElse(null);
    }
}
