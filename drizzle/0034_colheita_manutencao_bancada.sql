-- Hidroponia de bancada: manutenção e colheita passam a aceitar `bancadaId`.
-- Torre/andar tornam-se opcionais (nulos quando o registro é de uma bancada).
-- Aplicado também em runtime por ensureManutencoesBancadaColumns / ensureRegistrosColheitaBancadaColumns.

ALTER TABLE `manutencoes` ADD COLUMN `bancadaId` int NULL;
ALTER TABLE `manutencoes` MODIFY COLUMN `torreId` int NULL;

ALTER TABLE `registros_colheita` ADD COLUMN `bancadaId` int NULL;
ALTER TABLE `registros_colheita` MODIFY COLUMN `torreId` int NULL;
ALTER TABLE `registros_colheita` MODIFY COLUMN `andarId` int NULL;
