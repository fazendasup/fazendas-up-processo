-- Adds a logistics profile restricted to the delivery driver mode.

ALTER TABLE `usuarios`
  MODIFY COLUMN `perfil` ENUM(
    'VENDEDOR',
    'PROMOTER',
    'LIDER_COLHEITA',
    'GERENTE_COMERCIAL',
    'COMERCIAL',
    'OPERACOES',
    'LOGISTICA',
    'ADMIN'
  ) NOT NULL;
