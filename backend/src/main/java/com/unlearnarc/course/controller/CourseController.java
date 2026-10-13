package com.unlearnarc.course.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.course.dto.CourseRequest;
import com.unlearnarc.course.dto.CourseResponse;
import com.unlearnarc.course.service.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseResponse>> create(@Valid @RequestBody CourseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(courseService.create(request)));
    }

    @GetMapping
    // Public: readable without authentication
    public ResponseEntity<ApiResponse<List<CourseResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(courseService.findAll(), "Courses fetched"));
    }

    @GetMapping("/{id}")
    // Public: readable without authentication
    public ResponseEntity<ApiResponse<CourseResponse>> findById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.findById(id), "Course fetched"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CourseResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody CourseRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(courseService.update(id, request), "Course updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        courseService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }
}
