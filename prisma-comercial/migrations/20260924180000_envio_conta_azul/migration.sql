-- Envio operacional → Conta Azul (orçamento / venda)
ALTER TABLE `pedidos_operacionais`
  ADD COLUMN `status_envio_conta_azul` ENUM('NAO_ENVIADO', 'ENVIANDO', 'ENVIADO_ORCAMENTO', 'ENVIADO_VENDA', 'ERRO') NOT NULL DEFAULT 'NAO_ENVIADO',
  ADD COLUMN `conta_azul_envio_external_id` VARCHAR(191) NULL,
  ADD COLUMN `enviado_conta_azul_em` DATETIME(3) NULL,
  ADD COLUMN `ultimo_erro_envio_ca` TEXT NULL;

CREATE TABLE IF NOT EXISTS `conta_azul_envio_config` (
  `id` VARCHAR(191) NOT NULL,
  `id_conta_financeira` VARCHAR(191) NULL,
  `nome_conta_financeira` VARCHAR(191) NULL,
  `tipo_pagamento_padrao` VARCHAR(191) NOT NULL DEFAULT 'BOLETO_BANCARIO',
  `proximo_numero_venda` INT NULL,
  `atualizado_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `execucoes_api`
  MODIFY `acao_api` ENUM('SYNC_CA', 'ENVIO_MC', 'ANALISE_IG', 'PESQUISA_WEB', 'ENVIO_CA') NOT NULL;
