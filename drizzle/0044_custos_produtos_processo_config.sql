CREATE TABLE IF NOT EXISTS `custos_produtos_processo_config` (
  `projetoId` int NOT NULL,
  `embalagemMicroverdeUn` decimal(14,6) NOT NULL DEFAULT 0.95,
  `embalagemOutrosUn` decimal(14,6) NOT NULL DEFAULT 0.60,
  `lavagemMinutosUn` decimal(10,4) NULL,
  `embalagemMinutosUn` decimal(10,4) NULL,
  `corteMinutosUn` decimal(10,4) NULL,
  `adesivoCustoUn` decimal(14,6) NULL,
  `regimeMoPadrao` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer',
  `incluirLavagem` tinyint(1) NOT NULL DEFAULT 1,
  `incluirCorte` tinyint(1) NOT NULL DEFAULT 0,
  `incluirAdesivo` tinyint(1) NOT NULL DEFAULT 1,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custos_produtos_processo_config_projetoId` PRIMARY KEY(`projetoId`)
);
