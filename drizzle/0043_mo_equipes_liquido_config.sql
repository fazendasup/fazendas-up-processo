ALTER TABLE `custos_mo_equipes`
  ADD COLUMN `liquidoMensal` decimal(14,2) NULL;

CREATE TABLE IF NOT EXISTS `custos_mo_config` (
  `projetoId` int NOT NULL,
  `usarLiquidoDesembolso` tinyint(1) NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custos_mo_config_projetoId` PRIMARY KEY(`projetoId`)
);
