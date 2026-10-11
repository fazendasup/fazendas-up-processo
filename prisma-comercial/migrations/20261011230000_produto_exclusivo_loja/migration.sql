SET @schema := DATABASE();

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `produtos_comerciais` ADD COLUMN `exclusivo_portal` BOOLEAN NOT NULL DEFAULT false',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'produtos_comerciais' AND COLUMN_NAME = 'exclusivo_portal'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
