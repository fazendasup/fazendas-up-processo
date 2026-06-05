-- Conciliação auditável entre pedidos operacionais e vendas Conta Azul

ALTER TABLE `pedidos_operacionais`
  ADD COLUMN `status_conciliacao` ENUM('PLANEJADO', 'VINCULO_SUGERIDO', 'CONCILIADO', 'DIVERGENTE', 'VENDA_ERRADA') NOT NULL DEFAULT 'PLANEJADO',
  ADD COLUMN `pedido_conta_azul_id` VARCHAR(191) NULL,
  ADD COLUMN `sugestao_pedido_conta_azul_id` VARCHAR(191) NULL,
  ADD COLUMN `snapshot_conciliacao` JSON NULL;

ALTER TABLE `pedidos`
  ADD COLUMN `numero_venda` VARCHAR(64) NULL,
  ADD COLUMN `status_conciliacao` ENUM('NAO_CONCILIADA', 'SUGERIDA', 'CONCILIADA', 'DIVERGENTE', 'IGNORADA', 'VENDA_ERRADA') NOT NULL DEFAULT 'NAO_CONCILIADA',
  ADD COLUMN `sugestao_pedido_operacional_id` VARCHAR(191) NULL;

CREATE TABLE `pedidos_conciliacao_eventos` (
  `id` VARCHAR(191) NOT NULL,
  `pedido_operacional_id` VARCHAR(191) NULL,
  `pedido_conta_azul_id` VARCHAR(191) NULL,
  `tipo` VARCHAR(191) NOT NULL,
  `antes` JSON NULL,
  `depois` JSON NULL,
  `divergencias` JSON NULL,
  `usuario_id` VARCHAR(191) NULL,
  `usuario_nome` VARCHAR(191) NULL,
  `observacoes` TEXT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `pedidos_conciliacao_eventos_pedido_operacional_id_criado_em_idx` (`pedido_operacional_id`, `criado_em`),
  INDEX `pedidos_conciliacao_eventos_pedido_conta_azul_id_criado_em_idx` (`pedido_conta_azul_id`, `criado_em`),
  INDEX `pedidos_conciliacao_eventos_tipo_criado_em_idx` (`tipo`, `criado_em`),
  CONSTRAINT `pedidos_conciliacao_eventos_pedido_operacional_id_fkey` FOREIGN KEY (`pedido_operacional_id`) REFERENCES `pedidos_operacionais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `pedidos_conciliacao_eventos_pedido_conta_azul_id_fkey` FOREIGN KEY (`pedido_conta_azul_id`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `pedidos_operacionais_pedido_conta_azul_id_key` ON `pedidos_operacionais`(`pedido_conta_azul_id`);
CREATE INDEX `pedidos_operacionais_status_conciliacao_idx` ON `pedidos_operacionais`(`status_conciliacao`);
CREATE INDEX `pedidos_operacionais_sugestao_pedido_conta_azul_id_idx` ON `pedidos_operacionais`(`sugestao_pedido_conta_azul_id`);
CREATE INDEX `pedidos_status_conciliacao_idx` ON `pedidos`(`status_conciliacao`);
CREATE INDEX `pedidos_numero_venda_idx` ON `pedidos`(`numero_venda`);
CREATE INDEX `pedidos_sugestao_pedido_operacional_id_idx` ON `pedidos`(`sugestao_pedido_operacional_id`);

ALTER TABLE `pedidos_operacionais`
  ADD CONSTRAINT `pedidos_operacionais_pedido_conta_azul_id_fkey` FOREIGN KEY (`pedido_conta_azul_id`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
