-- Multi-projeto: projetos, projeto_usuarios, hidroponia, projetoId nas tabelas operacionais.
-- Executar com backup. Uma transação (rollback se falhar).
START TRANSACTION;

CREATE TABLE IF NOT EXISTS `projetos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `nome` varchar(255) NOT NULL,
  `tipo` enum('fazenda_vertical','hidroponia') NOT NULL,
  `descricao` text,
  `endereco` varchar(500),
  `responsavelId` int,
  `status` enum('ativo','inativo','planejamento') NOT NULL DEFAULT 'ativo',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `projetos_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `projeto_usuarios` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('admin','operador','visualizador') NOT NULL DEFAULT 'operador',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `projeto_usuarios_id` PRIMARY KEY(`id`),
  CONSTRAINT `projeto_usuarios_projeto_user` UNIQUE(`projetoId`,`userId`)
);

CREATE TABLE IF NOT EXISTS `bancadas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `codigo` varchar(50),
  `quantidadeCaixas` int NOT NULL DEFAULT 1,
  `tipoCultivo` varchar(100),
  `comprimentoMetros` decimal(5,2),
  `status` enum('ativa','inativa','manutencao') NOT NULL DEFAULT 'ativa',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `bancadas_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `caixas_bancada` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bancadaId` int NOT NULL,
  `projetoId` int NOT NULL,
  `posicao` int NOT NULL,
  `variedadeId` int,
  `status` enum('vazia','plantada','germinando','colheita') NOT NULL DEFAULT 'vazia',
  `dataPlantio` timestamp,
  `dataPrevisaoColheita` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `caixas_bancada_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `medicoes_bancada` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bancadaId` int NOT NULL,
  `projetoId` int NOT NULL,
  `ph` decimal(4,2),
  `ec` decimal(5,2),
  `temperaturaAgua` decimal(4,1),
  `temperaturaAmbiente` decimal(4,1),
  `umidade` decimal(4,1),
  `observacoes` text,
  `medidoPor` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `medicoes_bancada_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `aplicacoes_bancada` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bancadaId` int NOT NULL,
  `projetoId` int NOT NULL,
  `tipoAplicacao` varchar(100) NOT NULL,
  `produto` varchar(255) NOT NULL,
  `quantidade` decimal(10,3),
  `unidade` varchar(20),
  `observacoes` text,
  `aplicadoPor` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `aplicacoes_bancada_id` PRIMARY KEY(`id`)
);

INSERT INTO `projetos` (`nome`, `tipo`, `status`) VALUES ('Fazenda Vertical Principal', 'fazenda_vertical', 'ativo');
SET @projeto_padrao_id = LAST_INSERT_ID();

INSERT INTO `projeto_usuarios` (`projetoId`, `userId`, `role`)
SELECT @projeto_padrao_id, `id`, 'admin' FROM `users`;

-- Slugs únicos por projeto
ALTER TABLE `variedades` DROP INDEX `variedades_slug_unique`;
ALTER TABLE `variedades` ADD COLUMN `projetoId` int NULL;
UPDATE `variedades` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `variedades` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `variedades` ADD CONSTRAINT `variedades_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
CREATE UNIQUE INDEX `variedades_projeto_slug` ON `variedades` (`projetoId`, `slug`);

ALTER TABLE `fases_config` DROP INDEX `fases_config_fase_unique`;
ALTER TABLE `fases_config` ADD COLUMN `projetoId` int NULL;
UPDATE `fases_config` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `fases_config` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `fases_config` ADD CONSTRAINT `fases_config_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
CREATE UNIQUE INDEX `fases_config_projeto_fase` ON `fases_config` (`projetoId`, `fase`);

ALTER TABLE `caixas_agua` DROP INDEX `caixas_agua_slug_unique`;
ALTER TABLE `caixas_agua` ADD COLUMN `projetoId` int NULL;
UPDATE `caixas_agua` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `caixas_agua` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `caixas_agua` ADD CONSTRAINT `caixas_agua_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
CREATE UNIQUE INDEX `caixas_agua_projeto_slug` ON `caixas_agua` (`projetoId`, `slug`);

ALTER TABLE `torres` DROP INDEX `torres_slug_unique`;
ALTER TABLE `torres` ADD COLUMN `projetoId` int NULL;
UPDATE `torres` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `torres` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `torres` ADD CONSTRAINT `torres_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
CREATE UNIQUE INDEX `torres_projeto_slug` ON `torres` (`projetoId`, `slug`);

ALTER TABLE `medicoes_caixa` ADD COLUMN `projetoId` int NULL;
UPDATE `medicoes_caixa` mc INNER JOIN `caixas_agua` c ON mc.`caixaAguaId` = c.`id` SET mc.`projetoId` = c.`projetoId`;
UPDATE `medicoes_caixa` SET `projetoId` = @projeto_padrao_id WHERE `projetoId` IS NULL;
ALTER TABLE `medicoes_caixa` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `medicoes_caixa` ADD CONSTRAINT `medicoes_caixa_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `aplicacoes_caixa` ADD COLUMN `projetoId` int NULL;
UPDATE `aplicacoes_caixa` ac INNER JOIN `caixas_agua` c ON ac.`caixaAguaId` = c.`id` SET ac.`projetoId` = c.`projetoId`;
UPDATE `aplicacoes_caixa` SET `projetoId` = @projeto_padrao_id WHERE `projetoId` IS NULL;
ALTER TABLE `aplicacoes_caixa` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `aplicacoes_caixa` ADD CONSTRAINT `aplicacoes_caixa_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `andares` ADD COLUMN `projetoId` int NULL;
UPDATE `andares` a INNER JOIN `torres` t ON a.`torreId` = t.`id` SET a.`projetoId` = t.`projetoId`;
ALTER TABLE `andares` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `andares` ADD CONSTRAINT `andares_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `perfis` ADD COLUMN `projetoId` int NULL;
UPDATE `perfis` p INNER JOIN `andares` a ON p.`andarId` = a.`id` SET p.`projetoId` = a.`projetoId`;
ALTER TABLE `perfis` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `perfis` ADD CONSTRAINT `perfis_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `furos` ADD COLUMN `projetoId` int NULL;
UPDATE `furos` f INNER JOIN `andares` a ON f.`andarId` = a.`id` SET f.`projetoId` = a.`projetoId`;
ALTER TABLE `furos` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `furos` ADD CONSTRAINT `furos_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `aplicacoes_andar` ADD COLUMN `projetoId` int NULL;
UPDATE `aplicacoes_andar` aa INNER JOIN `andares` a ON aa.`andarId` = a.`id` SET aa.`projetoId` = a.`projetoId`;
ALTER TABLE `aplicacoes_andar` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `aplicacoes_andar` ADD CONSTRAINT `aplicacoes_andar_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `germinacao` ADD COLUMN `projetoId` int NULL;
UPDATE `germinacao` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `germinacao` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `germinacao` ADD CONSTRAINT `germinacao_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `transplantios` ADD COLUMN `projetoId` int NULL;
UPDATE `transplantios` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `transplantios` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `transplantios` ADD CONSTRAINT `transplantios_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `manutencoes` ADD COLUMN `projetoId` int NULL;
UPDATE `manutencoes` m INNER JOIN `torres` t ON m.`torreId` = t.`id` SET m.`projetoId` = t.`projetoId`;
UPDATE `manutencoes` SET `projetoId` = @projeto_padrao_id WHERE `projetoId` IS NULL;
ALTER TABLE `manutencoes` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `manutencoes` ADD CONSTRAINT `manutencoes_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `ciclos` ADD COLUMN `projetoId` int NULL;
UPDATE `ciclos` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `ciclos` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `ciclos` ADD CONSTRAINT `ciclos_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `receitas_crescimento` ADD COLUMN `projetoId` int NULL;
UPDATE `receitas_crescimento` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `receitas_crescimento` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `receitas_crescimento` ADD CONSTRAINT `receitas_crescimento_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `tarefas` ADD COLUMN `projetoId` int NULL;
UPDATE `tarefas` tf
LEFT JOIN `torres` t ON tf.`torreId` = t.`id`
LEFT JOIN `caixas_agua` c ON tf.`caixaAguaId` = c.`id`
SET tf.`projetoId` = COALESCE(t.`projetoId`, c.`projetoId`, @projeto_padrao_id);
ALTER TABLE `tarefas` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `tarefas` ADD CONSTRAINT `tarefas_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `registros_colheita` ADD COLUMN `projetoId` int NULL;
UPDATE `registros_colheita` rc INNER JOIN `torres` t ON rc.`torreId` = t.`id` SET rc.`projetoId` = t.`projetoId`;
UPDATE `registros_colheita` SET `projetoId` = @projeto_padrao_id WHERE `projetoId` IS NULL;
ALTER TABLE `registros_colheita` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `registros_colheita` ADD CONSTRAINT `registros_colheita_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `planos_plantio` ADD COLUMN `projetoId` int NULL;
UPDATE `planos_plantio` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `planos_plantio` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `planos_plantio` ADD CONSTRAINT `planos_plantio_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `recommendation_rules` ADD COLUMN `projetoId` int NULL;
UPDATE `recommendation_rules` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `recommendation_rules` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `recommendation_rules` ADD CONSTRAINT `recommendation_rules_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `intelligent_alerts` ADD COLUMN `projetoId` int NULL;
UPDATE `intelligent_alerts` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `intelligent_alerts` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `intelligent_alerts` ADD CONSTRAINT `intelligent_alerts_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `alert_events` ADD COLUMN `projetoId` int NULL;
UPDATE `alert_events` ae INNER JOIN `intelligent_alerts` ia ON ae.`alertaId` = ia.`id` SET ae.`projetoId` = ia.`projetoId`;
UPDATE `alert_events` SET `projetoId` = @projeto_padrao_id WHERE `projetoId` IS NULL;
ALTER TABLE `alert_events` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `estoque_itens` ADD COLUMN `projetoId` int NULL;
UPDATE `estoque_itens` SET `projetoId` = @projeto_padrao_id;
ALTER TABLE `estoque_itens` MODIFY `projetoId` int NOT NULL;
ALTER TABLE `estoque_itens` ADD CONSTRAINT `estoque_itens_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

ALTER TABLE `projeto_usuarios` ADD CONSTRAINT `projeto_usuarios_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
ALTER TABLE `projeto_usuarios` ADD CONSTRAINT `projeto_usuarios_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`);
ALTER TABLE `bancadas` ADD CONSTRAINT `bancadas_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
ALTER TABLE `caixas_bancada` ADD CONSTRAINT `caixas_bancada_bancada_fk` FOREIGN KEY (`bancadaId`) REFERENCES `bancadas`(`id`);
ALTER TABLE `caixas_bancada` ADD CONSTRAINT `caixas_bancada_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
ALTER TABLE `medicoes_bancada` ADD CONSTRAINT `medicoes_bancada_bancada_fk` FOREIGN KEY (`bancadaId`) REFERENCES `bancadas`(`id`);
ALTER TABLE `medicoes_bancada` ADD CONSTRAINT `medicoes_bancada_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);
ALTER TABLE `aplicacoes_bancada` ADD CONSTRAINT `aplicacoes_bancada_bancada_fk` FOREIGN KEY (`bancadaId`) REFERENCES `bancadas`(`id`);
ALTER TABLE `aplicacoes_bancada` ADD CONSTRAINT `aplicacoes_bancada_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`);

CREATE INDEX `idx_variedades_projeto` ON `variedades` (`projetoId`);
CREATE INDEX `idx_torres_projeto` ON `torres` (`projetoId`);
CREATE INDEX `idx_andares_projeto` ON `andares` (`projetoId`);
CREATE INDEX `idx_ciclos_projeto` ON `ciclos` (`projetoId`);
CREATE INDEX `idx_tarefas_projeto` ON `tarefas` (`projetoId`);
CREATE INDEX `idx_manutencoes_projeto` ON `manutencoes` (`projetoId`);
CREATE INDEX `idx_estoque_itens_projeto` ON `estoque_itens` (`projetoId`);
CREATE INDEX `idx_registros_colheita_projeto` ON `registros_colheita` (`projetoId`);
CREATE INDEX `idx_germinacao_projeto` ON `germinacao` (`projetoId`);
CREATE INDEX `idx_transplantios_projeto` ON `transplantios` (`projetoId`);
CREATE INDEX `idx_medicoes_caixa_projeto` ON `medicoes_caixa` (`projetoId`);
CREATE INDEX `idx_aplicacoes_caixa_projeto` ON `aplicacoes_caixa` (`projetoId`);
CREATE INDEX `idx_aplicacoes_andar_projeto` ON `aplicacoes_andar` (`projetoId`);
CREATE INDEX `idx_furos_projeto` ON `furos` (`projetoId`);
CREATE INDEX `idx_perfis_projeto` ON `perfis` (`projetoId`);
CREATE INDEX `idx_planos_plantio_projeto` ON `planos_plantio` (`projetoId`);
CREATE INDEX `idx_intelligent_alerts_projeto` ON `intelligent_alerts` (`projetoId`);
CREATE INDEX `idx_alert_events_projeto` ON `alert_events` (`projetoId`);
CREATE INDEX `idx_recommendation_rules_projeto` ON `recommendation_rules` (`projetoId`);
CREATE INDEX `idx_receitas_crescimento_projeto` ON `receitas_crescimento` (`projetoId`);
CREATE INDEX `idx_fases_config_projeto` ON `fases_config` (`projetoId`);
CREATE INDEX `idx_caixas_agua_projeto` ON `caixas_agua` (`projetoId`);
CREATE INDEX `idx_bancadas_projeto` ON `bancadas` (`projetoId`);
CREATE INDEX `idx_caixas_bancada_projeto` ON `caixas_bancada` (`projetoId`);

COMMIT;
