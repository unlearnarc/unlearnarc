package com.unlearnarc.mapping.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.mapping.dto.UserDomainMappingRequest;
import com.unlearnarc.mapping.dto.UserDomainMappingResponse;
import com.unlearnarc.mapping.service.UserDomainMappingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user-domain-mappings")
@RequiredArgsConstructor
public class UserDomainMappingController {

    private final UserDomainMappingService service;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDomainMappingResponse>> create(
            @Valid @RequestBody UserDomainMappingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(service.create(request)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDomainMappingResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll(), "User-Domain mappings fetched"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDomainMappingResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id), "Mapping fetched"));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDomainMappingResponse>>> findByUserId(
            @PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByUserId(userId), "Mappings for user fetched"));
    }

    @GetMapping("/domain/{domainId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDomainMappingResponse>>> findByDomainId(
            @PathVariable String domainId) {
        return ResponseEntity.ok(ApiResponse.ok(service.findByDomainId(domainId), "Mappings for domain fetched"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
