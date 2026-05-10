-- Plantio ao nível da bancada (linha inteira), alinhado ao conceito de perfil na torre
ALTER TABLE `bancadas` ADD COLUMN `plantioVariedadeId` int NULL;
ALTER TABLE `bancadas` ADD COLUMN `plantioDataEntrada` timestamp NULL;
ALTER TABLE `bancadas` ADD COLUMN `plantioPrevisaoColheita` timestamp NULL;
