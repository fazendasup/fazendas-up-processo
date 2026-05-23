CREATE TABLE `estoque_vivo_config` (
    `id` VARCHAR(191) NOT NULL,
    `mix_referencia_nome` VARCHAR(191) NOT NULL,
    `mix_variedades` JSON NOT NULL,
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `estoque_vivo_config` (`id`, `mix_referencia_nome`, `mix_variedades`, `atualizado_em`)
VALUES (
    'default',
    'Alface MIX',
    JSON_ARRAY('Alface Crespa Verde', 'Alface Crespa Roxa', 'Alface Americana'),
    CURRENT_TIMESTAMP(3)
);
