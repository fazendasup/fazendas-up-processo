CREATE TABLE IF NOT EXISTS `compra_nf` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `chaveAcesso` varchar(44) NULL,
  `numero` varchar(32) NULL,
  `serie` varchar(8) NULL,
  `dataEmissao` varchar(10) NOT NULL,
  `fornecedorNome` varchar(255) NOT NULL,
  `fornecedorCnpj` varchar(18) NULL,
  `fornecedorIdCa` varchar(64) NULL,
  `valorTotal` decimal(14,2) NOT NULL DEFAULT 0,
  `externalIdCa` varchar(64) NULL,
  `fonte` enum('xml','conta_azul','manual') NOT NULL DEFAULT 'xml',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_compra_nf_proj_chave` (`projetoId`, `chaveAcesso`),
  UNIQUE KEY `uq_compra_nf_proj_ca` (`projetoId`, `externalIdCa`),
  KEY `idx_compra_nf_proj_data` (`projetoId`, `dataEmissao`),
  KEY `idx_compra_nf_proj_forn` (`projetoId`, `fornecedorNome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `compra_nf_itens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `compraNfId` int NOT NULL,
  `projetoId` int NOT NULL,
  `nItem` int NULL,
  `codigo` varchar(64) NULL,
  `descricao` varchar(512) NOT NULL,
  `quantidade` decimal(14,4) NOT NULL DEFAULT 0,
  `unidade` varchar(16) NULL,
  `valorUnitario` decimal(14,4) NULL,
  `valorTotal` decimal(14,2) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_compra_nf_itens_nf` (`compraNfId`),
  KEY `idx_compra_nf_itens_proj_desc` (`projetoId`, `descricao`(191)),
  CONSTRAINT `fk_compra_nf_itens_nf`
    FOREIGN KEY (`compraNfId`) REFERENCES `compra_nf` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
