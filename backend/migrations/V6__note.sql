-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V6__note.sql
-- Purpose  : Book-style, admin-authored lessons ("notes") attached to a topic or
--            a course. Unlike `study_material` (external links only), a note
--            stores authored rich HTML (headings, lists, inline images, links)
--            plus a JSON array of embedded reusable visual blocks (animation
--            scenes / algorithm visualizers referenced by slug). Students read
--            notes directly in-app for a textbook-like, visual experience.
--
-- Context  : The app runs with spring.jpa.hibernate.ddl-auto=update, so this
--            table is also auto-created by Hibernate from Note.java. This file is
--            the CANONICAL, reviewable definition. Written idempotently.
--
-- Design   : `content_html` is sanitized server-side (HtmlSanitizer) before save.
--            `blocks_json` is free-form JSON so the embed-block schema can evolve
--            without a migration. Exactly one of topic_id / course_id is set
--            (enforced in the service layer). Only published notes reach students.
--
-- DB       : MySQL 8 (utf8mb4).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `note` (
    `id`               VARCHAR(36)   NOT NULL,

    `title`            VARCHAR(255)  NOT NULL,
    `summary`          VARCHAR(500)  DEFAULT NULL,

    -- sanitized rich HTML lesson body (may contain inline images)
    `content_html`     LONGTEXT      NOT NULL,

    `cover_image_url`  TEXT          DEFAULT NULL,

    -- JSON array of embedded visual blocks, e.g.
    -- [{"kind":"ANIMATION","slug":"merge-sort","caption":"..."}]
    `blocks_json`      LONGTEXT      DEFAULT NULL,

    -- exactly one parent: topic OR course (enforced in NoteService)
    `topic_id`         VARCHAR(36)   DEFAULT NULL,
    `course_id`        VARCHAR(36)   DEFAULT NULL,

    `note_order`       BIGINT        NOT NULL DEFAULT 0,
    `read_minutes`     INT           DEFAULT NULL,
    `is_published`     BIT(1)        NOT NULL DEFAULT b'0',

    `created_at`       DATETIME(6)   DEFAULT NULL,
    `updated_at`       DATETIME(6)   DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_note_topic`     (`topic_id`),
    KEY `idx_note_course`    (`course_id`),
    KEY `idx_note_published` (`is_published`),
    KEY `idx_note_order`     (`note_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
