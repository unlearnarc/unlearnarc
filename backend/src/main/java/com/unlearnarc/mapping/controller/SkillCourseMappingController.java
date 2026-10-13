package com.unlearnarc.mapping.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.mapping.dto.SkillCourseMappingRequest;
import com.unlearnarc.mapping.dto.SkillCourseMappingResponse;
import com.unlearnarc.mapping.service.SkillCourseMappingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/skill-course-mappings")
@RequiredArgsConstructor
public class SkillCourseMappingController {

    private final SkillCourseMappingService service;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SkillCourseMappingResponse>> create(
            @Valid @RequestBody SkillCourseMappingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.create(request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<SkillCourseMappingResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(), "Skill-Course mappings fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<SkillCourseMappingResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id), "Mapping fetched"));
    }

    @GetMapping("/skill/{skillId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<SkillCourseMappingResponse>>> findBySkillId(
            @PathVariable String skillId) {
        return ResponseEntity.ok(ApiResponse.ok(service.findBySkillId(skillId), "Mappings for skill fetched"));
    }

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<SkillCourseMappingResponse>>> findByCourseId(
            @PathVariable String courseId) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByCourseId(courseId), "Mappings for course fetched"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
