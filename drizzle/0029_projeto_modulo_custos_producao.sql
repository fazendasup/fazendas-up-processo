-- Módulo opcional `custos_producao`: desligado por omissão em projetos existentes.
INSERT IGNORE INTO `projeto_modulos` (`projetoId`, `modulo`, `habilitado`)
SELECT `p`.`id`, 'custos_producao', 0
FROM `projetos` `p`;
