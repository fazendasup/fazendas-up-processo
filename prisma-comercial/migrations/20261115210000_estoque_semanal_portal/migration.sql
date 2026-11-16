-- CreateTable
CREATE TABLE `estoque_semanal_portal` (
    `id` VARCHAR(191) NOT NULL,
    `semana_inicio` DATETIME(3) NOT NULL,
    `produto_id` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(14, 3) NOT NULL,
    `atualizado_por_id` VARCHAR(191) NULL,
    `atualizado_em` DATETIME(3) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `estoque_semanal_portal_semana_inicio_idx`(`semana_inicio`),
    INDEX `estoque_semanal_portal_produto_id_idx`(`produto_id`),
    UNIQUE INDEX `estoque_semanal_portal_semana_inicio_produto_id_key`(`semana_inicio`, `produto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `estoque_semanal_portal` ADD CONSTRAINT `estoque_semanal_portal_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estoque_semanal_portal` ADD CONSTRAINT `estoque_semanal_portal_atualizado_por_id_fkey` FOREIGN KEY (`atualizado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
