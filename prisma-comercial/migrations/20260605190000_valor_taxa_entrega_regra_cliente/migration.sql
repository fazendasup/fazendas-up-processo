-- Taxa de entrega configurável por cliente para conciliação operacional × Conta Azul.

ALTER TABLE `regras_comerciais_cliente`
  ADD COLUMN `valor_taxa_entrega` DECIMAL(14, 2) NULL AFTER `cobra_taxa_entrega`;
