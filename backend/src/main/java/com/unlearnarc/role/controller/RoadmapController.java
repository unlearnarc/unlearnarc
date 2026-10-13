package com.unlearnarc.role.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.role.dto.RoadmapResponse;
import com.unlearnarc.role.service.RoadmapService;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/roadmap")
@RequiredArgsConstructor
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final UserRepository userRepo;

    /**
     * Full roadmap for a role (Role → Domains → Skills → Courses), with
     * per-course completion flags scoped to the authenticated user.
     */
    @GetMapping("/role/{roleId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<RoadmapResponse>> forRole(
            @PathVariable String roleId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                roadmapService.build(roleId, currentUserId(auth)), "Roadmap built"));
    }

    private String currentUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) return null;
        return userRepo.findByEmail(auth.getName()).map(User::getId).orElse(null);
    }
}
