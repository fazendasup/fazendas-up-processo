CREATE TABLE IF NOT EXISTS `medicoes_auditoria` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `origem` varchar(16) NOT NULL,
  `medicaoId` int NOT NULL,
  `acao` varchar(16) NOT NULL,
  `antesJson` text NOT NULL,
  `depoisJson` text,
  `usuarioId` int,
  `usuarioNome` varchar(128),
  `motivo` varchar(255),
  `criadoEm` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `medicoes_auditoria_projeto_medicao` (`projetoId`, `origem`, `medicaoId`)
);
