-- MySQL 8, standalone migration; ddl-auto=update also adds this in development.
-- Nullable metadata only: existing records and trace JSON remain unchanged.
SET @animation_thumbnail_ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'animation_scene' AND COLUMN_NAME = 'thumbnail_url') = 0,
    'ALTER TABLE animation_scene ADD COLUMN thumbnail_url VARCHAR(1024) NULL',
    'SELECT 1');
PREPARE animation_thumbnail_stmt FROM @animation_thumbnail_ddl;
EXECUTE animation_thumbnail_stmt;
DEALLOCATE PREPARE animation_thumbnail_stmt;
