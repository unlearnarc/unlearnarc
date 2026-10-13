package com.unlearnarc.security.oauth2.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.security.auth.dto.AuthResponse;
import com.unlearnarc.security.auth.dto.RefreshRequest;
import com.unlearnarc.security.jwt.JwtTokenProvider;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Slf4j
@RestController
@RequestMapping("/api/v1/user-auth")
@RequiredArgsConstructor
public class UserAuthController {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository   userRepository;

    // Public — no @PreAuthorize (already permitted in SecurityConfig)
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshRequest request) {

        String refreshToken = request.getRefreshToken();

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BadCredentialsException("Refresh token is invalid or expired.");
        }

        String role = jwtTokenProvider.getRoleFromToken(refreshToken);
        if (!"USER".equals(role)) {
            throw new BadCredentialsException("Invalid token type for user refresh.");
        }

        String email  = jwtTokenProvider.getEmailFromToken(refreshToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found."));

        String newAccessToken  = jwtTokenProvider.generateUserAccessToken(user);
        String newRefreshToken = jwtTokenProvider.generateUserRefreshToken(user);

        log.info("[USER-AUTH] Token refreshed for: {}", email);

        AuthResponse response = AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(86400L)
                .email(email)
                .role("USER")
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response, "Token refreshed"));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> me(Authentication authentication) {
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found."));

        return ResponseEntity.ok(ApiResponse.ok(
                UserProfileResponse.from(user), "Profile fetched"));
    }

    /**
     * Lets the authenticated user set / update their own region.
     * Driven by the profile form (manual select) or the browser Geolocation
     * API (if the user grants permission) — the frontend resolves a region
     * code and PATCHes it here. Region feeds the region-scoped leaderboard.
     */
    @PatchMapping("/me/region")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateRegion(
            Authentication authentication,
            @Valid @RequestBody UpdateRegionRequest request) {

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found."));

        // Normalise: trim + uppercase a short region code (e.g. "in" -> "IN").
        String region = request.region().trim().toUpperCase();
        user.setRegion(region);
        userRepository.save(user);

        log.info("[USER-AUTH] Region updated to '{}' for: {}", region, email);

        return ResponseEntity.ok(ApiResponse.ok(
                UserProfileResponse.from(user), "Region updated"));
    }

    public record UpdateRegionRequest(
            @NotBlank(message = "Region must not be blank")
            @Size(max = 100, message = "Region is too long")
            String region
    ) {}

    /**
     * Persists the authenticated user's "Coach Buddy" (mascot companion)
     * preferences so the chosen character / personality vibe / mute state follow
     * them across devices instead of living only in browser localStorage.
     *
     * <p>All fields are optional — only the ones present in the body are updated
     * (PATCH semantics), so the client can persist a single toggle.</p>
     */
    @PatchMapping("/me/mascot")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMascotPrefs(
            Authentication authentication,
            @Valid @RequestBody UpdateMascotRequest request) {

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found."));

        if (request.character() != null && !request.character().isBlank()) {
            user.setMascotCharacter(request.character().trim());
        }
        if (request.vibe() != null && !request.vibe().isBlank()) {
            user.setMascotVibe(request.vibe().trim().toLowerCase());
        }
        if (request.muted() != null) {
            user.setMascotMuted(request.muted());
        }
        userRepository.save(user);

        log.info("[USER-AUTH] Mascot prefs updated for {}: character={} vibe={} muted={}",
                email, user.getMascotCharacter(), user.getMascotVibe(), user.getMascotMuted());

        return ResponseEntity.ok(ApiResponse.ok(
                UserProfileResponse.from(user), "Mascot preferences updated"));
    }

    public record UpdateMascotRequest(
            @Size(max = 40, message = "Character id is too long")
            String character,
            @Size(max = 20, message = "Vibe is too long")
            String vibe,
            Boolean muted
    ) {}

    public record UserProfileResponse(
            String  id,
            String  name,
            String  email,
            String  region,
            Long    rank,
            Long    points,
            String  profilePicture,
            Boolean isActive,
            // ── streak fields (null-safe; surfaced on the profile) ──
            Integer   currentStreak,
            Integer   longestStreak,
            LocalDate lastActivityDate,
            // ── mascot companion preferences ──
            String    mascotCharacter,
            String    mascotVibe,
            Boolean   mascotMuted
    ) {
        public static UserProfileResponse from(User u) {
            // Compute the "live" current streak without mutating state: a streak
            // is only alive if the last activity was today or yesterday.
            LocalDate last = u.getLastActivityDate();
            int current = (last != null
                    && ChronoUnit.DAYS.between(last, LocalDate.now()) <= 1)
                    ? u.getCurrentStreak() : 0;

            return new UserProfileResponse(
                    u.getId(), u.getName(), u.getEmail(),
                    u.getRegion(), u.getRank(), u.getPoints(),
                    u.getProfilePicture(), u.getIsActive(),
                    current, u.getLongestStreak(), last,
                    u.getMascotCharacter(), u.getMascotVibe(), u.getMascotMuted());
        }
    }
}
