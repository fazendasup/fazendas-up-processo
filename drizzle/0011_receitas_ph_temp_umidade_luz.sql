-- pH único, temperatura/umidade médias, horas de luz por fase
ALTER TABLE `receitas_crescimento`
  ADD COLUMN `ph` FLOAT NULL,
  ADD COLUMN `temperaturaMedia` FLOAT NULL,
  ADD COLUMN `umidadeMedia` FLOAT NULL,
  ADD COLUMN `horasLuzPorFase` JSON NULL;

-- Médias a partir de faixas antigas
UPDATE `receitas_crescimento`
SET `temperaturaMedia` = CASE
    WHEN `temperaturaMin` IS NOT NULL AND `temperaturaMax` IS NOT NULL THEN (`temperaturaMin` + `temperaturaMax`) / 2
    ELSE COALESCE(`temperaturaMin`, `temperaturaMax`)
  END
WHERE `temperaturaMedia` IS NULL;

UPDATE `receitas_crescimento`
SET `umidadeMedia` = CASE
    WHEN `umidadeMin` IS NOT NULL AND `umidadeMax` IS NOT NULL THEN (`umidadeMin` + `umidadeMax`) / 2
    ELSE COALESCE(`umidadeMin`, `umidadeMax`)
  END
WHERE `umidadeMedia` IS NULL;

-- pH a partir do primeiro valor numérico em phPorFase (mudas / vegetativa / maturacao)
UPDATE `receitas_crescimento`
SET `ph` = COALESCE(
  CAST(JSON_EXTRACT(`phPorFase`, '$.mudas') AS DECIMAL(10, 3)),
  CAST(JSON_EXTRACT(`phPorFase`, '$.vegetativa') AS DECIMAL(10, 3)),
  CAST(JSON_EXTRACT(`phPorFase`, '$.maturacao') AS DECIMAL(10, 3))
)
WHERE `ph` IS NULL AND `phPorFase` IS NOT NULL;

-- Uma hora de luz legada → mudas / vegetativa / maturação (germinação é no escuro; sem chave)
UPDATE `receitas_crescimento`
SET `horasLuzPorFase` = JSON_OBJECT(
  'mudas', `horasLuz`,
  'vegetativa', `horasLuz`,
  'maturacao', `horasLuz`
)
WHERE `horasLuzPorFase` IS NULL AND `horasLuz` IS NOT NULL;
