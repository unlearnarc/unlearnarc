package com.unlearnarc.authoring;

import com.unlearnarc.authoring.AuthoringModels.*;
import com.unlearnarc.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/v1/admin/ai-authoring")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AuthoringController {
    private final AuthoringService service;
    private final AiContentGenerator generator;
    private final Semaphore generationSlot = new Semaphore(1);
    private final AtomicLong nextGeneration = new AtomicLong();

    @GetMapping("/status")
    public ApiResponse<?> status() {
        return ApiResponse.ok(Map.of("configured", generator.configured()), "AI authoring status");
    }
    @GetMapping("/jobs")
    public ApiResponse<?> history(Principal principal) {
        return ApiResponse.ok(service.history(principal.getName()), "Recent authoring jobs");
    }
    @PostMapping("/jobs")
    public ApiResponse<?> generate(Principal principal, @Valid @RequestBody GenerateRequest request) {
        if (!generationSlot.tryAcquire()) throw new IllegalStateException("Another generation is running. Please wait.");
        try {
            long now = System.currentTimeMillis();
            if (now < nextGeneration.get()) throw new IllegalStateException("Wait a few seconds before generating again.");
            nextGeneration.set(now + 10000);
            return ApiResponse.created(service.generate(principal.getName(), request));
        } finally { generationSlot.release(); }
    }
    @PutMapping("/jobs/{id}")
    public ApiResponse<?> review(Principal principal, @PathVariable String id, @Valid @RequestBody ProposalRequest request) {
        return ApiResponse.ok(service.review(principal.getName(), id, request.proposal()), "Proposal validated and draft updated");
    }
    @PostMapping("/jobs/{id}/save")
    public ApiResponse<?> save(Principal principal, @PathVariable String id) {
        return ApiResponse.ok(service.save(principal.getName(), id), "Approved content saved");
    }
}
