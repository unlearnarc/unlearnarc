package com.unlearnarc.user.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.user.dto.LeaderboardRow;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.service.LeaderboardService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Points leaderboard API — global ranking plus region-scoped boards.
 *
 * All endpoints require a valid JWT (any authenticated USER/ADMIN); the
 * leaderboard reflects the whole platform so no role gating is applied beyond that.
 */
@RestController
@RequestMapping("/api/v1/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final UserRepository userRepo;

    /** Global top-N. ?limit=50 (max 100). */
    @GetMapping
    public ResponseEntity<ApiResponse<List<LeaderboardRow>>> global(
            @RequestParam(defaultValue = "50") int limit,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                leaderboardService.global(limit, currentUserId(auth)), "Leaderboard fetched"));
    }

    /** Region-scoped board, e.g. /region/IN?limit=50 */
    @GetMapping("/region/{region}")
    public ResponseEntity<ApiResponse<List<LeaderboardRow>>> region(
            @PathVariable String region,
            @RequestParam(defaultValue = "50") int limit,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                leaderboardService.region(region, limit, currentUserId(auth)), "Region leaderboard fetched"));
    }

    /** Distinct regions that currently have scored users — powers the region picker. */
    @GetMapping("/regions")
    public ResponseEntity<ApiResponse<List<String>>> regions() {
        return ResponseEntity.ok(ApiResponse.ok(leaderboardService.regions(), "Regions fetched"));
    }

    /** The requester's own global rank + points. */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<LeaderboardRow>> me(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                leaderboardService.myStanding(currentUserId(auth)), "Your standing fetched"));
    }

    /** USER tokens carry the email as principal name; resolve to the user id. */
    private String currentUserId(Authentication auth) {
        if (auth == null) return null;
        return userRepo.findByEmail(auth.getName())
                .map(User::getId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + auth.getName()));
    }
}
