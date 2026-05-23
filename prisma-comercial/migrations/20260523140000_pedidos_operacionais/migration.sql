-- AlterEnum
ALTER TABLE `usuarios` MODIFY `perfil` ENUM('VENDEDOR','GERENTE_COMERCIAL','COMERCIAL','OPERACOES','ADMIN') NOT NULL;

-- CreateTable
CREATE TABLE `produtos_comerciais` (
  `id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(191) NOT NULL,
  `preco_base` DECIMAL(14, 2) NULL,
  `categoria` VARCHAR(191) NULL,
  `ativo` BOOLEAN NOT NULL DEFAULT true,
  `modo_compra` ENUM('UNIDADE','KG') NOT NULL DEFAULT 'UNIDADE',
  `fator_compra_unidade` DECIMAL(14, 4) NULL,
  `rendimento_por_kg` DECIMAL(14, 4) NULL,
  `oculto_lista_compra` BOOLEAN NOT NULL DEFAULT false,
  `mix_ativo` BOOLEAN NOT NULL DEFAULT false,
  `mix_folha_leve` BOOLEAN NOT NULL DEFAULT false,
  `mix_produto_referencia_id` VARCHAR(191) NULL,
  `mix_variedades` JSON NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `produtos_comerciais_nome_key` (`nome`),
  INDEX `produtos_comerciais_nome_idx` (`nome`),
  INDEX `produtos_comerciais_categoria_idx` (`categoria`),
  INDEX `produtos_comerciais_mix_produto_referencia_id_idx` (`mix_produto_referencia_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regras_comerciais_cliente` (
  `id` VARCHAR(191) NOT NULL,
  `conta_azul_customer_id` VARCHAR(191) NOT NULL,
  `observacoes_gerais` TEXT NULL,
  `periodo_entrega` ENUM('MANHA','TARDE') NULL,
  `horario_maximo_entrega` VARCHAR(191) NULL,
  `cobra_taxa_entrega` BOOLEAN NOT NULL DEFAULT false,
  `prazo_boleto_dias` INTEGER NULL,
  `acumula_pedidos` BOOLEAN NOT NULL DEFAULT false,
  `dias_acumulo` INTEGER NULL,
  `prazo_boleto_acumulo_dias` INTEGER NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `regras_comerciais_cliente_conta_azul_customer_id_key` (`conta_azul_customer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `precos_especiais_cliente` (
  `id` VARCHAR(191) NOT NULL,
  `regra_id` VARCHAR(191) NOT NULL,
  `produto_id` VARCHAR(191) NOT NULL,
  `preco` DECIMAL(14, 2) NOT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `precos_especiais_cliente_regra_id_produto_id_key` (`regra_id`, `produto_id`),
  INDEX `precos_especiais_cliente_produto_id_idx` (`produto_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes_legado_conta_azul_links` (
  `id` VARCHAR(191) NOT NULL,
  `legacy_client_id` VARCHAR(191) NOT NULL,
  `legacy_client_name` VARCHAR(191) NOT NULL,
  `conta_azul_customer_id` VARCHAR(191) NOT NULL,
  `cliente_id` VARCHAR(191) NULL,
  `metodo` VARCHAR(191) NOT NULL,
  `confianca` DECIMAL(5, 2) NOT NULL,
  `revisado` BOOLEAN NOT NULL DEFAULT false,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `clientes_legado_conta_azul_links_legacy_client_id_key` (`legacy_client_id`),
  INDEX `clientes_legado_conta_azul_links_conta_azul_customer_id_idx` (`conta_azul_customer_id`),
  INDEX `clientes_legado_conta_azul_links_cliente_id_idx` (`cliente_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos_operacionais` (
  `id` VARCHAR(191) NOT NULL,
  `cliente_id` VARCHAR(191) NULL,
  `conta_azul_customer_id` VARCHAR(191) NOT NULL,
  `data_entrega` DATETIME(3) NOT NULL,
  `dia_semana` INTEGER NOT NULL,
  `tipo_venda` ENUM('RECORRENTE_SEMANAL','RECORRENTE_QUINZENAL','PLANO','AVULSO') NOT NULL,
  `status` ENUM('PENDENTE','PRONTO','ENTREGUE','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `observacoes` TEXT NULL,
  `prioridade_entrega` INTEGER NULL,
  `criado_por_id` VARCHAR(191) NULL,
  `editado_por_id` VARCHAR(191) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `pedidos_operacionais_conta_azul_customer_id_data_entrega_idx` (`conta_azul_customer_id`, `data_entrega`),
  INDEX `pedidos_operacionais_cliente_id_data_entrega_idx` (`cliente_id`, `data_entrega`),
  INDEX `pedidos_operacionais_data_entrega_status_idx` (`data_entrega`, `status`),
  INDEX `pedidos_operacionais_criado_por_id_idx` (`criado_por_id`),
  INDEX `pedidos_operacionais_editado_por_id_idx` (`editado_por_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos_operacionais_itens` (
  `id` VARCHAR(191) NOT NULL,
  `pedido_id` VARCHAR(191) NOT NULL,
  `produto_id` VARCHAR(191) NOT NULL,
  `produto_nome` VARCHAR(191) NOT NULL,
  `categoria` VARCHAR(191) NULL,
  `quantidade` DECIMAL(12, 3) NOT NULL,
  `preco_unit` DECIMAL(14, 2) NULL,
  `preco_especial` BOOLEAN NOT NULL DEFAULT false,
  `observacoes` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `pedidos_operacionais_itens_pedido_id_idx` (`pedido_id`),
  INDEX `pedidos_operacionais_itens_produto_id_idx` (`produto_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos_operacionais_auditoria` (
  `id` VARCHAR(191) NOT NULL,
  `pedido_id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NULL,
  `usuario_nome` VARCHAR(191) NULL,
  `acao` VARCHAR(191) NOT NULL,
  `antes` JSON NULL,
  `depois` JSON NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `pedidos_operacionais_auditoria_pedido_id_criado_em_idx` (`pedido_id`, `criado_em`),
  INDEX `pedidos_operacionais_auditoria_usuario_id_idx` (`usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `produtos_comerciais` ADD CONSTRAINT `produtos_comerciais_mix_produto_referencia_id_fkey` FOREIGN KEY (`mix_produto_referencia_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `regras_comerciais_cliente` ADD CONSTRAINT `regras_comerciais_cliente_conta_azul_customer_id_fkey` FOREIGN KEY (`conta_azul_customer_id`) REFERENCES `clientes`(`external_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `precos_especiais_cliente` ADD CONSTRAINT `precos_especiais_cliente_regra_id_fkey` FOREIGN KEY (`regra_id`) REFERENCES `regras_comerciais_cliente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `precos_especiais_cliente` ADD CONSTRAINT `precos_especiais_cliente_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `clientes_legado_conta_azul_links` ADD CONSTRAINT `clientes_legado_conta_azul_links_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pedidos_operacionais` ADD CONSTRAINT `pedidos_operacionais_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pedidos_operacionais` ADD CONSTRAINT `pedidos_operacionais_criado_por_id_fkey` FOREIGN KEY (`criado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pedidos_operacionais` ADD CONSTRAINT `pedidos_operacionais_editado_por_id_fkey` FOREIGN KEY (`editado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pedidos_operacionais_itens` ADD CONSTRAINT `pedidos_operacionais_itens_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos_operacionais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pedidos_operacionais_itens` ADD CONSTRAINT `pedidos_operacionais_itens_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pedidos_operacionais_auditoria` ADD CONSTRAINT `pedidos_operacionais_auditoria_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos_operacionais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pedidos_operacionais_auditoria` ADD CONSTRAINT `pedidos_operacionais_auditoria_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
