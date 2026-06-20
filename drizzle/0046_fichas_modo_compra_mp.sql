ALTER TABLE `custos_produtos_fichas`
  ADD COLUMN `custoCompraUn` decimal(14,6) NULL,
  ADD COLUMN `modoCompraMp` enum('kg','unidade') NULL DEFAULT 'kg';
