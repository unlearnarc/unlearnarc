-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V1__test_history.sql
-- Purpose  : Durable storage for graded test attempts (history) and the
--            per-difficulty + snapshot data that powers future weak-area
--            suggestions ("where to improve").
--
-- Context  : The app runs with spring.jpa.hibernate.ddl-auto=update, so these
--            tables are also auto-created by Hibernate. This file is the
--            CANONICAL, reviewable definition of the schema — use it to
--            provision a fresh DB, to review in PRs, or when switching to
--            Flyway/Liquibase (set ddl-auto=validate and let the migrations own
--            the schema). It is written idempotently (IF NOT EXISTS / guarded
--            index creation) so it is safe to re-run.
--
-- DB       : MySQL 8 (utf8mb4). Mirrors db.md `test_result` + `user_test_attempts`,
--            extended with the columns the history + recommendation features need.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── test_result ──────────────────────────────────────────────────────────────
-- One row per graded attempt. Aggregate score + per-difficulty breakdown
-- (easy/medium/hard × total/correct/points/earned) + full per-question JSON
-- snapshot so analytics never depends on the (mutable) live question bank.
CREATE TABLE IF NOT EXISTS `test_result` (
    `id`                    VARCHAR(36)  NOT NULL,

    -- what the test was scoped to
    `pool_id`               VARCHAR(36)  NOT NULL,
    `pool_name`             VARCHAR(255) DEFAULT NULL,
    `entity_type`           ENUM('DOMAIN','COURSE','TOPIC') NOT NULL,
    `entity_id`             VARCHAR(36)  NOT NULL,

    -- aggregate outcome
    `total_questions`       INT          NOT NULL,
    `correct_count`         INT          NOT NULL,
    `wrong_count`           INT          NOT NULL,
    `skipped_count`         INT          NOT NULL,
    `total_points`          INT          NOT NULL,
    `earned_points`         INT          NOT NULL,
    `score_percentage`      DOUBLE       NOT NULL,
    `pass_percentage`       INT          NOT NULL,
    `passed`                BIT(1)       NOT NULL,
    `is_improvement_needed` BIT(1)       NOT NULL,

    -- per-difficulty breakdown — the signal for weak-area detection
    `easy_total`            INT          NOT NULL DEFAULT 0,
    `easy_correct`          INT          NOT NULL DEFAULT 0,
    `easy_points`           INT          NOT NULL DEFAULT 0,
    `easy_earned`           INT          NOT NULL DEFAULT 0,
    `medium_total`          INT          NOT NULL DEFAULT 0,
    `medium_correct`        INT          NOT NULL DEFAULT 0,
    `medium_points`         INT          NOT NULL DEFAULT 0,
    `medium_earned`         INT          NOT NULL DEFAULT 0,
    `hard_total`            INT          NOT NULL DEFAULT 0,
    `hard_correct`          INT          NOT NULL DEFAULT 0,
    `hard_points`           INT          NOT NULL DEFAULT 0,
    `hard_earned`           INT          NOT NULL DEFAULT 0,

    -- full per-question breakdown serialized as JSON (reconstructs the attempt
    -- exactly as graded, even after questions are edited/deactivated)
    `answer_snapshot`       LONGTEXT     DEFAULT NULL,

    -- client-reported time spent (seconds), optional
    `time_taken_seconds`    INT          DEFAULT NULL,

    `created_at`            DATETIME(6)  DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_test_result_pool`    (`pool_id`),
    KEY `idx_test_result_entity`  (`entity_type`, `entity_id`),
    KEY `idx_test_result_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── user_test_attempts ───────────────────────────────────────────────────────
-- Join row: links a user to a persisted test_result. Kept separate (rather than
-- a user_id column on test_result) to preserve the attempt/result split from the
-- schema and allow attaching multiple perspectives to one result later.
CREATE TABLE IF NOT EXISTS `user_test_attempts` (
    `id`         VARCHAR(36) NOT NULL,
    `user_id`    VARCHAR(36) NOT NULL,
    `test_id`    VARCHAR(36) NOT NULL,   -- FK -> test_result.id
    `created_at` DATETIME(6) DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_uta_user`         (`user_id`),
    KEY `idx_uta_user_created` (`user_id`, `created_at`),
    KEY `idx_uta_result`       (`test_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Foreign keys ─────────────────────────────────────────────────────────────
-- Added guarded so the migration is safe to re-run. Hibernate's ddl-auto=update
-- does NOT create these (the entities map plain VARCHAR columns, not @ManyToOne),
-- so this file is the only place the referential integrity is declared. If you
-- stay on ddl-auto=update and want these enforced, run this file once after boot.

-- user_test_attempts.test_id -> test_result.id
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_test_attempts'
      AND CONSTRAINT_NAME = 'fk_uta_test_result'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE `user_test_attempts`
        ADD CONSTRAINT `fk_uta_test_result`
        FOREIGN KEY (`test_id`) REFERENCES `test_result`(`id`) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- user_test_attempts.user_id -> user.id
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_test_attempts'
      AND CONSTRAINT_NAME = 'fk_uta_user'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE `user_test_attempts`
        ADD CONSTRAINT `fk_uta_user`
        FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
