SET @schema := DATABASE();

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `produtos_comerciais` ADD COLUMN `descricao_loja` TEXT NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'produtos_comerciais' AND COLUMN_NAME = 'descricao_loja'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `produtos_comerciais` ADD COLUMN `aplicacao_loja` TEXT NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'produtos_comerciais' AND COLUMN_NAME = 'aplicacao_loja'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `produtos_comerciais` ADD COLUMN `estoque_loja` DECIMAL(14, 3) NULL',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'produtos_comerciais' AND COLUMN_NAME = 'estoque_loja'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `produtos_comerciais`
SET `visivel_portal` = true
WHERE `ativo` = true
  AND `importado_operacao` = true
  AND `preco_base` IS NOT NULL
  AND `preco_base` > 0
  AND `visivel_portal` = false;

CREATE TABLE IF NOT EXISTS `portal_cadastros` (
  `id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(191) NOT NULL,
  `nome_fantasia` VARCHAR(191) NULL,
  `cnpj` VARCHAR(20) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `telefone` VARCHAR(40) NOT NULL,
  `contato` VARCHAR(191) NOT NULL,
  `cep` VARCHAR(12) NOT NULL,
  `logradouro` VARCHAR(191) NOT NULL,
  `numero` VARCHAR(20) NOT NULL,
  `complemento` VARCHAR(191) NULL,
  `bairro` VARCHAR(191) NOT NULL,
  `cidade` VARCHAR(191) NOT NULL,
  `estado` VARCHAR(2) NOT NULL,
  `inscricao_estadual` VARCHAR(40) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'RECEBIDO',
  `erro` TEXT NULL,
  `conta_azul_id` VARCHAR(64) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  INDEX `portal_cadastros_cnpj_idx`(`cnpj`),
  INDEX `portal_cadastros_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
