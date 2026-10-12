SET @schema := DATABASE();

CREATE TABLE IF NOT EXISTS `portal_contas` (
  `cliente_id` VARCHAR(191) NOT NULL,
  `nome_fantasia` VARCHAR(255) NULL,
  `telefone` VARCHAR(40) NOT NULL DEFAULT '',
  `contato` VARCHAR(255) NOT NULL DEFAULT '',
  `cep` VARCHAR(16) NOT NULL DEFAULT '',
  `logradouro` VARCHAR(255) NOT NULL DEFAULT '',
  `numero` VARCHAR(32) NOT NULL DEFAULT '',
  `complemento` VARCHAR(255) NULL,
  `bairro` VARCHAR(255) NOT NULL DEFAULT '',
  `cidade` VARCHAR(255) NOT NULL DEFAULT '',
  `estado` VARCHAR(2) NOT NULL DEFAULT '',
  `inscricao_estadual` VARCHAR(20) NULL,
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`cliente_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_contratos` (
  `id` VARCHAR(191) NOT NULL,
  `cliente_id` VARCHAR(191) NOT NULL,
  `versao` VARCHAR(32) NOT NULL,
  `texto` TEXT NOT NULL,
  `texto_hash` CHAR(64) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDENTE',
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  UNIQUE INDEX `portal_contratos_cliente_id_key`(`cliente_id`),
  INDEX `portal_contratos_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_contrato_aceites` (
  `id` VARCHAR(191) NOT NULL,
  `contrato_id` VARCHAR(191) NOT NULL,
  `cliente_id` VARCHAR(191) NOT NULL,
  `versao` VARCHAR(32) NOT NULL,
  `texto_hash` CHAR(64) NOT NULL,
  `representante_nome` VARCHAR(255) NOT NULL,
  `representante_cpf` VARCHAR(11) NOT NULL,
  `representante_email` VARCHAR(320) NOT NULL,
  `empresa_nome` VARCHAR(255) NOT NULL,
  `empresa_cnpj` VARCHAR(32) NOT NULL,
  `ip` VARCHAR(64) NOT NULL,
  `user_agent` VARCHAR(512) NOT NULL,
  `aceito_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `portal_contrato_aceites_cliente_id_idx`(`cliente_id`),
  INDEX `portal_contrato_aceites_contrato_id_idx`(`contrato_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_contas` ADD CONSTRAINT `portal_contas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_contas'
    AND CONSTRAINT_NAME = 'portal_contas_cliente_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_contratos` ADD CONSTRAINT `portal_contratos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_contratos'
    AND CONSTRAINT_NAME = 'portal_contratos_cliente_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_contrato_aceites` ADD CONSTRAINT `portal_contrato_aceites_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `portal_contratos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_contrato_aceites'
    AND CONSTRAINT_NAME = 'portal_contrato_aceites_contrato_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
