-- Reference DDL for managed schemas. Standard deployments create these mapped tables
-- automatically at startup with JPA_DDL_AUTO=update, as with the existing features.
CREATE TABLE IF NOT EXISTS study_plan (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 user_id VARCHAR(36) NOT NULL UNIQUE,
 start_date DATE NOT NULL,
 status VARCHAR(255) NOT NULL,
 generation_version INT NOT NULL,
 goal VARCHAR(255) NOT NULL,
 skill_level VARCHAR(255) NOT NULL,
 daily_minutes INT NOT NULL,
 course_mode VARCHAR(255) NOT NULL,
 time_zone VARCHAR(255) NOT NULL,
 created_at TIMESTAMP(6) NULL,
 updated_at TIMESTAMP(6) NULL,
 CONSTRAINT fk_study_user FOREIGN KEY(user_id) REFERENCES `user`(id)
);
CREATE TABLE IF NOT EXISTS study_plan_domains (
 plan_id VARCHAR(36) NOT NULL,
 domain_id VARCHAR(36) NOT NULL,
 UNIQUE KEY uq_study_domain(plan_id, domain_id),
 FOREIGN KEY(plan_id) REFERENCES study_plan(id)
);
CREATE TABLE IF NOT EXISTS study_plan_courses (
 plan_id VARCHAR(36) NOT NULL,
 course_id VARCHAR(36) NOT NULL,
 UNIQUE KEY uq_study_course(plan_id, course_id),
 FOREIGN KEY(plan_id) REFERENCES study_plan(id)
);
CREATE TABLE IF NOT EXISTS study_plan_days (
 plan_id VARCHAR(36) NOT NULL,
 study_day INT NOT NULL,
 UNIQUE KEY uq_study_day(plan_id, study_day),
 FOREIGN KEY(plan_id) REFERENCES study_plan(id)
);
CREATE TABLE IF NOT EXISTS study_plan_task (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 plan_id VARCHAR(36) NOT NULL,
 course_id VARCHAR(36) NULL,
 topic_id VARCHAR(36) NULL,
 topic_key VARCHAR(36) NOT NULL,
 title VARCHAR(255) NOT NULL,
 course_name VARCHAR(255) NOT NULL,
 revision_interval INT NOT NULL,
 task_type VARCHAR(255) NOT NULL,
 activity VARCHAR(255) NOT NULL,
 original_learning_date DATE NOT NULL,
 scheduled_date DATE NOT NULL,
 estimated_minutes INT NOT NULL,
 completed_at TIMESTAMP(6) NULL,
 UNIQUE KEY uq_study_topic_interval(plan_id,topic_key,revision_interval),
 INDEX idx_study_due(plan_id,scheduled_date),
 INDEX idx_study_completed(plan_id,completed_at),
 FOREIGN KEY(plan_id) REFERENCES study_plan(id),
 FOREIGN KEY(course_id) REFERENCES course(id) ON DELETE SET NULL,
 FOREIGN KEY(topic_id) REFERENCES topic(id) ON DELETE SET NULL
);
