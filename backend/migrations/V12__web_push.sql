-- Apply before deploying Web Push when Hibernate DDL auto-update is disabled.
CREATE TABLE IF NOT EXISTS push_subscription (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_email VARCHAR(150) NOT NULL,
    device_id VARCHAR(36) NOT NULL,
    endpoint VARCHAR(2048) NOT NULL,
    p256dh VARCHAR(200) NOT NULL,
    auth VARCHAR(100) NOT NULL,
    dnd_until BIGINT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_push_user_device (user_email, device_id)
);
CREATE TABLE IF NOT EXISTS push_reminder (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    subscription_id VARCHAR(36) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    original_at BIGINT NOT NULL,
    due_at BIGINT NOT NULL,
    cadence VARCHAR(10) NOT NULL,
    fired BIT NOT NULL DEFAULT b'0',
    UNIQUE KEY uq_push_reminder (subscription_id, client_id),
    KEY ix_push_due (fired, due_at)
);
