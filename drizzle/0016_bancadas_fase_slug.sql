-- Bancadas: fase operacional (como torres), slug único por projeto, ativa no painel
ALTER TABLE `bancadas` ADD COLUMN `slug` varchar(64) NULL;
UPDATE `bancadas` SET `slug` = CONCAT('banc-', `id`) WHERE `slug` IS NULL OR `slug` = '';
ALTER TABLE `bancadas` MODIFY `slug` varchar(64) NOT NULL;
ALTER TABLE `bancadas` ADD COLUMN `fase` varchar(32) NOT NULL DEFAULT 'vegetativa';
ALTER TABLE `bancadas` ADD COLUMN `ativa` tinyint(1) NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX `bancadas_projeto_slug` ON `bancadas` (`projetoId`, `slug`);
