package com.unlearnarc.note.repository;

import com.unlearnarc.note.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, String> {

    // ── Admin (all, incl. drafts) ────────────────────────────────────────────
    List<Note> findByTopicIdOrderByNoteOrderAscCreatedAtAsc(String topicId);

    List<Note> findByCourseIdOrderByNoteOrderAscCreatedAtAsc(String courseId);

    // ── Student (published only) ─────────────────────────────────────────────
    List<Note> findByTopicIdAndIsPublishedTrueOrderByNoteOrderAscCreatedAtAsc(String topicId);

    List<Note> findByCourseIdAndIsPublishedTrueOrderByNoteOrderAscCreatedAtAsc(String courseId);
}
