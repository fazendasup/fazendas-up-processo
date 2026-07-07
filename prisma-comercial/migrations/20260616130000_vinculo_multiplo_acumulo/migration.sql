-- Permite vincular vários pedidos operacionais à mesma venda Conta Azul (faturamento acumulado)

ALTER TABLE `pedidos_operacionais` DROP FOREIGN KEY `pedidos_operacionais_pedido_conta_azul_id_fkey`;
DROP INDEX `pedidos_operacionais_pedido_conta_azul_id_key` ON `pedidos_operacionais`;
CREATE INDEX `pedidos_operacionais_pedido_conta_azul_id_idx` ON `pedidos_operacionais`(`pedido_conta_azul_id`);
ALTER TABLE `pedidos_operacionais`
  ADD CONSTRAINT `pedidos_operacionais_pedido_conta_azul_id_fkey`
  FOREIGN KEY (`pedido_conta_azul_id`) REFERENCES `pedidos`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
