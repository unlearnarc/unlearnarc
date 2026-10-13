package com.unlearnarc.skill.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.skill.dto.SkillRequest;
import com.unlearnarc.skill.dto.SkillResponse;
import com.unlearnarc.skill.service.SkillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SkillResponse>> create(@Valid @RequestBody SkillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(skillService.create(request)));
    }

    @GetMapping
    // Public: readable without authentication
    public ResponseEntity<ApiResponse<List<SkillResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(skillService.findAll(), "Skills fetched"));
    }

    @GetMapping("/{id}")
    // Public: readable without authentication
    public ResponseEntity<ApiResponse<SkillResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(skillService.findById(id), "Skill fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SkillResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(skillService.update(id, request), "Skill updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        skillService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
