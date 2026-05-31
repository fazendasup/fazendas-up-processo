-- CreateTable
CREATE TABLE `grupos_cliente` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RESTAURANTE','PLANO_ASSINATURA','SUPERMERCADO','AVULSO','OUTROS') NULL,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `grupos_cliente_nome_idx`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `clientes` ADD COLUMN `grupo_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `clientes_grupo_id_idx` ON `clientes`(`grupo_id`);

-- AddForeignKey
ALTER TABLE `clientes`
    ADD CONSTRAINT `clientes_grupo_id_fkey`
    FOREIGN KEY (`grupo_id`) REFERENCES `grupos_cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
