-- Dias da semana de entrega por cliente (JSON: [0=Dom … 6=Sáb])
ALTER TABLE `regras_comerciais_cliente`
  ADD COLUMN `dias_entrega` JSON NULL;
