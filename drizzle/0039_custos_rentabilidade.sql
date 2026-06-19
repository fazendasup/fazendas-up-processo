CREATE TABLE `custos_rentabilidade_periodos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `titulo` varchar(160) NOT NULL,
  `inicio` date NOT NULL,
  `fim` date NOT NULL,
  `custoOperacionalTotal` decimal(14,2) NULL,
  `usarCustoSugerido` tinyint(1) NOT NULL DEFAULT 1,
  `observacoes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custos_rentabilidade_periodos_id` PRIMARY KEY(`id`),
  KEY `idx_rentab_periodo_proj` (`projetoId`),
  KEY `idx_rentab_periodo_datas` (`projetoId`, `inicio`, `fim`)
);

CREATE TABLE `custos_rentabilidade_linhas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `periodoId` int NOT NULL,
  `fichaId` int NULL,
  `nomeProduto` varchar(200) NOT NULL,
  `quantidade` decimal(20,6) NOT NULL DEFAULT 0,
  `receitaTotal` decimal(14,2) NOT NULL DEFAULT 0,
  `custoUnitarioManual` decimal(18,8) NULL,
  `observacoes` text NULL,
  `ordem` int NOT NULL DEFAULT 0,
  CONSTRAINT `custos_rentabilidade_linhas_id` PRIMARY KEY(`id`),
  KEY `idx_rentab_linha_periodo` (`periodoId`)
);
