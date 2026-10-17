-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V8__course_img_url_to_varchar.sql
-- Purpose  : Convert course.img_url from a legacy BIGINT "icon reference id" into
--            a proper cover-image URL string. The admin Course create/edit form
--            now submits an actual image URL instead of a numeric id.
--
-- Context  : The app runs with spring.jpa.hibernate.ddl-auto=update. Hibernate's
--            `update` mode ADDS missing columns but NEVER alters the type of an
--            existing column, so the legacy BIGINT `img_url` would reject string
--            payloads and trigger a deserialization/insert failure. This file is
--            the CANONICAL, reviewable definition and must be run manually (or by
--            your migration tool) against environments that already have the old
--            BIGINT column. Written idempotently.
--
-- Data     : Existing numeric values are preserved as their string representation
--            (e.g. 1001 -> '1001'). Review/backfill real URLs afterwards if needed.
--
-- DB       : MySQL 8 (utf8mb4).
-- ─────────────────────────────────────────────────────────────────────────────

-- MODIFY is safe to re-run: converting VARCHAR -> VARCHAR is a no-op.
-- MySQL auto-casts existing BIGINT values to their textual form on conversion.
ALTER TABLE `course`
    MODIFY COLUMN `img_url` VARCHAR(1024) NOT NULL;
