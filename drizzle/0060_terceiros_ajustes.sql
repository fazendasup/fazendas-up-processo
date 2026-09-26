ALTER TABLE `terceiros_registros`
  ADD COLUMN `almocouNaEmpresaOverride` boolean NULL;

CREATE TABLE IF NOT EXISTS `terceiros_ajustes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `registroId` int NOT NULL,
  `prestadorId` int NOT NULL,
  `tipo` varchar(32) NOT NULL,
  `descricao` text NOT NULL,
  `detalheJson` text NULL,
  `adminUserId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_terceiros_ajustes_registro` (`registroId`),
  KEY `idx_terceiros_ajustes_prestador` (`prestadorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
