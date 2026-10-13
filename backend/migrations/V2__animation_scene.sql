-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: V2__animation_scene.sql
-- Purpose  : Durable storage for the Canvas Animation Engine's time-based scenes
--            (interpolated keyframe traces), complementary to the step-indexed
--            `algorithm` visualizations.
--
-- Context  : The app runs with spring.jpa.hibernate.ddl-auto=update, so this
--            table is also auto-created by Hibernate from AnimationScene.java.
--            This file is the CANONICAL, reviewable definition — use it to
--            provision a fresh DB, review in PRs, or when switching to
--            Flyway/Liquibase (ddl-auto=validate). Written idempotently so it is
--            safe to re-run.
--
-- Design   : The timeline is stored as a JSON string in `trace_json` (LONGTEXT)
--            so simulators can evolve the keyframe schema (new entity fields,
--            statuses, renderers) WITHOUT a DB migration. GENERATED scenes may
--            leave `trace_json` null and carry `simulator_params` for on-demand
--            regeneration. Indexed by slug/published/category/kind for scalable
--            catalog queries as the library grows across tutorial domains.
--
-- DB       : MySQL 8 (utf8mb4).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `animation_scene` (
    `id`               VARCHAR(36)  NOT NULL,

    `slug`             VARCHAR(160) NOT NULL,
    `title`            VARCHAR(255) NOT NULL,
    `description`      VARCHAR(1000) DEFAULT NULL,

    -- tutorial domain: CONCURRENCY / SYSTEM_DESIGN / DSA / AI_ML / NETWORKING / DATABASE / OTHER
    `category`         VARCHAR(32)  DEFAULT NULL,

    -- simulator family tag, e.g. 'atomic-cas', 'thread-lock', 'packet-routing'
    `kind`             VARCHAR(64)  DEFAULT NULL,

    -- AUTHORED (stored verbatim) | GENERATED (produced by a SceneSimulator)
    `source`           VARCHAR(16)  NOT NULL DEFAULT 'AUTHORED',

    -- serialized AnimationTrace (keyframes/entities/connections/variables)
    `trace_json`       LONGTEXT     DEFAULT NULL,

    -- optional JSON params a simulator consumes to (re)generate the trace
    `simulator_params` TEXT         DEFAULT NULL,

    `is_published`     BIT(1)       NOT NULL DEFAULT b'0',
    `version`          INT          NOT NULL DEFAULT 1,

    `created_at`       DATETIME(6)  DEFAULT NULL,
    `updated_at`       DATETIME(6)  DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_anim_scene_slug`      (`slug`),
    KEY        `idx_anim_scene_published` (`is_published`),
    KEY        `idx_anim_scene_category`  (`category`),
    KEY        `idx_anim_scene_kind`      (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
