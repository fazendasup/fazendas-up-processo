CREATE TABLE `relatorio_vendas_classe_config` (
    `id` VARCHAR(191) NOT NULL,
    `unificar_classe` JSON NOT NULL,
    `produto_para_classe` JSON NOT NULL,
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `relatorio_vendas_classe_config` (`id`, `unificar_classe`, `produto_para_classe`, `atualizado_em`)
VALUES ('default', JSON_OBJECT(), JSON_OBJECT(), CURRENT_TIMESTAMP(3));
