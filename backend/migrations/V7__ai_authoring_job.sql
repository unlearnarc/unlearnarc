-- Required when Hibernate schema updates are disabled.
CREATE TABLE IF NOT EXISTS ai_authoring_job (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    owner VARCHAR(200) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    course_id VARCHAR(36),
    prompt VARCHAR(3000) NOT NULL,
    proposal LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    result LONGTEXT,
    created_at DATETIME(6) NOT NULL,
    saved_at DATETIME(6),
    INDEX idx_authoring_owner_created (owner, created_at)
);
