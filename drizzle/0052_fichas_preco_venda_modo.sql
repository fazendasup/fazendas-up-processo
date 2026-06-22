ALTER TABLE `custos_produtos_fichas`
  ADD COLUMN `precoVendaReferenciaModo` enum('automatico','manual') NOT NULL DEFAULT 'automatico';
