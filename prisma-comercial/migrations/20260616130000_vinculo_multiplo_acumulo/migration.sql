-- Permite vincular vários pedidos operacionais à mesma venda Conta Azul (faturamento acumulado)

DROP INDEX `pedidos_operacionais_pedido_conta_azul_id_key` ON `pedidos_operacionais`;
CREATE INDEX `pedidos_operacionais_pedido_conta_azul_id_idx` ON `pedidos_operacionais`(`pedido_conta_azul_id`);
