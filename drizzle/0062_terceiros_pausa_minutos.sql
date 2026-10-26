ALTER TABLE `terceiros_prestadores`
  ADD COLUMN `pausaMinutos` int NOT NULL DEFAULT 60;

ALTER TABLE `terceiros_registros`
  ADD COLUMN `minutosDescansoOverride` int NULL;
