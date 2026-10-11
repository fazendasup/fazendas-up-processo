SET @schema := DATABASE();

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `produtos_comerciais` ADD COLUMN `imagem_url` VARCHAR(500) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'produtos_comerciais'
    AND COLUMN_NAME = 'imagem_url'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `produtos_comerciais` ADD COLUMN `visivel_portal` BOOLEAN NOT NULL DEFAULT false',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'produtos_comerciais'
    AND COLUMN_NAME = 'visivel_portal'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `portal_acessos` (
  `id` VARCHAR(191) NOT NULL,
  `cliente_id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `senha_hash` VARCHAR(255) NULL,
  `convite_hash` VARCHAR(64) NULL,
  `convite_expira_em` DATETIME(3) NULL,
  `ativo` BOOLEAN NOT NULL DEFAULT true,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  UNIQUE INDEX `portal_acessos_cliente_id_key`(`cliente_id`),
  UNIQUE INDEX `portal_acessos_email_key`(`email`),
  INDEX `portal_acessos_convite_hash_idx`(`convite_hash`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_acessos` ADD CONSTRAINT `portal_acessos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_acessos'
    AND CONSTRAINT_NAME = 'portal_acessos_cliente_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
