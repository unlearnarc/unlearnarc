package com.unlearnarc.user.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.user.service.ProfileSharingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProfileSharingController {
    private final ProfileSharingService sharing;

    @GetMapping("/user-auth/me/sharing")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<ProfileSharingService.Sharing>> settings(Authentication auth) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(sharing.settings(auth.getName()), "Sharing settings fetched"));
    }

    @PutMapping("/user-auth/me/sharing")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<ProfileSharingService.Sharing>> update(
            Authentication auth, @Valid @RequestBody SharingRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(sharing.setEnabled(auth.getName(), request.enabled()), "Sharing updated"));
    }

    @GetMapping("/public/profiles/{token}")
    public ResponseEntity<ApiResponse<ProfileSharingService.PublicProfile>> profile(@PathVariable String token) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.ok(sharing.publicProfile(token), "Public profile fetched"));
    }

    public record SharingRequest(@NotNull Boolean enabled) {}
}
