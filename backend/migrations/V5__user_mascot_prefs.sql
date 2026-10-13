-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V5__user_mascot_prefs.sql
-- Purpose  : Persists each student's "Coach Buddy" (mascot companion)
--            preferences server-side so the chosen character, personality vibe
--            and mute state follow the user across devices/sessions instead of
--            living only in browser localStorage.
--
-- Context  : Mirrors the new fields on com.unlearnarc.user.entity.User. With
--            spring.jpa.hibernate.ddl-auto=update these columns are also
--            auto-created by Hibernate; this file is the canonical, reviewable
--            definition. Written idempotently so it is safe to re-run.
--
-- DB       : MySQL 8 (utf8mb4).
-- ─────────────────────────────────────────────────────────────────────────────

-- mascot_character : selected buddy id (e.g. 'luna', 'max', 'mochi', 'byte').
-- mascot_vibe      : personality tone — 'friend' (supportive) | 'companion' (warm).
-- mascot_muted     : whether the buddy's reactions are silenced.
ALTER TABLE `user`
    ADD COLUMN IF NOT EXISTS `mascot_character` VARCHAR(40)  NOT NULL DEFAULT 'luna',
    ADD COLUMN IF NOT EXISTS `mascot_vibe`      VARCHAR(20)  NOT NULL DEFAULT 'friend',
    ADD COLUMN IF NOT EXISTS `mascot_muted`     TINYINT(1)   NOT NULL DEFAULT 0;
