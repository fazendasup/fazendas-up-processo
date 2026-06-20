ALTER TABLE `custos_produtos_processo_config`
  ADD COLUMN `lavagemReaisKg` decimal(18,8) NULL;

CREATE TABLE IF NOT EXISTS `custos_produtos_comercial_map` (
  `projetoId` int NOT NULL,
  `produtoComercialId` varchar(64) NOT NULL,
  `categoriaCusto` varchar(32) NOT NULL DEFAULT 'outros',
  `perfilProcesso` varchar(48) NOT NULL DEFAULT 'colheita_embalagem',
  `kgPorUnidade` decimal(20,10) NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custos_prod_com_map_pk` PRIMARY KEY(`projetoId`, `produtoComercialId`)
);
