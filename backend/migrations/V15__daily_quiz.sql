-- Additive reference migration for managed MySQL schemas; normal deployments
-- use the existing Hibernate update policy. No existing question bank is copied.
CREATE TABLE IF NOT EXISTS daily_quiz_pool_policy (
 pool_id VARCHAR(36) NOT NULL PRIMARY KEY,
 general_diagnostic BOOLEAN NOT NULL DEFAULT FALSE,
 introductory BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS daily_quiz_session (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL,
 learning_date DATE NOT NULL,
 time_zone VARCHAR(255) NOT NULL,
 status VARCHAR(255) NOT NULL,
 rule_version VARCHAR(255) NOT NULL,
 generated_at TIMESTAMP(6) NOT NULL,
 started_at TIMESTAMP(6) NULL,
 submitted_at TIMESTAMP(6) NULL,
 notices TEXT,
 CONSTRAINT uq_daily_student_date UNIQUE(user_id,learning_date),
 INDEX idx_daily_history(user_id,generated_at)
);
CREATE TABLE IF NOT EXISTS daily_quiz_item (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 session_id VARCHAR(36) NOT NULL,
 user_id VARCHAR(36) NOT NULL,
 question_id VARCHAR(36) NOT NULL,
 position INT NOT NULL,
 topic_id VARCHAR(36), course_id VARCHAR(36), topic_name VARCHAR(255),
 reason VARCHAR(255) NOT NULL,
 difficulty VARCHAR(255) NOT NULL,
 question_type VARCHAR(255) NOT NULL,
 question_text MEDIUMTEXT NOT NULL,
 options_json LONGTEXT NOT NULL,
 explanation LONGTEXT,
 selected_json TEXT,
 correct BOOLEAN,
 answered_at TIMESTAMP(6) NULL,
 exposed_at TIMESTAMP(6) NOT NULL,
 CONSTRAINT uq_daily_question UNIQUE(session_id,question_id),
 CONSTRAINT uq_daily_order UNIQUE(session_id,position),
 INDEX idx_daily_item_owner(user_id,answered_at),
 INDEX idx_daily_exposure(user_id,question_id,exposed_at)
);
-- Intentionally no question/course/topic FKs: immutable history survives catalog deletion.
-- Student ownership and session membership are enforced server-side on all access.
