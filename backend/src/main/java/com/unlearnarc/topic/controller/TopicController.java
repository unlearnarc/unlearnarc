package com.unlearnarc.topic.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.topic.dto.TopicRequest;
import com.unlearnarc.topic.dto.TopicResponse;
import com.unlearnarc.topic.service.TopicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/topics")
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TopicResponse>> create(@Valid @RequestBody TopicRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(topicService.create(request)));
    }

    @GetMapping
    // Public: readable without authentication
    public ResponseEntity<ApiResponse<List<TopicResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(topicService.findAll(), "Topics fetched"));
    }

    @GetMapping({"/by-course/{courseId}", "/course/{courseId}"})
    // Public: readable without authentication
    public ResponseEntity<ApiResponse<List<TopicResponse>>> findByCourseId(@PathVariable String courseId) {
        return ResponseEntity.ok(ApiResponse.ok(
                topicService.findByCourseId(courseId), "Topics for course fetched"));
    }

    @GetMapping("/{id}")
    // Public: readable without authentication
    public ResponseEntity<ApiResponse<TopicResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(topicService.findById(id), "Topic fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TopicResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody TopicRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(topicService.update(id, request), "Topic updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        topicService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
