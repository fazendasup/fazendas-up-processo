-- Desconto percentual em boleto (não na nota) por cliente
ALTER TABLE `regras_comerciais_cliente`
  ADD COLUMN `desconto_boleto_percentual` DECIMAL(5, 2) NULL AFTER `prazo_boleto_dias`;
