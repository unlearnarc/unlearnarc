package com.unlearnarc.note.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.note.dto.NoteRequest;
import com.unlearnarc.note.dto.NoteResponse;
import com.unlearnarc.note.dto.NoteSummaryResponse;
import com.unlearnarc.note.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Notes = book-style, admin-authored lessons rendered inside the app.
 *
 * <p>Admin endpoints (create / update / delete / publish, and "all incl. drafts"
 * listings) require ROLE_ADMIN. Student read endpoints expose published notes
 * only and are open to any authenticated user (and are whitelisted for public
 * reads in SecurityConfig, matching the catalog pattern).
 */
@RestController
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    // ── Admin CRUD ─────────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NoteResponse>> create(@Valid @RequestBody NoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(noteService.create(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NoteResponse>> update(
            @PathVariable String id, @Valid @RequestBody NoteRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(noteService.update(id, request), "Note updated"));
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NoteResponse>> setPublished(
            @PathVariable String id, @RequestParam("value") boolean value) {
        return ResponseEntity.ok(ApiResponse.ok(
                noteService.setPublished(id, value),
                value ? "Note published" : "Note unpublished"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        noteService.delete(id);
        return ResponseEntity.ok(ApiResponse.deleted());
    }

    /** Admin — all notes for a topic (incl. drafts). */
    @GetMapping("/admin/topic/{topicId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> findByTopicForAdmin(
            @PathVariable String topicId) {
        return ResponseEntity.ok(ApiResponse.ok(
                noteService.findByTopicIdForAdmin(topicId), "Notes fetched"));
    }

    /** Admin — all notes for a course (incl. drafts). */
    @GetMapping("/admin/course/{courseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> findByCourseForAdmin(
            @PathVariable String courseId) {
        return ResponseEntity.ok(ApiResponse.ok(
                noteService.findByCourseIdForAdmin(courseId), "Notes fetched"));
    }

    // ── Student reads (published only) ──────────────────────────────────────────

    @GetMapping("/topic/{topicId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> findPublishedByTopic(
            @PathVariable String topicId) {
        return ResponseEntity.ok(ApiResponse.ok(
                noteService.findPublishedByTopicId(topicId), "Notes fetched"));
    }

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<List<NoteSummaryResponse>>> findPublishedByCourse(
            @PathVariable String courseId) {
        return ResponseEntity.ok(ApiResponse.ok(
                noteService.findPublishedByCourseId(courseId), "Notes fetched"));
    }

    /** Full note body. Admins can read drafts; students only published. */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<ApiResponse<NoteResponse>> findById(
            @PathVariable String id,
            org.springframework.security.core.Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        NoteResponse note = isAdmin ? noteService.findById(id) : noteService.findPublishedById(id);
        return ResponseEntity.ok(ApiResponse.ok(note, "Note fetched"));
    }
}
