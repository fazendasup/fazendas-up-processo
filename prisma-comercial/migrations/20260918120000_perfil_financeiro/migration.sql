-- Adds a financial analysis profile restricted to financeiro-cfo pages.

ALTER TABLE `usuarios`
  MODIFY COLUMN `perfil` ENUM(
    'VENDEDOR',
    'PROMOTER',
    'LIDER_COLHEITA',
    'GERENTE_COMERCIAL',
    'COMERCIAL',
    'OPERACOES',
    'LOGISTICA',
    'FINANCEIRO',
    'ADMIN'
  ) NOT NULL;
