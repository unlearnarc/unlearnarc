-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V4__user_activity_day.sql
-- Purpose  : Per-day activity log that powers the profile streak CALENDAR
--            (heat-map of marked days). Complements the rolled-up streak
--            counters added on `user` in V3.
--
-- Context  : Mirrors com.unlearnarc.user.entity.UserActivityDay. With
--            spring.jpa.hibernate.ddl-auto=update Hibernate also auto-creates
--            this table; this file is the canonical, reviewable definition.
--            Written idempotently so it is safe to re-run.
--
-- DB       : MySQL 8 (utf8mb4).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `user_activity_day` (
    `id`            VARCHAR(36) NOT NULL,
    `user_id`       VARCHAR(36) NOT NULL,
    `activity_date` DATE        NOT NULL,

    PRIMARY KEY (`id`),
    -- One row per (user, day): makes the daily insert idempotent.
    UNIQUE KEY `uq_user_activity_day` (`user_id`, `activity_date`),
    KEY `idx_uad_user`      (`user_id`),
    KEY `idx_uad_user_date` (`user_id`, `activity_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- user_activity_day.user_id -> user.id  (guarded so re-runs are safe)
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_activity_day'
      AND CONSTRAINT_NAME = 'fk_uad_user'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE `user_activity_day`
        ADD CONSTRAINT `fk_uad_user`
        FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Backfill today for users who already have a live streak but no day row ──
-- (Safe no-op on fresh DBs.) Keeps the calendar consistent with the V3 counters.
INSERT INTO `user_activity_day` (`id`, `user_id`, `activity_date`)
SELECT UUID(), u.`id`, u.`last_activity_date`
FROM `user` u
WHERE u.`last_activity_date` IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM `user_activity_day` d
      WHERE d.`user_id` = u.`id` AND d.`activity_date` = u.`last_activity_date`
  );
