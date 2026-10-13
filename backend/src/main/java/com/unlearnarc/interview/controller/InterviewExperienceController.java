package com.unlearnarc.interview.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.interview.dto.InterviewExperienceRequest;
import com.unlearnarc.interview.dto.InterviewExperienceResponse;
import com.unlearnarc.interview.service.InterviewExperienceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/interview-experiences")
@RequiredArgsConstructor
public class InterviewExperienceController {

    private final InterviewExperienceService service;

    /** Student shares a new interview experience. Starts unverified, pending admin review. */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<InterviewExperienceResponse>> create(
            Authentication authentication,
            @Valid @RequestBody InterviewExperienceRequest request) {
        InterviewExperienceResponse created = service.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(created));
    }

    /** Public feed — verified experiences only (optionally filtered by company). */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<InterviewExperienceResponse>>> findAll(
            @RequestParam(value = "company", required = false) String company) {
        List<InterviewExperienceResponse> data = (company == null || company.isBlank())
                ? service.findVerified()
                : service.findVerifiedByCompany(company);
        return ResponseEntity.ok(ApiResponse.ok(data, "Interview experiences fetched"));
    }

    /** List the authenticated student's own experiences (verified or not). */
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<InterviewExperienceResponse>>> findMine(
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.findMine(authentication.getName()), "My interview experiences fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<InterviewExperienceResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id), "Interview experience fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<InterviewExperienceResponse>> update(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody InterviewExperienceRequest request) {
        InterviewExperienceResponse updated = service.update(
                id, authentication.getName(), isAdmin(authentication), request);
        return ResponseEntity.ok(ApiResponse.ok(updated, "Interview experience updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication,
            @PathVariable String id) {
        service.delete(id, authentication.getName(), isAdmin(authentication));
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    // ── Admin moderation ────────────────────────────────────────────────────────

    /** Admin — list all experiences; optional ?verified=true|false filter (moderation queue). */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<InterviewExperienceResponse>>> findAllForAdmin(
            @RequestParam(value = "verified", required = false) Boolean verified) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.findAllForAdmin(verified), "Interview experiences fetched"));
    }

    /** Admin — approve a post so it appears in the public feed. */
    @PatchMapping("/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InterviewExperienceResponse>> verify(
            Authentication authentication,
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.setVerified(id, authentication.getName(), true),
                "Interview experience verified"));
    }

    /** Admin — revoke verification (hide from the public feed again). */
    @PatchMapping("/{id}/unverify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InterviewExperienceResponse>> unverify(
            Authentication authentication,
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.setVerified(id, authentication.getName(), false),
                "Interview experience unverified"));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }
}
