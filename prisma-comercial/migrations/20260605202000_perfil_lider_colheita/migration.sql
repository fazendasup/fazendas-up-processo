-- Adds a harvest leader profile with restricted commercial access.

ALTER TABLE `usuarios`
  MODIFY COLUMN `perfil` ENUM(
    'VENDEDOR',
    'PROMOTER',
    'LIDER_COLHEITA',
    'GERENTE_COMERCIAL',
    'COMERCIAL',
    'OPERACOES',
    'ADMIN'
  ) NOT NULL;
