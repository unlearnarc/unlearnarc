package com.unlearnarc.mapping.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.mapping.dto.DomainSkillMappingRequest;
import com.unlearnarc.mapping.dto.DomainSkillMappingResponse;
import com.unlearnarc.mapping.service.DomainSkillMappingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/domain-skill-mappings")
@RequiredArgsConstructor
public class DomainSkillMappingController {

    private final DomainSkillMappingService service;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DomainSkillMappingResponse>> create(
            @Valid @RequestBody DomainSkillMappingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.create(request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<DomainSkillMappingResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(), "Domain-Skill mappings fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<DomainSkillMappingResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id), "Mapping fetched"));
    }

    @GetMapping("/domain/{domainId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<DomainSkillMappingResponse>>> findByDomainId(
            @PathVariable String domainId) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByDomainId(domainId), "Mappings for domain fetched"));
    }

    @GetMapping("/skill/{skillId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<DomainSkillMappingResponse>>> findBySkillId(
            @PathVariable String skillId) {
        return ResponseEntity.ok(ApiResponse.ok(service.findBySkillId(skillId), "Mappings for skill fetched"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
