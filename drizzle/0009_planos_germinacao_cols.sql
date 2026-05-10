ALTER TABLE `planos_plantio` ADD `germinadas` int DEFAULT 0 NOT NULL;
ALTER TABLE `planos_plantio` ADD `naoGerminadas` int DEFAULT 0 NOT NULL;
ALTER TABLE `planos_plantio` ADD `transplantadasGerminacao` int DEFAULT 0 NOT NULL;
ALTER TABLE `planos_plantio` ADD `germinacaoFase` varchar(32) DEFAULT 'pendente' NOT NULL;
UPDATE `planos_plantio` SET `naoGerminadas` = `quantidadePlantas` WHERE `germinadas` = 0 AND (`naoGerminadas` = 0 OR `naoGerminadas` IS NULL);
