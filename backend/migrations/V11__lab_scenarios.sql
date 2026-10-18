-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V11__lab_scenarios.sql
-- Purpose  : Persistence tables for UnlearnARC Engineering Labs (Phase 1).
--
-- Tables created:
--   lab_scenario   — versioned scenario catalog (admin-authored or seeded)
--   lab_design     — student-saved topology designs
--   lab_attempt    — tracks each student's lab run and outcome
--
-- Tables deferred until the capability is implemented:
--   lab_checkpoint          (Phase 2 — mid-run save/restore)
--   execution_environment   (Phase 5 — real isolated execution)
--   load_test_run           (Phase 6 — real load testing)
--
-- Convention: uses VARCHAR(36) UUIDs, Hibernate ddl-auto=update also creates
-- these in development. Written idempotently (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── lab_scenario ─────────────────────────────────────────────────────────────
-- Stores the authoritative scenario definition as JSON.
-- The `definition` column is LONGTEXT so complex topologies fit.
CREATE TABLE IF NOT EXISTS `lab_scenario` (
    `id`           VARCHAR(36)   NOT NULL,
    `slug`         VARCHAR(160)  NOT NULL,
    `version`      INT           NOT NULL DEFAULT 1,
    `domain`       VARCHAR(64)   NOT NULL,
    `title`        VARCHAR(255)  NOT NULL,
    `description`  TEXT,
    `definition`   LONGTEXT      NOT NULL COMMENT 'Full JSON LabScenario definition',
    `is_published` BIT(1)        NOT NULL DEFAULT 0,
    `created_at`   DATETIME(6)   DEFAULT NULL,
    `updated_at`   DATETIME(6)   DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_lab_scenario_slug_ver` (`slug`, `version`),
    KEY `idx_lab_scenario_domain`    (`domain`),
    KEY `idx_lab_scenario_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── lab_design ────────────────────────────────────────────────────────────────
-- Student-saved topology designs (named snapshots of their canvas).
-- topologyJson is the serialized Topology object.
CREATE TABLE IF NOT EXISTS `lab_design` (
    `id`             VARCHAR(36)   NOT NULL,
    `owner_id`       VARCHAR(36)   NOT NULL COMMENT 'FK -> user.id',
    `name`           VARCHAR(255)  NOT NULL,
    `schema_version` INT           NOT NULL DEFAULT 1,
    `topology_json`  LONGTEXT      NOT NULL,
    `created_at`     DATETIME(6)   DEFAULT NULL,
    `updated_at`     DATETIME(6)   DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_lab_design_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── lab_attempt ───────────────────────────────────────────────────────────────
-- One row per student attempt at a scenario.
-- result_summary_json holds the ScoreCard[] array and summary metrics.
CREATE TABLE IF NOT EXISTS `lab_attempt` (
    `id`                  VARCHAR(36)   NOT NULL,
    `user_id`             VARCHAR(36)   NOT NULL COMMENT 'FK -> user.id',
    `scenario_id`         VARCHAR(36)   NOT NULL COMMENT 'FK -> lab_scenario.id (by slug+version)',
    `scenario_version`    INT           NOT NULL,
    `engine_version`      VARCHAR(32)   NOT NULL,
    `execution_mode`      ENUM('simulation','real') NOT NULL DEFAULT 'simulation',
    `status`              ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
    `started_at`          DATETIME(6)   DEFAULT NULL,
    `completed_at`        DATETIME(6)   DEFAULT NULL,
    `result_summary_json` LONGTEXT      COMMENT 'Serialized ScoreCard[] + total points',

    PRIMARY KEY (`id`),
    KEY `idx_lab_attempt_user`     (`user_id`),
    KEY `idx_lab_attempt_scenario` (`scenario_id`),
    KEY `idx_lab_attempt_status`   (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Foreign key guards ────────────────────────────────────────────────────────

-- lab_design.owner_id -> user.id
SET @fk1 := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lab_design'
      AND CONSTRAINT_NAME = 'fk_lab_design_user'
);
SET @sql1 := IF(@fk1 = 0,
    'ALTER TABLE `lab_design` ADD CONSTRAINT `fk_lab_design_user` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE CASCADE',
    'SELECT 1');
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;

-- lab_attempt.user_id -> user.id
SET @fk2 := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lab_attempt'
      AND CONSTRAINT_NAME = 'fk_lab_attempt_user'
);
SET @sql2 := IF(@fk2 = 0,
    'ALTER TABLE `lab_attempt` ADD CONSTRAINT `fk_lab_attempt_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE',
    'SELECT 1');
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;
