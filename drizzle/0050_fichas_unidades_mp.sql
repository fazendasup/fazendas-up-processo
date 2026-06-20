ALTER TABLE `custos_produtos_fichas`
  ADD COLUMN `unidadesMpPorUnidade` decimal(10,4) NULL;

ALTER TABLE `custos_produtos_fichas`
  ADD COLUMN `kgPorUnidadeCompra` decimal(20,10) NULL;
