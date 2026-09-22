CREATE TABLE IF NOT EXISTS `estoque_categorias` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `slug` varchar(32) NOT NULL,
  `nome` varchar(80) NOT NULL,
  `ordem` int NOT NULL DEFAULT 0,
  `padrao` tinyint(1) NOT NULL DEFAULT 0,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_estoque_cat_proj_slug` (`projetoId`, `slug`),
  KEY `idx_estoque_cat_proj` (`projetoId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
