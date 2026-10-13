package com.unlearnarc.quspool.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<QuestionResponse>> create(
            @Valid @RequestBody QuestionRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(questionService.create(req)));
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> bulkCreate(
            @Valid @RequestBody List<QuestionRequest> requests) {
        return ResponseEntity.status(201)
                .body(ApiResponse.created(questionService.bulkCreate(requests)));
    }

    @GetMapping("/pool/{poolId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> byPool(
            @PathVariable String poolId) {
        return ResponseEntity.ok(ApiResponse.ok(
                questionService.findByPool(poolId), "Questions fetched"));
    }

    @GetMapping("/pool/{poolId}/difficulty/{difficulty}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> byPoolAndDifficulty(
            @PathVariable String poolId,
            @PathVariable Difficulty difficulty) {
        return ResponseEntity.ok(ApiResponse.ok(
                questionService.findByPoolAndDifficulty(poolId, difficulty), "Questions fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<QuestionResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(questionService.findById(id), "Question fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<QuestionResponse>> update(
            @PathVariable String id, @Valid @RequestBody QuestionRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(questionService.update(id, req), "Question updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        questionService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> toggleActive(@PathVariable String id) {
        questionService.toggleActive(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Question status toggled"));
    }
}
