package com.unlearnarc.note.service;

import com.unlearnarc.common.HtmlSanitizer;
import com.unlearnarc.course.repository.CourseRepository;
import com.unlearnarc.note.dto.NoteRequest;
import com.unlearnarc.note.dto.NoteResponse;
import com.unlearnarc.note.dto.NoteSummaryResponse;
import com.unlearnarc.note.entity.Note;
import com.unlearnarc.note.mapper.NoteMapper;
import com.unlearnarc.note.repository.NoteRepository;
import com.unlearnarc.topic.repository.TopicRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Admin-authored, book-style lessons attached to a topic or a course.
 *
 * <p>Every mutating path sanitizes {@code contentHtml} with the authoritative
 * server-side {@link HtmlSanitizer} before persisting — the stored HTML is what
 * students render, so the backend must never trust the client payload.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class NoteService {

    private final NoteRepository noteRepository;
    private final TopicRepository topicRepository;
    private final CourseRepository courseRepository;
    private final NoteMapper noteMapper;
    private final HtmlSanitizer htmlSanitizer;

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    public NoteResponse create(NoteRequest request) {
        validateParent(request);
        Note note = noteMapper.toEntity(request);
        note.setContentHtml(htmlSanitizer.sanitize(note.getContentHtml()));
        if (note.getNoteOrder() == null) note.setNoteOrder(0L);
        if (note.getIsPublished() == null) note.setIsPublished(false);
        return noteMapper.toResponse(noteRepository.save(note));
    }

    public NoteResponse update(String id, NoteRequest request) {
        Note note = getOrThrow(id);
        validateParent(request);
        noteMapper.updateEntity(request, note);
        note.setContentHtml(htmlSanitizer.sanitize(note.getContentHtml()));
        if (note.getNoteOrder() == null) note.setNoteOrder(0L);
        if (note.getIsPublished() == null) note.setIsPublished(false);
        return noteMapper.toResponse(noteRepository.save(note));
    }

    public NoteResponse setPublished(String id, boolean published) {
        Note note = getOrThrow(id);
        note.setIsPublished(published);
        return noteMapper.toResponse(noteRepository.save(note));
    }

    public void delete(String id) {
        getOrThrow(id);
        noteRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public NoteResponse findById(String id) {
        return noteMapper.toResponse(getOrThrow(id));
    }

    /** Admin — all notes for a topic incl. drafts. */
    @Transactional(readOnly = true)
    public List<NoteSummaryResponse> findByTopicIdForAdmin(String topicId) {
        return noteRepository.findByTopicIdOrderByNoteOrderAscCreatedAtAsc(topicId)
                .stream().map(noteMapper::toSummary).toList();
    }

    /** Admin — all notes for a course incl. drafts. */
    @Transactional(readOnly = true)
    public List<NoteSummaryResponse> findByCourseIdForAdmin(String courseId) {
        return noteRepository.findByCourseIdOrderByNoteOrderAscCreatedAtAsc(courseId)
                .stream().map(noteMapper::toSummary).toList();
    }

    // ── Student (published only) ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NoteSummaryResponse> findPublishedByTopicId(String topicId) {
        return noteRepository.findByTopicIdAndIsPublishedTrueOrderByNoteOrderAscCreatedAtAsc(topicId)
                .stream().map(noteMapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<NoteSummaryResponse> findPublishedByCourseId(String courseId) {
        return noteRepository.findByCourseIdAndIsPublishedTrueOrderByNoteOrderAscCreatedAtAsc(courseId)
                .stream().map(noteMapper::toSummary).toList();
    }

    /** Student — full note, but only if published. */
    @Transactional(readOnly = true)
    public NoteResponse findPublishedById(String id) {
        Note note = getOrThrow(id);
        if (!Boolean.TRUE.equals(note.getIsPublished())) {
            throw new EntityNotFoundException("Note not found: " + id);
        }
        return noteMapper.toResponse(note);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private Note getOrThrow(String id) {
        return noteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Note not found: " + id));
    }

    /**
     * A note belongs to exactly one parent — a topic OR a course. Validates that
     * precisely one id is present and that the referenced entity exists.
     */
    private void validateParent(NoteRequest request) {
        boolean hasTopic  = request.getTopicId()  != null && !request.getTopicId().isBlank();
        boolean hasCourse = request.getCourseId() != null && !request.getCourseId().isBlank();

        if (hasTopic == hasCourse) {
            throw new IllegalArgumentException("Provide exactly one of topicId or courseId.");
        }
        if (hasTopic && !topicRepository.existsById(request.getTopicId())) {
            throw new EntityNotFoundException("Topic not found: " + request.getTopicId());
        }
        if (hasCourse && !courseRepository.existsById(request.getCourseId())) {
            throw new EntityNotFoundException("Course not found: " + request.getCourseId());
        }
    }
}
