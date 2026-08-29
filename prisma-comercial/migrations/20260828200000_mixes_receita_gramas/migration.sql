-- Mixes passam a ser receitas nomeadas (sem produto referência obrigatório).
-- quantidade dos componentes = gramas por unidade do mix.

ALTER TABLE `estoque_vivo_mixes` DROP FOREIGN KEY `estoque_vivo_mixes_produto_referencia_id_fkey`;

ALTER TABLE `estoque_vivo_mixes` DROP INDEX `estoque_vivo_mixes_produto_referencia_id_key`;

ALTER TABLE `estoque_vivo_mixes` MODIFY `produto_referencia_id` VARCHAR(191) NULL;

ALTER TABLE `estoque_vivo_mixes` ADD CONSTRAINT `estoque_vivo_mixes_produto_referencia_id_fkey` FOREIGN KEY (`produto_referencia_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `estoque_vivo_mixes_nome_idx` ON `estoque_vivo_mixes`(`nome`);
