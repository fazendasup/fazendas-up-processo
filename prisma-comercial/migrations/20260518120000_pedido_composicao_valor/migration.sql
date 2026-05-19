-- Composição de valor (alinhado ao relatório Conta Azul: bruto + frete - desconto = líquido)
ALTER TABLE `pedidos`
  ADD COLUMN `valor_bruto` DECIMAL(14, 2) NULL,
  ADD COLUMN `valor_frete` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `valor_desconto` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `valor_liquido` DECIMAL(14, 2) NULL;

UPDATE `pedidos`
SET
  `valor_bruto` = `valor_total`,
  `valor_liquido` = `valor_total`,
  `valor_frete` = 0,
  `valor_desconto` = 0
WHERE `valor_liquido` IS NULL;
