SET @schema := DATABASE();

CREATE TABLE IF NOT EXISTS `portal_programacoes` (
  `id` VARCHAR(191) NOT NULL,
  `cliente_id` VARCHAR(191) NOT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  UNIQUE INDEX `portal_programacoes_cliente_id_key`(`cliente_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_programacao_dias` (
  `id` VARCHAR(191) NOT NULL,
  `programacao_id` VARCHAR(191) NOT NULL,
  `dia_semana` INTEGER NOT NULL,
  UNIQUE INDEX `portal_programacao_dias_programacao_id_dia_semana_key`(`programacao_id`, `dia_semana`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_programacao_itens` (
  `id` VARCHAR(191) NOT NULL,
  `dia_id` VARCHAR(191) NOT NULL,
  `produto_id` VARCHAR(191) NOT NULL,
  `quantidade` DECIMAL(14, 3) NOT NULL,
  UNIQUE INDEX `portal_programacao_itens_dia_id_produto_id_key`(`dia_id`, `produto_id`),
  INDEX `portal_programacao_itens_produto_id_idx`(`produto_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_programacao_entregas` (
  `id` VARCHAR(191) NOT NULL,
  `programacao_id` VARCHAR(191) NOT NULL,
  `data_entrega` DATETIME(3) NOT NULL,
  `pedido_id` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `portal_programacao_entregas_pedido_id_key`(`pedido_id`),
  UNIQUE INDEX `portal_programacao_entregas_programacao_id_data_entrega_key`(`programacao_id`, `data_entrega`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_programacoes` ADD CONSTRAINT `portal_programacoes_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_programacoes'
    AND CONSTRAINT_NAME = 'portal_programacoes_cliente_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_programacao_dias` ADD CONSTRAINT `portal_programacao_dias_programacao_id_fkey` FOREIGN KEY (`programacao_id`) REFERENCES `portal_programacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_programacao_dias'
    AND CONSTRAINT_NAME = 'portal_programacao_dias_programacao_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_programacao_itens` ADD CONSTRAINT `portal_programacao_itens_dia_id_fkey` FOREIGN KEY (`dia_id`) REFERENCES `portal_programacao_dias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_programacao_itens'
    AND CONSTRAINT_NAME = 'portal_programacao_itens_dia_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_programacao_itens` ADD CONSTRAINT `portal_programacao_itens_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_programacao_itens'
    AND CONSTRAINT_NAME = 'portal_programacao_itens_produto_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_programacao_entregas` ADD CONSTRAINT `portal_programacao_entregas_programacao_id_fkey` FOREIGN KEY (`programacao_id`) REFERENCES `portal_programacoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_programacao_entregas'
    AND CONSTRAINT_NAME = 'portal_programacao_entregas_programacao_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `portal_programacao_entregas` ADD CONSTRAINT `portal_programacao_entregas_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos_operacionais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'portal_programacao_entregas'
    AND CONSTRAINT_NAME = 'portal_programacao_entregas_pedido_id_fkey'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
