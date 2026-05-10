-- Tipo de projeto microverdes + opção de caixa d'água (rega automática futura).
ALTER TABLE `projetos` MODIFY COLUMN `tipo` ENUM('fazenda_vertical','hidroponia','microverdes') NOT NULL;
ALTER TABLE `projetos` ADD COLUMN `usarCaixaAgua` tinyint(1) NOT NULL DEFAULT 1;
