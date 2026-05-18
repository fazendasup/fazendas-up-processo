CREATE TABLE `custos_producao_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projetoId` int NOT NULL,
	`variedadeId` int NOT NULL,
	`grupo` varchar(64) NOT NULL,
	`rubrica` varchar(160) NOT NULL,
	`descricao` text,
	`modo` enum('calculado','por_planta','por_ciclo','mensal_rateio') NOT NULL DEFAULT 'por_planta',
	`precoReferencia` decimal(18,8),
	`unidadeCompra` varchar(32),
	`quantidadePorPlanta` decimal(20,10),
	`valorPorPlanta` decimal(14,6),
	`valorPorCiclo` decimal(14,2),
	`plantasPorCicloEstimado` int,
	`valorMensal` decimal(14,2),
	`plantasMesEstimativa` int,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` tinyint(1) NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custos_producao_itens_id` PRIMARY KEY(`id`)
);
CREATE INDEX `idx_custos_prod_proj_var` ON `custos_producao_itens` (`projetoId`,`variedadeId`);
