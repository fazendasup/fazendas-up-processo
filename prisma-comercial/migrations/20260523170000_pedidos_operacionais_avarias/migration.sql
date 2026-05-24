CREATE TABLE `pedidos_operacionais_avarias` (
    `id` VARCHAR(191) NOT NULL,
    `pedido_id` VARCHAR(191) NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `conta_azul_customer_id` VARCHAR(191) NOT NULL,
    `data_entrega` DATETIME(3) NOT NULL,
    `produto_id` VARCHAR(191) NOT NULL,
    `produto_nome` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `quantidade` DECIMAL(12, 3) NOT NULL,
    `observacoes` TEXT NULL,
    `criado_por_id` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `avarias_pedido_idx`(`pedido_id`),
    INDEX `avarias_conta_data_idx`(`conta_azul_customer_id`, `data_entrega`),
    INDEX `avarias_cliente_data_idx`(`cliente_id`, `data_entrega`),
    INDEX `avarias_produto_data_idx`(`produto_id`, `data_entrega`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `pedidos_operacionais_avarias`
    ADD CONSTRAINT `pedidos_operacionais_avarias_pedido_id_fkey`
    FOREIGN KEY (`pedido_id`) REFERENCES `pedidos_operacionais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pedidos_operacionais_avarias`
    ADD CONSTRAINT `pedidos_operacionais_avarias_cliente_id_fkey`
    FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pedidos_operacionais_avarias`
    ADD CONSTRAINT `pedidos_operacionais_avarias_produto_id_fkey`
    FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `pedidos_operacionais_avarias`
    ADD CONSTRAINT `pedidos_operacionais_avarias_criado_por_id_fkey`
    FOREIGN KEY (`criado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
