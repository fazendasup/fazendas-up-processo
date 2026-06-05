-- Catálogo de produtos sincronizado do Conta Azul com importação seletiva para operação
ALTER TABLE `produtos_comerciais`
  ADD COLUMN `conta_azul_produto_id` VARCHAR(191) NULL,
  ADD COLUMN `sku` VARCHAR(191) NULL,
  ADD COLUMN `status_conta_azul` VARCHAR(191) NULL,
  ADD COLUMN `sincronizado_em` DATETIME(3) NULL,
  ADD COLUMN `importado_operacao` BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX `produtos_comerciais_conta_azul_produto_id_key` ON `produtos_comerciais`(`conta_azul_produto_id`);
CREATE INDEX `produtos_comerciais_sku_idx` ON `produtos_comerciais`(`sku`);
CREATE INDEX `produtos_comerciais_importado_operacao_ativo_idx` ON `produtos_comerciais`(`importado_operacao`, `ativo`);

-- Produtos legados (sem vínculo Conta Azul) continuam na operação
UPDATE `produtos_comerciais` SET `importado_operacao` = true WHERE `conta_azul_produto_id` IS NULL;
