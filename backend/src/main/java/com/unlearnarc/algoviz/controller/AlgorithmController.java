package com.unlearnarc.algoviz.controller;

import com.unlearnarc.algoviz.dto.AlgorithmRequest;
import com.unlearnarc.algoviz.dto.AlgorithmResponse;
import com.unlearnarc.algoviz.dto.AlgorithmSummaryResponse;
import com.unlearnarc.algoviz.service.AlgorithmService;
import com.unlearnarc.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/algorithms")
@RequiredArgsConstructor
public class AlgorithmController {

    private final AlgorithmService service;

    // ── Admin (manage) ──────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AlgorithmResponse>> create(
            @Valid @RequestBody AlgorithmRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AlgorithmResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody AlgorithmRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, request), "Algorithm updated"));
    }

    /** Dry-run validation — no persistence. */
    @PostMapping("/validate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> validate(
            @Valid @RequestBody AlgorithmRequest request) {
        service.validate(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Spec is valid"));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AlgorithmSummaryResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(), "Algorithms fetched"));
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AlgorithmResponse>> publish(
            @PathVariable String id,
            @RequestParam boolean value) {
        return ResponseEntity.ok(
                ApiResponse.ok(service.setPublished(id, value),
                        value ? "Algorithm published" : "Algorithm unpublished"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    // ── Shared / student (consume) ──────────────────────────────────────────
    @GetMapping("/published")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<AlgorithmSummaryResponse>>> findPublished() {
        return ResponseEntity.ok(ApiResponse.ok(service.findPublished(), "Published algorithms fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<AlgorithmResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id), "Algorithm fetched"));
    }

    @GetMapping("/slug/{slug}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<AlgorithmResponse>> findBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(service.findBySlug(slug), "Algorithm fetched"));
    }
}
