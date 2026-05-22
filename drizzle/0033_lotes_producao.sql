CREATE TABLE IF NOT EXISTS `lotes_producao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projetoId` int NOT NULL,
  `codigo` varchar(64) NOT NULL,
  `variedadeId` int NOT NULL,
  `variedadeNome` varchar(128) NOT NULL,
  `dataInicio` timestamp NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'ativo',
  `quantidadeInicial` int NOT NULL DEFAULT 0,
  `quantidadeAtual` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lotes_producao_projeto_codigo` (`projetoId`, `codigo`)
);

CREATE TABLE IF NOT EXISTS `lote_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projetoId` int NOT NULL,
  `loteId` int NOT NULL,
  `tipo` varchar(32) NOT NULL,
  `dataHora` timestamp NOT NULL,
  `quantidade` int NOT NULL DEFAULT 0,
  `faseOrigem` varchar(32),
  `faseDestino` varchar(32),
  `origem` varchar(128),
  `destino` varchar(128),
  `observacoes` text,
  `executadoPorId` int,
  `executadoPorNome` varchar(128),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `lote_eventos_lote_idx` (`loteId`)
);

ALTER TABLE `perfis` ADD COLUMN `loteId` int NULL;
ALTER TABLE `furos` ADD COLUMN `loteId` int NULL;
