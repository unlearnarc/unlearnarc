package com.unlearnarc.security.auth.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.security.auth.dto.AuthResponse;
import com.unlearnarc.security.auth.dto.LoginRequest;
import com.unlearnarc.security.auth.dto.RefreshRequest;
import com.unlearnarc.security.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/v1/auth/login
     * Body: { "email": "unlearnarc@gmail.com", "password": "Admin@123" }
     *
     * Returns: accessToken (24h), refreshToken (7d), role, expiresIn
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Login successful"));
    }

    /**
     * POST /api/v1/auth/refresh
     * Body: { "refreshToken": "<token>" }
     *
     * Rotates both access and refresh tokens.
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshRequest request) {

        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Token refreshed"));
    }

    /**
     * GET /api/v1/auth/me
     * Requires: Authorization: Bearer <accessToken>
     *
     * Returns the currently authenticated admin's details.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<String>> me(
            org.springframework.security.core.Authentication authentication) {

        return ResponseEntity.ok(
                ApiResponse.ok("Authenticated as: " + authentication.getName(), "OK"));
    }

    /**
     * GET /api/v1/health
     * Public – no token needed.
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health() {
        return ResponseEntity.ok(ApiResponse.ok("UnlearnArc API is running", "healthy"));
    }
}
