package com.unlearnarc.user.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.user.dto.StreakCalendarResponse;
import com.unlearnarc.user.dto.StreakResponse;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.service.StreakService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Streak endpoints for the authenticated student.
 *
 * <p>The JWT subject is the user's email (see {@code JwtAuthenticationFilter}),
 * so we resolve the user id from the email here.</p>
 *
 * <ul>
 *   <li>GET  /api/v1/user-auth/me/streak           → read current streak (no mutation)</li>
 *   <li>GET  /api/v1/user-auth/me/streak/calendar  → active days + stats for a window</li>
 *   <li>POST /api/v1/user-auth/me/streak/ping      → mark the user active today</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/user-auth/me/streak")
@RequiredArgsConstructor
public class StreakController {

    private final StreakService  streakService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<StreakResponse>> getStreak(Authentication authentication) {
        String userId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.ok(
                streakService.getStreak(userId), "Streak fetched"));
    }

    /**
     * Calendar of active days for the profile heat-map. Both params are optional:
     * defaults to the trailing 365 days ending today. Format: yyyy-MM-dd.
     */
    @GetMapping("/calendar")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<StreakCalendarResponse>> getCalendar(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        String userId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.ok(
                streakService.getCalendar(userId, from, to), "Streak calendar fetched"));
    }

    /**
     * Records today's activity and returns the updated streak. Idempotent per
     * day. Call this from the client once per session (e.g. on app load) and/or
     * let server-side flows call {@link StreakService#recordActivity(String)}
     * directly when a user completes a meaningful action.
     */
    @PostMapping("/ping")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<StreakResponse>> ping(Authentication authentication) {
        String userId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.ok(
                streakService.recordActivity(userId), "Streak updated"));
    }

    private String resolveUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found."))
                .getId();
    }
}
