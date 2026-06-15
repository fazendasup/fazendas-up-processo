-- Fichas de custo por produto/SKU (produção própria, revenda, mix)
CREATE TABLE `custos_produtos_fichas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `projetoId` int NOT NULL,
  `tipo` enum('producao_propria','revenda_processada','mix','manual') NOT NULL DEFAULT 'manual',
  `categoria` varchar(32) NOT NULL DEFAULT 'outros',
  `nome` varchar(200) NOT NULL,
  `produtoComercialId` varchar(64) NULL,
  `unidadeVenda` varchar(32) NOT NULL DEFAULT 'unidade',
  `precoVendaReferencia` decimal(14,2) NULL,
  `precoCompraKg` decimal(18,8) NULL,
  `kgBrutoPorUnidade` decimal(20,10) NULL,
  `perdaLavagemPct` decimal(8,4) NULL,
  `perdaDescasquePct` decimal(8,4) NULL,
  `perdaSelecaoPct` decimal(8,4) NULL,
  `variedadeId` int NULL,
  `kgColhidoPorPlanta` decimal(20,10) NULL,
  `kgProducaoPorUnidade` decimal(20,10) NULL,
  `observacoes` text NULL,
  `ordem` int NOT NULL DEFAULT 0,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custos_produtos_fichas_id` PRIMARY KEY(`id`),
  KEY `idx_custos_prod_fichas_proj` (`projetoId`)
);

CREATE TABLE `custos_produtos_componentes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `fichaId` int NOT NULL,
  `tipo` enum('variedade','estoque','produto_comercial','manual','ficha') NOT NULL DEFAULT 'manual',
  `variedadeId` int NULL,
  `estoqueItemId` int NULL,
  `produtoComercialId` varchar(64) NULL,
  `componenteFichaId` int NULL,
  `nomeManual` varchar(200) NULL,
  `quantidadePorUnidade` decimal(20,10) NOT NULL,
  `unidadeComponente` varchar(32) NOT NULL DEFAULT 'kg',
  `custoUnitarioManual` decimal(18,8) NULL,
  `ordem` int NOT NULL DEFAULT 0,
  CONSTRAINT `custos_produtos_componentes_id` PRIMARY KEY(`id`),
  KEY `idx_custos_prod_comp_ficha` (`fichaId`)
);

CREATE TABLE `custos_produtos_etapas` (
  `id` int AUTO_INCREMENT NOT NULL,
  `fichaId` int NOT NULL,
  `tipo` enum('lavagem','descasque_corte','embalagem','adesivo','mao_de_obra','logistica','outros') NOT NULL DEFAULT 'outros',
  `nome` varchar(160) NOT NULL,
  `custoPorUnidade` decimal(14,6) NOT NULL DEFAULT 0,
  `custoPorKgProcessado` decimal(18,8) NULL,
  `ordem` int NOT NULL DEFAULT 0,
  CONSTRAINT `custos_produtos_etapas_id` PRIMARY KEY(`id`),
  KEY `idx_custos_prod_etapas_ficha` (`fichaId`)
);
