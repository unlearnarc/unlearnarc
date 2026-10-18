-- UnlearnArc: complete fresh-install schema (MySQL 8.0+)
-- Source: all 32 current JPA entities plus backend/migrations/V1--V11.
-- Run from the repository root:
--   mysql -u YOUR_MYSQL_USER -p < backend/schema.sql
-- Requires CREATE DATABASE and CREATE TABLE privileges.
-- Database name: unlearnarc. Change BOTH statements below to use another name.
--
-- Schema only: no accounts, lessons, question-bank data, or sample content.
-- Safe to rerun: existing tables/data are left untouched. IF NOT EXISTS does
-- NOT upgrade or validate existing tables; use migrations for existing installs.
-- DDL implicitly commits in MySQL; this file is not an atomic migration.
--
-- UUID strings, timestamps, and most defaults are assigned by the application.
-- Only SQL defaults already present in migrations are reproduced here.
-- JPA string enums use native MySQL ENUM, except explicitly VARCHAR mappings.
-- course.img_url uses VARCHAR(1024) from V8, overriding JPA's implicit 255.
-- Most ID relationships are scalar application-managed columns, not JPA FKs.
-- Preserve only the three physical FKs explicitly declared in V1/V4; do not
-- add new restrictions or cascades to the current application lifecycle.
-- Historical test_result pool/entity IDs intentionally remain unconstrained.
-- V11 repairs existing scores and has no schema changes or role on fresh DBs.
-- Browser-local productivity tools have no backend tables.
--
-- After import, configure DATABASE_URL for this database. JPA_DDL_AUTO=validate
-- can be used to check compatibility without Hibernate modifying the schema.

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE DATABASE IF NOT EXISTS `unlearnarc`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `unlearnarc`;

-- Accounts
CREATE TABLE IF NOT EXISTS `user` (
    `id` VARCHAR(36) not null,
    `auth_provider` VARCHAR(20) not null,
    `created_at` datetime(6),
    `current_streak` integer not null DEFAULT 0,
    `email` CHAR(150) not null,
    `google_id` VARCHAR(100),
    `is_active` bit not null,
    `last_activity_date` date,
    `longest_streak` integer not null DEFAULT 0,
    `mascot_character` VARCHAR(40) not null DEFAULT 'luna',
    `mascot_muted` bit not null DEFAULT b'0',
    `mascot_vibe` VARCHAR(20) not null DEFAULT 'friend',
    `name` CHAR(100) not null,
    `points` bigint,
    `profile_picture` TEXT,
    `rank` bigint,
    `region` CHAR(100),
    primary key (id),
    CONSTRAINT `UKhl4ga9r00rh51mdaf20hmnslt` UNIQUE (email),
    CONSTRAINT `UK150v3t1smadx7jl4tpb10r5ui` UNIQUE (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Learning catalog and content
CREATE TABLE IF NOT EXISTS `domain` (
    `id` VARCHAR(36) not null,
    `name` TEXT not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `skill` (
    `id` VARCHAR(36) not null,
    `level` enum ('ADVANCED','BEGINNER','EXPERT','INTERMEDIATE') not null,
    `name` TEXT not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `role` (
    `id` VARCHAR(36) not null,
    `description` TEXT,
    `name` TEXT not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `question_pool` (
    `id` VARCHAR(36) not null,
    `created_at` datetime(6),
    `description` TEXT,
    `easy_count` integer not null,
    `hard_count` integer not null,
    `is_active` bit not null,
    `medium_count` integer not null,
    `name` varchar(255) not null,
    `pass_percentage` integer not null,
    `scope_type` enum ('COURSE','DOMAIN','TOPIC') not null,
    `time_limit_minutes` integer not null,
    `total_questions` integer not null,
    primary key (id),
    KEY `idx_qpool_scope` (scope_type),
    KEY `idx_qpool_active` (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `course` (
    `id` VARCHAR(36) not null,
    `img_url` varchar(1024) not null,
    `level` enum ('ADVANCED','BEGINNER','EXPERT','INTERMEDIATE') not null,
    `name` varchar(255) not null,
    `qus_pool` VARCHAR(36),
    `topics_count` integer not null,
    `total_time` time(6) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `topic` (
    `id` VARCHAR(36) not null,
    `course_id` VARCHAR(36) not null,
    `level` enum ('ADVANCED','BEGINNER','EXPERT','INTERMEDIATE') not null,
    `name` CHAR(200) not null,
    `time` time(6) not null,
    `topic_order` bigint not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `study_material` (
    `id` VARCHAR(36) not null,
    `topic_id` VARCHAR(36) not null,
    `type` enum ('ARTICLE','EXERCISE','PDF','QUIZ','SLIDES','VIDEO') not null,
    `url` TEXT not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `algorithm` (
    `id` VARCHAR(36) not null,
    `category` varchar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
    `difficulty` enum ('EASY','HARD','MEDIUM'),
    `frame_spec` LONGTEXT not null,
    `is_published` bit not null,
    `java_source` LONGTEXT,
    `python_source` LONGTEXT,
    `slug` varchar(160) not null,
    `summary` varchar(1000),
    `thumbnail_url` varchar(1024),
    `title` varchar(255) not null,
    `updated_at` datetime(6),
    `usage_notes` TEXT,
    `version` integer not null,
    `visualizer` enum ('ARRAY','CUSTOM','GRAPH','LINKED_LIST','MATRIX','QUEUE','STACK','TREE') not null,
    primary key (id),
    KEY `idx_algorithm_published` (is_published),
    CONSTRAINT `idx_algorithm_slug` UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `animation_scene` (
    `id` VARCHAR(36) not null,
    `category` enum ('AI_ML','CONCURRENCY','DATABASE','DSA','NETWORKING','OTHER','SYSTEM_DESIGN'),
    `created_at` datetime(6),
    `description` varchar(1000),
    `is_published` bit not null,
    `kind` varchar(64),
    `simulator_params` TEXT,
    `slug` varchar(160) not null,
    `source` enum ('AUTHORED','GENERATED') not null,
    `thumbnail_url` varchar(1024),
    `title` varchar(255) not null,
    `trace_json` LONGTEXT,
    `updated_at` datetime(6),
    `version` integer not null,
    primary key (id),
    KEY `idx_anim_scene_published` (is_published),
    KEY `idx_anim_scene_category` (category),
    KEY `idx_anim_scene_kind` (kind),
    CONSTRAINT `idx_anim_scene_slug` UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `note` (
    `id` VARCHAR(36) not null,
    `blocks_json` LONGTEXT,
    `content_html` LONGTEXT not null,
    `course_id` VARCHAR(36),
    `cover_image_url` TEXT,
    `created_at` datetime(6),
    `is_published` bit not null DEFAULT b'0',
    `note_order` bigint not null DEFAULT 0,
    `read_minutes` integer,
    `summary` VARCHAR(500),
    `title` VARCHAR(255) not null,
    `topic_id` VARCHAR(36),
    `updated_at` datetime(6),
    primary key (id),
    KEY `idx_note_topic` (topic_id),
    KEY `idx_note_course` (course_id),
    KEY `idx_note_published` (is_published),
    KEY `idx_note_order` (note_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ai_authoring_job` (
    `id` VARCHAR(36) not null,
    `course_id` varchar(36),
    `created_at` datetime(6) not null,
    `kind` enum ('ANIMATION','TOPICS') not null,
    `owner` varchar(200) not null,
    `prompt` varchar(3000) not null,
    `proposal` LONGTEXT not null,
    `result` LONGTEXT,
    `saved_at` datetime(6),
    `status` varchar(255) not null,
    primary key (id),
    KEY `idx_authoring_owner_created` (owner, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Catalog, roadmap, enrollment, and pool mappings
CREATE TABLE IF NOT EXISTS `domain_skill_mapping` (
    `id` VARCHAR(36) not null,
    `domain_id` VARCHAR(36) not null,
    `skill_id` VARCHAR(36) not null,
    primary key (id),
    CONSTRAINT `UK2xyj4tsfqrlmfcvip3th9ekxs` UNIQUE (domain_id, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `skill_course_mapping` (
    `id` VARCHAR(36) not null,
    `course_id` VARCHAR(36) not null,
    `skill_id` VARCHAR(36) not null,
    primary key (id),
    CONSTRAINT `UK9d6039maoj16seu2mq9j6agvg` UNIQUE (skill_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `role_domain_mapping` (
    `id` VARCHAR(36) not null,
    `domain_id` VARCHAR(36) not null,
    `role_id` VARCHAR(36) not null,
    primary key (id),
    CONSTRAINT `UKdngavjyunv7pqb3u5o1p1v6lf` UNIQUE (role_id, domain_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `role_skill_mapping` (
    `id` VARCHAR(36) not null,
    `role_id` VARCHAR(36) not null,
    `skill_id` VARCHAR(36) not null,
    primary key (id),
    CONSTRAINT `UKrqhi6y1s9fgaieqcs6hf9wtxw` UNIQUE (role_id, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_domain_mapping` (
    `id` VARCHAR(36) not null,
    `domain_id` VARCHAR(36) not null,
    `user_id` VARCHAR(36) not null,
    primary key (id),
    CONSTRAINT `UKeeqa52lb625radtc3m88dbxdq` UNIQUE (user_id, domain_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `enrolled_courses` (
    `id` VARCHAR(36) not null,
    `course_id` VARCHAR(36) not null,
    `enrolled_at` datetime(6),
    `user_id` VARCHAR(36) not null,
    primary key (id),
    CONSTRAINT `UKs0kooamwox1tmunsiqxifny8n` UNIQUE (user_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `domain_pool_mapping` (
    `id` VARCHAR(36) not null,
    `domain_id` VARCHAR(36) not null,
    `pool_id` VARCHAR(36) not null,
    primary key (id),
    KEY `idx_dpm_domain` (domain_id),
    KEY `idx_dpm_pool` (pool_id),
    CONSTRAINT `uq_domain_pool` UNIQUE (domain_id, pool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `course_pool_mapping` (
    `id` VARCHAR(36) not null,
    `course_id` VARCHAR(36) not null,
    `pool_id` VARCHAR(36) not null,
    primary key (id),
    KEY `idx_cpm_course` (course_id),
    KEY `idx_cpm_pool` (pool_id),
    CONSTRAINT `uq_course_pool` UNIQUE (course_id, pool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `topic_pool_mapping` (
    `id` VARCHAR(36) not null,
    `pool_id` VARCHAR(36) not null,
    `topic_id` VARCHAR(36) not null,
    primary key (id),
    KEY `idx_tpm_topic` (topic_id),
    KEY `idx_tpm_pool` (pool_id),
    CONSTRAINT `uq_topic_pool` UNIQUE (topic_id, pool_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Practice question bank and history
CREATE TABLE IF NOT EXISTS `question` (
    `id` VARCHAR(36) not null,
    `created_at` datetime(6),
    `difficulty` enum ('EASY','HARD','MEDIUM') not null,
    `explanation` LONGTEXT,
    `is_active` bit not null,
    `points` integer not null,
    `pool_id` VARCHAR(36) not null,
    `question_text` MEDIUMTEXT not null,
    `question_type` enum ('MCQ','MULTIPLE_CORRECT') not null,
    `updated_at` datetime(6),
    primary key (id),
    KEY `idx_question_pool` (pool_id),
    KEY `idx_question_level` (difficulty),
    KEY `idx_question_type` (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `answer` (
    `id` VARCHAR(36) not null,
    `answer_text` MEDIUMTEXT not null,
    `display_order` integer not null,
    `is_correct` bit not null,
    `question_id` VARCHAR(36) not null,
    primary key (id),
    KEY `idx_answer_question` (question_id),
    KEY `idx_answer_correct` (question_id, is_correct)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `test_result` (
    `id` VARCHAR(36) not null,
    `answer_snapshot` LONGTEXT,
    `correct_count` integer not null,
    `created_at` datetime(6),
    `earned_points` integer not null,
    `easy_correct` integer not null DEFAULT 0,
    `easy_earned` integer not null DEFAULT 0,
    `easy_points` integer not null DEFAULT 0,
    `easy_total` integer not null DEFAULT 0,
    `entity_id` VARCHAR(36) not null,
    `entity_type` enum ('COURSE','DOMAIN','TOPIC') not null,
    `hard_correct` integer not null DEFAULT 0,
    `hard_earned` integer not null DEFAULT 0,
    `hard_points` integer not null DEFAULT 0,
    `hard_total` integer not null DEFAULT 0,
    `is_improvement_needed` bit not null,
    `medium_correct` integer not null DEFAULT 0,
    `medium_earned` integer not null DEFAULT 0,
    `medium_points` integer not null DEFAULT 0,
    `medium_total` integer not null DEFAULT 0,
    `pass_percentage` integer not null,
    `passed` bit not null,
    `pool_id` VARCHAR(36) not null,
    `pool_name` varchar(255),
    `score_percentage` float(53) not null,
    `skipped_count` integer not null,
    `time_taken_seconds` integer,
    `total_points` integer not null,
    `total_questions` integer not null,
    `wrong_count` integer not null,
    primary key (id),
    KEY `idx_test_result_pool` (pool_id),
    KEY `idx_test_result_entity` (entity_type, entity_id),
    KEY `idx_test_result_created` (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_test_attempts` (
    `id` VARCHAR(36) not null,
    `created_at` datetime(6),
    `test_id` VARCHAR(36) not null,
    `user_id` VARCHAR(36) not null,
    primary key (id),
    KEY `idx_uta_user` (user_id),
    KEY `idx_uta_user_created` (user_id, created_at),
    KEY `idx_uta_result` (test_id),
    CONSTRAINT `fk_uta_test_result` FOREIGN KEY (`test_id`) REFERENCES `test_result` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_uta_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_activity_day` (
    `id` VARCHAR(36) not null,
    `activity_date` date not null,
    `user_id` VARCHAR(36) not null,
    primary key (id),
    KEY `idx_uad_user` (user_id),
    KEY `idx_uad_user_date` (user_id, activity_date),
    CONSTRAINT `uq_user_activity_day` UNIQUE (user_id, activity_date),
    CONSTRAINT `fk_uad_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Community interview experiences
CREATE TABLE IF NOT EXISTS `interview_experience` (
    `id` VARCHAR(36) not null,
    `city` VARCHAR(100),
    `company` VARCHAR(150) not null,
    `created_at` datetime(6),
    `experience` LONGTEXT not null,
    `is_passed` bit not null,
    `is_verified` bit not null,
    `role` VARCHAR(150) not null,
    `updated_at` datetime(6),
    `user_id` VARCHAR(36) not null,
    `verified_by` VARCHAR(36),
    primary key (id),
    KEY `idx_ie_user` (user_id),
    KEY `idx_ie_company` (company),
    KEY `idx_ie_passed` (is_passed),
    KEY `idx_ie_verified` (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Coding contests
CREATE TABLE IF NOT EXISTS `contest` (
    `id` VARCHAR(36) not null,
    `allowed_languages` varchar(255),
    `created_at` datetime(6),
    `created_by` varchar(150),
    `description` LONGTEXT,
    `duration_minutes` integer not null,
    `end_time` datetime(6),
    `slug` varchar(255) not null,
    `start_time` datetime(6),
    `status` enum ('ARCHIVED','DRAFT','PUBLISHED') not null,
    `title` varchar(255) not null,
    `updated_at` datetime(6),
    `visibility` enum ('PRIVATE','PUBLIC') not null,
    `wrong_submission_penalty` integer not null,
    primary key (id),
    KEY `idx_contest_status` (status),
    KEY `idx_contest_window` (start_time, end_time),
    CONSTRAINT `UK3164m0eblfy5ophf4jar40i2` UNIQUE (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `contest_problem` (
    `id` VARCHAR(36) not null,
    `constraints` LONGTEXT,
    `contest_id` VARCHAR(36) not null,
    `created_at` datetime(6),
    `difficulty` enum ('EASY','HARD','MEDIUM') not null,
    `display_order` integer not null,
    `harness_type` enum ('FUNCTION_RETURN','STDIN_STDOUT') not null,
    `is_active` bit not null,
    `max_points` integer not null,
    `starter_code_json` LONGTEXT,
    `statement` LONGTEXT not null,
    `time_limit_ms` integer not null,
    `title` varchar(255) not null,
    `updated_at` datetime(6),
    primary key (id),
    KEY `idx_cproblem_contest` (contest_id),
    KEY `idx_cproblem_order` (contest_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `contest_test_case` (
    `id` VARCHAR(36) not null,
    `display_order` integer not null,
    `expected_output` LONGTEXT not null,
    `input` LONGTEXT not null,
    `is_hidden` bit not null,
    `problem_id` VARCHAR(36) not null,
    `strict_match` bit not null,
    `weight` integer not null,
    primary key (id),
    KEY `idx_ctc_problem` (problem_id),
    KEY `idx_ctc_hidden` (problem_id, is_hidden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `contest_participant` (
    `id` VARCHAR(36) not null,
    `contest_id` VARCHAR(36) not null,
    `created_at` datetime(6),
    `last_accepted_at` datetime(6),
    `penalty` integer not null,
    `solved_count` integer not null,
    `started_at` datetime(6),
    `total_score` integer not null,
    `updated_at` datetime(6),
    `user_id` VARCHAR(36) not null,
    primary key (id),
    KEY `idx_cpart_contest` (contest_id),
    KEY `idx_cpart_board` (contest_id, total_score),
    CONSTRAINT `uq_contest_user` UNIQUE (contest_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `contest_submission` (
    `id` VARCHAR(36) not null,
    `contest_id` VARCHAR(36) not null,
    `language` varchar(30) not null,
    `passed_tests` integer not null,
    `problem_id` VARCHAR(36) not null,
    `runtime_ms` integer,
    `score` integer not null,
    `source_code` LONGTEXT,
    `submitted_at` datetime(6),
    `total_tests` integer not null,
    `user_id` VARCHAR(36) not null,
    `verdict` enum ('ACCEPTED','COMPILE_ERROR','MALFORMED','PARTIAL','RUNTIME_ERROR','TIME_LIMIT','WRONG_ANSWER') not null,
    primary key (id),
    KEY `idx_csub_participant` (contest_id, user_id),
    KEY `idx_csub_problem` (problem_id),
    KEY `idx_csub_verdict` (verdict)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

