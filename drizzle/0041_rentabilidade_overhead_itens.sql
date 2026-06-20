ALTER TABLE `custos_rentabilidade_periodos`
  ADD COLUMN `modoOverhead` enum('itens','sugerido','manual') NOT NULL DEFAULT 'itens';

CREATE TABLE IF NOT EXISTS `custos_rentabilidade_overhead_itens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `periodoId` int NOT NULL,
  `origem` enum('manual','conta_azul','modelo_compartilhados','modelo_mo') NOT NULL DEFAULT 'manual',
  `contaAzulParcelaId` varchar(64) NULL,
  `refModeloId` int NULL,
  `grupo` varchar(64) NOT NULL,
  `rubrica` varchar(160) NOT NULL,
  `descricao` text NULL,
  `valorOriginal` decimal(14,2) NULL,
  `valor` decimal(14,2) NOT NULL,
  `incluido` tinyint(1) NOT NULL DEFAULT 1,
  `ordem` int NOT NULL DEFAULT 0,
  CONSTRAINT `custos_rentabilidade_overhead_itens_id` PRIMARY KEY(`id`),
  KEY `idx_rentab_overhead_periodo` (`periodoId`),
  UNIQUE KEY `uq_rentab_overhead_ca` (`periodoId`, `contaAzulParcelaId`),
  UNIQUE KEY `uq_rentab_overhead_modelo` (`periodoId`, `origem`, `refModeloId`)
);
