-- CreateTable
CREATE TABLE `rotas_entrega` (
  `id` VARCHAR(191) NOT NULL,
  `data_entrega` DATETIME(3) NOT NULL,
  `nome` VARCHAR(191) NULL,
  `status` ENUM('PLANEJADA','EM_ROTA','CONCLUIDA','CANCELADA') NOT NULL DEFAULT 'PLANEJADA',
  `entregador_id` VARCHAR(191) NULL,
  `entregador_nome` VARCHAR(191) NULL,
  `token_publico` VARCHAR(191) NOT NULL,
  `compartilhamento_ativo` BOOLEAN NOT NULL DEFAULT false,
  `iniciado_em` DATETIME(3) NULL,
  `encerrado_em` DATETIME(3) NULL,
  `ultima_latitude` DECIMAL(10, 7) NULL,
  `ultima_longitude` DECIMAL(10, 7) NULL,
  `ultima_precisao_metros` DECIMAL(10, 2) NULL,
  `ultima_localizacao_em` DATETIME(3) NULL,
  `criado_por_id` VARCHAR(191) NULL,
  `atualizado_por_id` VARCHAR(191) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `rotas_entrega_data_entrega_key` (`data_entrega`),
  UNIQUE INDEX `rotas_entrega_token_publico_key` (`token_publico`),
  INDEX `rotas_entrega_data_entrega_status_idx` (`data_entrega`, `status`),
  INDEX `rotas_entrega_entregador_id_idx` (`entregador_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paradas_entrega` (
  `id` VARCHAR(191) NOT NULL,
  `rota_id` VARCHAR(191) NOT NULL,
  `conta_azul_customer_id` VARCHAR(191) NOT NULL,
  `cliente_id` VARCHAR(191) NULL,
  `ordem` INTEGER NOT NULL,
  `status` ENUM('PENDENTE','EM_ROTA','ENTREGUE','PROBLEMA','PULADA') NOT NULL DEFAULT 'PENDENTE',
  `token_publico` VARCHAR(191) NOT NULL,
  `observacoes` TEXT NULL,
  `observacoes_problema` TEXT NULL,
  `entregue_em` DATETIME(3) NULL,
  `problema_em` DATETIME(3) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `paradas_entrega_token_publico_key` (`token_publico`),
  UNIQUE INDEX `paradas_entrega_rota_id_conta_azul_customer_id_key` (`rota_id`, `conta_azul_customer_id`),
  INDEX `paradas_entrega_rota_id_ordem_idx` (`rota_id`, `ordem`),
  INDEX `paradas_entrega_cliente_id_idx` (`cliente_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historico_localizacao_entrega` (
  `id` VARCHAR(191) NOT NULL,
  `rota_id` VARCHAR(191) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `precisao_metros` DECIMAL(10, 2) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `historico_localizacao_entrega_rota_id_criado_em_idx` (`rota_id`, `criado_em`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rotas_entrega` ADD CONSTRAINT `rotas_entrega_entregador_id_fkey` FOREIGN KEY (`entregador_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `rotas_entrega` ADD CONSTRAINT `rotas_entrega_criado_por_id_fkey` FOREIGN KEY (`criado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `rotas_entrega` ADD CONSTRAINT `rotas_entrega_atualizado_por_id_fkey` FOREIGN KEY (`atualizado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `paradas_entrega` ADD CONSTRAINT `paradas_entrega_rota_id_fkey` FOREIGN KEY (`rota_id`) REFERENCES `rotas_entrega`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `paradas_entrega` ADD CONSTRAINT `paradas_entrega_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `historico_localizacao_entrega` ADD CONSTRAINT `historico_localizacao_entrega_rota_id_fkey` FOREIGN KEY (`rota_id`) REFERENCES `rotas_entrega`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
