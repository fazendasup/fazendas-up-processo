-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(191) NOT NULL,
    `perfil` ENUM('GERENTE_COMERCIAL', 'COMERCIAL', 'OPERACOES', 'ADMIN') NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `data_cadastro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_em` DATETIME(3) NOT NULL,
    `revogado_em` DATETIME(3) NULL,

    INDEX `refresh_tokens_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` VARCHAR(191) NOT NULL,
    `external_id` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RESTAURANTE', 'MERCADO') NOT NULL,
    `cnpj_cpf` VARCHAR(191) NULL,
    `endereco` VARCHAR(191) NULL,
    `contato_principal` VARCHAR(191) NULL,
    `email_principal` VARCHAR(191) NULL,
    `telefone_whatsapp` VARCHAR(191) NULL,
    `score_comercial` DECIMAL(5, 2) NULL,
    `status_relacionamento` ENUM('ATIVO', 'INATIVO', 'EM_RISCO', 'ESTRATEGICO') NOT NULL,
    `tags` JSON NOT NULL,
    `url_instagram` VARCHAR(191) NULL,
    `url_site` VARCHAR(191) NULL,
    `data_cadastro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_ultima_atualizacao` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clientes_external_id_key`(`external_id`),
    INDEX `clientes_tipo_status_relacionamento_idx`(`tipo`, `status_relacionamento`),
    INDEX `clientes_nome_idx`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` VARCHAR(191) NOT NULL,
    `external_id` VARCHAR(191) NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `data_pedido` DATETIME(3) NOT NULL,
    `valor_total` DECIMAL(14, 2) NOT NULL,
    `status_pedido` VARCHAR(191) NOT NULL,
    `origem_pedido` ENUM('CONTA_AZUL', 'MANUAL') NOT NULL,

    UNIQUE INDEX `pedidos_external_id_key`(`external_id`),
    INDEX `pedidos_cliente_id_data_pedido_idx`(`cliente_id`, `data_pedido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_pedido` (
    `id` VARCHAR(191) NOT NULL,
    `pedido_id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `produto` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `preco_unit` DECIMAL(14, 2) NOT NULL,

    INDEX `itens_pedido_pedido_id_idx`(`pedido_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interacoes` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `tipo_interacao` ENUM('WHATSAPP', 'EMAIL', 'LIGACAO', 'PRESENCIAL') NOT NULL,
    `data_interacao` DATETIME(3) NOT NULL,
    `resumo` TEXT NULL,
    `sentimento` DECIMAL(4, 2) NULL,
    `oportunidade_detectada` BOOLEAN NOT NULL DEFAULT false,
    `risco_detectado` BOOLEAN NOT NULL DEFAULT false,
    `conteudo_bruto` LONGTEXT NULL,

    INDEX `interacoes_cliente_id_data_interacao_idx`(`cliente_id`, `data_interacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oportunidades` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `tipo_oportunidade` ENUM('UPSELL', 'CROSS_SELL', 'REATIVACAO', 'NOVO_PRODUTO') NOT NULL,
    `descricao` TEXT NOT NULL,
    `valor_estimado` DECIMAL(14, 2) NULL,
    `probabilidade_conversao` DECIMAL(5, 2) NULL,
    `prioridade` ENUM('ALTA', 'MEDIA', 'BAIXA') NOT NULL,
    `status_oportunidade` ENUM('ABERTA', 'EM_CONTATO', 'CONVERTIDA', 'PERDIDA') NOT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_fechamento` DATETIME(3) NULL,
    `responsavel_id` VARCHAR(191) NULL,

    INDEX `oportunidades_prioridade_status_oportunidade_idx`(`prioridade`, `status_oportunidade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensagens` (
    `id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NOT NULL,
    `tipo_mensagem` ENUM('POS_VENDA', 'OFERTA', 'REATIVACAO', 'INFORMATIVO') NOT NULL,
    `conteudo_sugerido` TEXT NOT NULL,
    `conteudo_final` TEXT NULL,
    `status_envio` ENUM('RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'ENVIADA', 'FALHA') NOT NULL,
    `sensivel` BOOLEAN NOT NULL DEFAULT false,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_aprovacao` DATETIME(3) NULL,
    `data_envio` DATETIME(3) NULL,
    `aprovador_id` VARCHAR(191) NULL,
    `canal_envio` VARCHAR(191) NOT NULL DEFAULT 'MANYCHAT',
    `agendado_para` DATETIME(3) NULL,
    `justificativa_rejeicao` TEXT NULL,

    INDEX `mensagens_status_envio_idx`(`status_envio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `execucoes_api` (
    `id` VARCHAR(191) NOT NULL,
    `acao_api` ENUM('SYNC_CA', 'ENVIO_MC', 'ANALISE_IG', 'PESQUISA_WEB') NOT NULL,
    `data_execucao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status_execucao` ENUM('SUCESSO', 'FALHA', 'PENDENTE') NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `detalhes_execucao` JSON NOT NULL,
    `mensagem_erro` TEXT NULL,
    `duracao_ms` INTEGER NULL,

    INDEX `execucoes_api_acao_api_data_execucao_idx`(`acao_api`, `data_execucao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kpi_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `nome_kpi` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(18, 4) NOT NULL,
    `periodo` ENUM('DIARIO', 'SEMANAL', 'MENSAL') NOT NULL,
    `data_referencia` DATETIME(3) NOT NULL,
    `payload` JSON NULL,

    UNIQUE INDEX `kpi_snapshots_nome_kpi_periodo_data_referencia_key`(`nome_kpi`, `periodo`, `data_referencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `integration_credentials` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `access_token` TEXT NULL,
    `refresh_token` TEXT NULL,
    `expires_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `integration_credentials_provider_key`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_state` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `cursor` VARCHAR(191) NULL,
    `last_sync_at` DATETIME(3) NULL,

    UNIQUE INDEX `sync_state_provider_key`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regras_classificacao` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates_mensagem` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('POS_VENDA', 'OFERTA', 'REATIVACAO', 'INFORMATIVO') NOT NULL,
    `corpo` TEXT NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_pedido` ADD CONSTRAINT `itens_pedido_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interacoes` ADD CONSTRAINT `interacoes_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oportunidades` ADD CONSTRAINT `oportunidades_responsavel_id_fkey` FOREIGN KEY (`responsavel_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_aprovador_id_fkey` FOREIGN KEY (`aprovador_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `execucoes_api` ADD CONSTRAINT `execucoes_api_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
