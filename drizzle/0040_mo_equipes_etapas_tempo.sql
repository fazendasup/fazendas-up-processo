CREATE TABLE IF NOT EXISTS `custos_mo_equipes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `nome` varchar(160) NOT NULL,
  `regime` enum('clt','pj') NOT NULL,
  `finalidade` enum('processamento','overhead') NOT NULL DEFAULT 'processamento',
  `numPessoas` int NOT NULL DEFAULT 1,
  `horasMes` decimal(10,2) NOT NULL DEFAULT 0,
  `custoMensalBase` decimal(14,2) NULL,
  `encargosPct` decimal(8,4) NULL,
  `custoMensalTotal` decimal(14,2) NULL,
  `observacoes` text NULL,
  `ordem` int NOT NULL DEFAULT 0,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custos_mo_equipes_id` PRIMARY KEY(`id`),
  KEY `idx_custos_mo_equipes_proj` (`projetoId`)
);

ALTER TABLE `custos_produtos_etapas`
  ADD COLUMN `minutosPorUnidade` decimal(10,4) NULL,
  ADD COLUMN `regimeMo` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer';
