-- Perfil empresa vs pessoa no portal + cobranças de pedido PF.

ALTER TABLE `portal_acessos`
  ADD COLUMN `perfil` ENUM('EMPRESA', 'PESSOA') NOT NULL DEFAULT 'EMPRESA';

CREATE INDEX `portal_acessos_perfil_idx` ON `portal_acessos`(`perfil`);

CREATE TABLE `portal_pedido_pagamentos` (
  `id` VARCHAR(191) NOT NULL,
  `pedido_id` VARCHAR(191) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'AGUARDANDO',
  `total` DECIMAL(14, 2) NOT NULL,
  `conta_azul_receber_id` VARCHAR(191) NULL,
  `parcela_id` VARCHAR(191) NULL,
  `pix_cobranca_id` VARCHAR(191) NULL,
  `pix_url` TEXT NULL,
  `cartao_cobranca_id` VARCHAR(191) NULL,
  `cartao_url` TEXT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,
  `pago_em` DATETIME(3) NULL,
  UNIQUE INDEX `portal_pedido_pagamentos_pedido_id_key`(`pedido_id`),
  INDEX `portal_pedido_pagamentos_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
