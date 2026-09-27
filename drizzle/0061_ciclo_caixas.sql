ALTER TABLE `ciclos`
  ADD COLUMN `caixaIds` json NULL;

CREATE TABLE IF NOT EXISTS `ciclo_caixa_execucoes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `cicloId` int NOT NULL,
  `caixaAguaId` int NOT NULL,
  `ultimaExecucao` timestamp NOT NULL,
  `executorId` int NULL,
  `executorNome` varchar(128) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ciclo_caixa_exec` (`cicloId`, `caixaAguaId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
