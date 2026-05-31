-- CreateTable
CREATE TABLE `fechamentos_semanais` (
    `id` VARCHAR(191) NOT NULL,
    `semana_inicio` DATETIME(3) NOT NULL,
    `semana_fim` DATETIME(3) NOT NULL,
    `fechado_por_id` VARCHAR(191) NULL,
    `fechado_por_nome` VARCHAR(191) NULL,
    `fechado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_pedidos` INTEGER NOT NULL DEFAULT 0,
    `total_entregues` INTEGER NOT NULL DEFAULT 0,
    `total_cancelados` INTEGER NOT NULL DEFAULT 0,
    `valor_entregue` DECIMAL(14, 2) NULL,
    `reaberto_em` DATETIME(3) NULL,
    `reaberto_por_id` VARCHAR(191) NULL,
    `reaberto_por_nome` VARCHAR(191) NULL,
    `snapshot` JSON NULL,

    UNIQUE INDEX `fechamentos_semanais_semana_inicio_key`(`semana_inicio`),
    INDEX `fechamentos_semanais_semana_inicio_idx`(`semana_inicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
