package com.unlearnarc.canvasanim.controller;

import com.unlearnarc.canvasanim.dto.AnimationSceneRequest;
import com.unlearnarc.canvasanim.dto.AnimationSceneResponse;
import com.unlearnarc.canvasanim.dto.AnimationSceneSummaryResponse;
import com.unlearnarc.canvasanim.entity.AnimationScene.Category;
import com.unlearnarc.canvasanim.service.AnimationSceneService;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST surface for canvas animation scenes. Mirrors the AlgorithmController
 * conventions (ApiResponse envelope, role gating) so the two subsystems feel
 * consistent to the client.
 */
@RestController
@RequestMapping("/api/v1/animation-scenes")
@RequiredArgsConstructor
public class AnimationSceneController {

    private final AnimationSceneService service;

    // ── Admin (manage) ──────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AnimationSceneResponse>> create(
            @Valid @RequestBody AnimationSceneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AnimationSceneResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody AnimationSceneRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, request), "Scene updated"));
    }

    /** Dry-run validation (and generation for GENERATED scenes) — no persistence. */
    @PostMapping("/validate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AnimationTrace>> validate(
            @Valid @RequestBody AnimationSceneRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.validate(request), "Trace is valid"));
    }

    /** List all available simulators + their param schemas for the admin UI. */
    @GetMapping("/simulators")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> simulators() {
        return ResponseEntity.ok(ApiResponse.ok(service.simulatorCatalog(), "Simulators fetched"));
    }

    /** On-demand simulator preview — build a trace without saving a scene. */
    @PostMapping("/simulators/{kind}/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AnimationTrace>> preview(
            @PathVariable String kind,
            @RequestBody(required = false) Map<String, Object> params) {
        return ResponseEntity.ok(
                ApiResponse.ok(service.preview(kind, params == null ? Map.of() : params),
                        "Trace generated"));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AnimationSceneSummaryResponse>>> findAll(
            @RequestParam(required = false) Category category) {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(category), "Scenes fetched"));
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AnimationSceneResponse>> publish(
            @PathVariable String id,
            @RequestParam boolean value) {
        return ResponseEntity.ok(
                ApiResponse.ok(service.setPublished(id, value),
                        value ? "Scene published" : "Scene unpublished"));
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
    public ResponseEntity<ApiResponse<List<AnimationSceneSummaryResponse>>> findPublished(
            @RequestParam(required = false) Category category) {
        return ResponseEntity.ok(
                ApiResponse.ok(service.findPublished(category), "Published scenes fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<AnimationSceneResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id), "Scene fetched"));
    }

    @GetMapping("/slug/{slug}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<AnimationSceneResponse>> findBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(service.findBySlug(slug), "Scene fetched"));
    }
}
