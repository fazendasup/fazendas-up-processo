-- Pronto por linha de produto no pedido operacional
ALTER TABLE `pedidos_operacionais_itens` ADD COLUMN `pronto` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `pedidos_operacionais_itens_pedido_id_pronto_idx` ON `pedidos_operacionais_itens`(`pedido_id`, `pronto`);
