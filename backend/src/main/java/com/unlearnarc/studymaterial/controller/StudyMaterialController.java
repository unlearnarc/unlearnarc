package com.unlearnarc.studymaterial.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.studymaterial.dto.StudyMaterialRequest;
import com.unlearnarc.studymaterial.dto.StudyMaterialResponse;
import com.unlearnarc.studymaterial.service.StudyMaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/study-materials")
@RequiredArgsConstructor
public class StudyMaterialController {

    private final StudyMaterialService studyMaterialService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StudyMaterialResponse>> create(@Valid @RequestBody StudyMaterialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(studyMaterialService.create(request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<StudyMaterialResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(studyMaterialService.findAll(), "Study materials fetched"));
    }

    @GetMapping("/topic/{topicId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<StudyMaterialResponse>>> findByTopicId(@PathVariable String topicId) {
        return ResponseEntity.ok(ApiResponse.ok(
                studyMaterialService.findByTopicId(topicId), "Study materials for topic fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<StudyMaterialResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(studyMaterialService.findById(id), "Study material fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StudyMaterialResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody StudyMaterialRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(studyMaterialService.update(id, request), "Study material updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        studyMaterialService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
