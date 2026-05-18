-- Custos: rubricas partilhadas (projeto) + rateio entre variedades
ALTER TABLE `custos_producao_itens` MODIFY COLUMN `variedadeId` int NULL;
ALTER TABLE `custos_producao_itens` ADD COLUMN `rateioMetodo` varchar(24) NULL;
ALTER TABLE `custos_producao_itens` ADD COLUMN `rateioDiasColheita` int NULL;
ALTER TABLE `custos_producao_itens` MODIFY COLUMN `modo` ENUM(
  'calculado',
  'por_planta',
  'por_ciclo',
  'mensal_rateio',
  'rateio_projeto'
) NOT NULL DEFAULT 'por_planta';
