package com.unlearnarc.note.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A book-style, admin-authored lesson ("note") for a topic or an entire course.
 *
 * <p>Unlike {@code StudyMaterial} — which is just an external link — a Note stores
 * authored rich HTML (headings, bold/italics, lists, quotes, inline images and
 * links) plus references to reusable visual "blocks" (animation scenes / algorithm
 * visualizers embedded by slug). Students read notes directly inside the app for a
 * visual, textbook-like experience.
 *
 * <p>The HTML in {@code contentHtml} is always run through the server-side
 * {@code HtmlSanitizer} before persistence — never trust client markup.
 *
 * <p>Table {@code note} is auto-created by Hibernate (ddl-auto=update); the
 * canonical definition lives in {@code migrations/V6__note.sql}.
 */
@Entity
@Table(
        name = "note",
        indexes = {
                @Index(name = "idx_note_topic",     columnList = "topic_id"),
                @Index(name = "idx_note_course",    columnList = "course_id"),
                @Index(name = "idx_note_published", columnList = "is_published"),
                @Index(name = "idx_note_order",     columnList = "note_order")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Note {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "title", nullable = false, columnDefinition = "VARCHAR(255)")
    private String title;

    /** Short teaser shown in lists / cards (plain text, optional). */
    @Column(name = "summary", columnDefinition = "VARCHAR(500)")
    private String summary;

    /** The full lesson body — sanitized rich HTML (may contain inline images). */
    @Column(name = "content_html", nullable = false, columnDefinition = "LONGTEXT")
    private String contentHtml;

    /** Optional cover image URL shown at the top of the reader. */
    @Column(name = "cover_image_url", columnDefinition = "TEXT")
    private String coverImageUrl;

    /**
     * Reusable visual blocks embedded in this note, stored as a JSON array string.
     * Each element references an existing animation scene / algorithm by slug, e.g.
     * {@code [{"kind":"ANIMATION","slug":"merge-sort","caption":"How merge works"}]}.
     * Stored as JSON so the block schema can evolve without a DB migration.
     */
    @Column(name = "blocks_json", columnDefinition = "LONGTEXT")
    private String blocksJson;

    /** Owning topic (FK -> topic.id). Exactly one of topicId / courseId is set. */
    @Column(name = "topic_id", columnDefinition = "VARCHAR(36)")
    private String topicId;

    /** Owning course (FK -> course.id) for course-level overview notes. */
    @Column(name = "course_id", columnDefinition = "VARCHAR(36)")
    private String courseId;

    /** Ordering within a topic/course (ascending). */
    @Column(name = "note_order", nullable = false)
    @Builder.Default
    private Long noteOrder = 0L;

    /** Estimated read time in minutes (optional, shown in the reader). */
    @Column(name = "read_minutes")
    private Integer readMinutes;

    /** Only published notes are visible to students. New notes start as drafts. */
    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private Boolean isPublished = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
