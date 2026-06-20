CREATE TABLE IF NOT EXISTS `custos_produtos_processo_modelos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `nome` varchar(120) NOT NULL,
  `slug` varchar(64) NOT NULL,
  `descricao` text NULL,
  `familia` enum('folhosas','legumes','microverdes','outros') NOT NULL DEFAULT 'folhosas',
  `isDefault` tinyint(1) NOT NULL DEFAULT 0,
  `kgReferenciaMes` decimal(14,4) NULL,
  `embalagemMicroverdeUn` decimal(14,6) NOT NULL DEFAULT 0.95,
  `embalagemOutrosUn` decimal(14,6) NOT NULL DEFAULT 0.60,
  `lavagemReaisKg` decimal(18,8) NULL,
  `corteMinutosUn` decimal(10,4) NULL,
  `embalagemMinutosUn` decimal(10,4) NULL,
  `adesivoCustoUn` decimal(14,6) NULL,
  `regimeMoPadrao` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer',
  `incluirAdesivo` tinyint(1) NOT NULL DEFAULT 1,
  `linhaProcessoJson` text NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custos_produtos_processo_modelos_id` PRIMARY KEY(`id`),
  UNIQUE KEY `uq_processo_modelo_slug` (`projetoId`, `slug`),
  KEY `idx_processo_modelo_projeto` (`projetoId`)
);

ALTER TABLE `custos_produtos_comercial_map`
  ADD COLUMN `processoModeloId` int NULL;
