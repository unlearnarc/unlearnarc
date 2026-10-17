-- MySQL 8. Follow the repository's standalone SQL migration procedure.
-- Hibernate ddl-auto=update also adds this nullable column in development.
SET @thumbnail_ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'algorithm' AND COLUMN_NAME = 'thumbnail_url') = 0,
    'ALTER TABLE algorithm ADD COLUMN thumbnail_url VARCHAR(1024) NULL',
    'SELECT 1');
PREPARE thumbnail_stmt FROM @thumbnail_ddl;
EXECUTE thumbnail_stmt;
DEALLOCATE PREPARE thumbnail_stmt;

-- Only known bundled assets; preserve custom URLs and never insert duplicate records.
UPDATE algorithm SET thumbnail_url = CONCAT('/images/algorithms/', slug, '.svg')
WHERE thumbnail_url IS NULL AND slug IN (
 'binary-search', 'linear-search', 'insertion-sort', 'merge-sort', 'quick-sort',
 'bubble-sort', 'selection-sort', 'heap-sort', 'bfs', 'dfs', 'balanced-parentheses',
 'flood-fill', 'two-pointers');
