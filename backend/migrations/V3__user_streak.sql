-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V3__user_streak.sql
-- Purpose  : Adds daily-activity streak tracking to the `user` table.
--
-- Context  : Mirrors the new fields on com.unlearnarc.user.entity.User. With
--            spring.jpa.hibernate.ddl-auto=update these columns are also
--            auto-created by Hibernate; this file is the canonical, reviewable
--            definition. Written idempotently so it is safe to re-run.
--
-- DB       : MySQL 8 (utf8mb4).
-- ─────────────────────────────────────────────────────────────────────────────

-- current_streak: consecutive-day streak length as of last_activity_date.
-- longest_streak: all-time best streak the user has ever reached.
-- last_activity_date: last calendar day (server date) the user was active.
--
-- MySQL 8 supports IF NOT EXISTS on ADD COLUMN, keeping this re-runnable.
ALTER TABLE `user`
    ADD COLUMN IF NOT EXISTS `current_streak`     INT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `longest_streak`     INT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS `last_activity_date` DATE DEFAULT NULL;
