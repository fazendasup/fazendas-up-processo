-- Mixes personalizados do estoque vivo (componentes + perda %)
CREATE TABLE `estoque_vivo_mixes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `produto_referencia_id` VARCHAR(191) NOT NULL,
    `perda_percentual` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `estoque_vivo_mixes_produto_referencia_id_key`(`produto_referencia_id`),
    INDEX `estoque_vivo_mixes_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `estoque_vivo_mix_componentes` (
    `id` VARCHAR(191) NOT NULL,
    `mix_id` VARCHAR(191) NOT NULL,
    `produto_id` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(14, 4) NOT NULL,

    INDEX `estoque_vivo_mix_componentes_produto_id_idx`(`produto_id`),
    UNIQUE INDEX `estoque_vivo_mix_componentes_mix_id_produto_id_key`(`mix_id`, `produto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `estoque_vivo_mixes` ADD CONSTRAINT `estoque_vivo_mixes_produto_referencia_id_fkey` FOREIGN KEY (`produto_referencia_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `estoque_vivo_mix_componentes` ADD CONSTRAINT `estoque_vivo_mix_componentes_mix_id_fkey` FOREIGN KEY (`mix_id`) REFERENCES `estoque_vivo_mixes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `estoque_vivo_mix_componentes` ADD CONSTRAINT `estoque_vivo_mix_componentes_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
