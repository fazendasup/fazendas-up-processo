CREATE TABLE IF NOT EXISTS `portal_fotos` (
  `produto_id` VARCHAR(191) NOT NULL,
  `conteudo` MEDIUMBLOB NOT NULL,
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`produto_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @schema := DATABASE();
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_fotos` ADD CONSTRAINT `portal_fotos_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_fotos'
    AND CONSTRAINT_NAME = 'portal_fotos_produto_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
