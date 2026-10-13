package com.unlearnarc.domain.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.domain.dto.DomainRequest;
import com.unlearnarc.domain.dto.DomainResponse;
import com.unlearnarc.domain.service.DomainService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/domains")
@RequiredArgsConstructor
public class DomainController {

    private final DomainService domainService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DomainResponse>> create(@Valid @RequestBody DomainRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(domainService.create(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DomainResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(domainService.findAll(), "Domains fetched"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DomainResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(domainService.findById(id), "Domain fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DomainResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody DomainRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(domainService.update(id, request), "Domain updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        domainService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
