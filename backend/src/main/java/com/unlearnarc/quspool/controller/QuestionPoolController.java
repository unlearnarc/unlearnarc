package com.unlearnarc.quspool.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.entity.QuestionPool.ScopeType;
import com.unlearnarc.quspool.service.QuestionPoolService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/question-pools")
@RequiredArgsConstructor
public class QuestionPoolController {

    private final QuestionPoolService poolService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<QuestionPoolResponse>> create(
            @Valid @RequestBody QuestionPoolRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(poolService.create(req)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionPoolResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(poolService.findAll(), "Question pools fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<QuestionPoolResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(poolService.findById(id), "Pool fetched"));
    }

    @GetMapping("/scope/{scopeType}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionPoolResponse>>> findByScope(
            @PathVariable ScopeType scopeType) {
        return ResponseEntity.ok(ApiResponse.ok(poolService.findByScopeType(scopeType), "Pools fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<QuestionPoolResponse>> update(
            @PathVariable String id, @Valid @RequestBody QuestionPoolRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(poolService.update(id, req), "Pool updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        poolService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> toggleActive(@PathVariable String id) {
        poolService.toggleActive(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Pool status toggled"));
    }

    @PostMapping("/map")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> mapToEntity(
            @Valid @RequestBody PoolMappingRequest req) {
        poolService.mapToEntity(req);
        return ResponseEntity.status(201)
                .body(ApiResponse.ok(null, "Pool mapped successfully"));
    }

    @GetMapping("/by-domain/{domainId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionPoolResponse>>> byDomain(
            @PathVariable String domainId) {
        return ResponseEntity.ok(ApiResponse.ok(
                poolService.findPoolsByDomain(domainId), "Domain pools fetched"));
    }

    @GetMapping("/by-course/{courseId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionPoolResponse>>> byCourse(
            @PathVariable String courseId) {
        return ResponseEntity.ok(ApiResponse.ok(
                poolService.findPoolsByCourse(courseId), "Course pools fetched"));
    }

    @GetMapping("/by-topic/{topicId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionPoolResponse>>> byTopic(
            @PathVariable String topicId) {
        return ResponseEntity.ok(ApiResponse.ok(
                poolService.findPoolsByTopic(topicId), "Topic pools fetched"));
    }
}
