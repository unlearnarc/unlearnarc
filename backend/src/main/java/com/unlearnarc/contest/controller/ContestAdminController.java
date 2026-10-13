package com.unlearnarc.contest.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.contest.dto.*;
import com.unlearnarc.contest.entity.Contest.ContestStatus;
import com.unlearnarc.contest.service.ContestAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ADMIN contest management. Create contests, add LeetCode/NeetCode-style
 * problems and their test cases (public + hidden expected outputs), and
 * publish/archive contests. All endpoints require ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin/contests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ContestAdminController {

    private final ContestAdminService adminService;

    // ── Contest CRUD ──────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<ContestResponse>> create(
            @Valid @RequestBody ContestRequest req, Authentication auth) {
        String adminEmail = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(201)
                .body(ApiResponse.created(adminService.createContest(req, adminEmail)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ContestResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.listAll(), "Contests fetched"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ContestResponse>> update(
            @PathVariable String id, @Valid @RequestBody ContestRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.updateContest(id, req), "Contest updated"));
    }

    @PatchMapping("/{id}/status/{status}")
    public ResponseEntity<ApiResponse<ContestResponse>> setStatus(
            @PathVariable String id, @PathVariable ContestStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.setStatus(id, status), "Status updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        adminService.deleteContest(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    // ── Problems + test cases ──────────────────────────────────────────────────────

    @PostMapping("/{contestId}/problems")
    public ResponseEntity<ApiResponse<ContestProblemAdminResponse>> addProblem(
            @PathVariable String contestId, @Valid @RequestBody ContestProblemRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(adminService.addProblem(contestId, req)));
    }

    @GetMapping("/{contestId}/problems")
    public ResponseEntity<ApiResponse<List<ContestProblemAdminResponse>>> listProblems(
            @PathVariable String contestId) {
        return ResponseEntity.ok(ApiResponse.ok(
                adminService.listProblemsForAdmin(contestId), "Problems fetched"));
    }

    @PutMapping("/problems/{problemId}")
    public ResponseEntity<ApiResponse<ContestProblemAdminResponse>> updateProblem(
            @PathVariable String problemId, @Valid @RequestBody ContestProblemRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(
                adminService.updateProblem(problemId, req), "Problem updated"));
    }

    @DeleteMapping("/problems/{problemId}")
    public ResponseEntity<ApiResponse<Void>> deleteProblem(@PathVariable String problemId) {
        adminService.deleteProblem(problemId);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
