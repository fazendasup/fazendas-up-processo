ALTER TABLE `custos_mo_equipes`
  MODIFY COLUMN `regime` enum('clt','pj','prolabore') NOT NULL;

ALTER TABLE `custos_mo_equipes`
  ADD COLUMN `cargo` varchar(120) NULL,
  ADD COLUMN `codigoFolha` varchar(32) NULL;
