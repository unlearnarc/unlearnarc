package com.unlearnarc.role.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.role.dto.*;
import com.unlearnarc.role.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService service;

    // ── Role CRUD ───────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> create(@Valid @RequestBody RoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(service.create(request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(), "Roles fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id), "Role fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> update(
            @PathVariable String id, @Valid @RequestBody RoleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(id, request), "Role updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    // ── Role → Domain mapping ─────────────────────────────────────────────────────

    @PostMapping("/domains")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addDomain(@Valid @RequestBody RoleDomainMappingRequest request) {
        service.addDomain(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(null, "Domain mapped to role"));
    }

    @DeleteMapping("/{roleId}/domains/{domainId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeDomain(
            @PathVariable String roleId, @PathVariable String domainId) {
        service.removeDomain(roleId, domainId);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    // ── Role → Skill mapping ──────────────────────────────────────────────────────

    @PostMapping("/skills")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addSkill(@Valid @RequestBody RoleSkillMappingRequest request) {
        service.addSkill(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(null, "Skill mapped to role"));
    }

    @DeleteMapping("/{roleId}/skills/{skillId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeSkill(
            @PathVariable String roleId, @PathVariable String skillId) {
        service.removeSkill(roleId, skillId);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
