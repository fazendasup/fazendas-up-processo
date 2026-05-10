-- Número operacional por torre (ordenação estável) + override JSON da grelha física (ex.: 12×6).
ALTER TABLE `torres` ADD COLUMN `numeroTorre` int NULL;
ALTER TABLE `torres` ADD COLUMN `estruturaOverrideJson` text NULL;

UPDATE `torres` `t`
INNER JOIN (
  SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `projetoId` ORDER BY `id`) AS `rn`
  FROM `torres`
) `x` ON `t`.`id` = `x`.`id`
SET `t`.`numeroTorre` = `x`.`rn`;

ALTER TABLE `torres` MODIFY `numeroTorre` int NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX `torres_projeto_numero` ON `torres` (`projetoId`, `numeroTorre`);

-- Torres operacionais nº 13 e 14: grelha 12 perfis × 6 furos (vegetativa e maturação).
UPDATE `torres`
SET `estruturaOverrideJson` = '{"vegetativa":{"perfis":12,"furosPorPerfil":6},"maturacao":{"perfis":12,"furosPorPerfil":6}}'
WHERE `numeroTorre` IN (13, 14);
