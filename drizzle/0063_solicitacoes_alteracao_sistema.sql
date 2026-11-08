CREATE TABLE IF NOT EXISTS `solicitacoes_alteracao_sistema` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `solicitadoPorId` int NOT NULL,
  `solicitadoPorNome` varchar(255) NULL,
  `pedido` text NOT NULL,
  `contextoConversacao` text NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pendente',
  `resultado` text NULL,
  `erro` text NULL,
  `commitSha` varchar(64) NULL,
  `claimedAt` timestamp NULL,
  `concluidoAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_solicitacoes_alt_status` (`status`),
  KEY `idx_solicitacoes_alt_projeto` (`projetoId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
