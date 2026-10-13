package com.unlearnarc.enrollment.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.enrollment.dto.EnrolledCourseResponse;
import com.unlearnarc.enrollment.service.EnrollmentService;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * STUDENT-facing "my learnings" API.
 *
 * The authenticated user is resolved from the JWT: for USER tokens the filter
 * sets the principal name to the email, so we look up the user id by email
 * (same pattern as ContestController).
 */
@RestController
@RequestMapping("/api/v1/enrollments")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public class EnrollmentController {

    private final EnrollmentService service;
    private final UserRepository userRepo;

    /** Start learning a course — maps it to the current user. Idempotent. */
    @PostMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<EnrolledCourseResponse>> enroll(
            @PathVariable String courseId, Authentication auth) {
        EnrolledCourseResponse res = service.enroll(currentUserId(auth), courseId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(res, "Course added to your learnings"));
    }

    /** Stop learning a course. */
    @DeleteMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<Void>> unenroll(
            @PathVariable String courseId, Authentication auth) {
        service.unenroll(currentUserId(auth), courseId);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    /** All courses the current user has started. */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<EnrolledCourseResponse>>> findMine(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.findMine(currentUserId(auth)), "My learnings fetched"));
    }

    /** Whether the current user has started a specific course. */
    @GetMapping("/course/{courseId}/status")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> status(
            @PathVariable String courseId, Authentication auth) {
        boolean enrolled = service.isEnrolled(currentUserId(auth), courseId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("enrolled", enrolled), "Enrollment status fetched"));
    }

    private String currentUserId(Authentication auth) {
        if (auth == null) {
            throw new EntityNotFoundException("Unauthenticated");
        }
        String email = auth.getName();
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + email));
        return user.getId();
    }
}
