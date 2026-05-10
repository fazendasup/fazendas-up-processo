-- Estoque: unidades em kg e litros (antes g/ml); categorias legadas em VARCHAR já aceitam `embalagem`.
-- Converte quantidades: valores armazenados em gramas/ml passam a kg/L (÷ 1000).

UPDATE `estoque_itens`
SET
  `quantidadeTotal` = `quantidadeTotal` / 1000,
  `usoPorEvento` = `usoPorEvento` / 1000,
  `nivelMinimo` = CASE WHEN `nivelMinimo` IS NOT NULL THEN `nivelMinimo` / 1000 ELSE NULL END,
  `unidadeTipo` = 'kg'
WHERE `unidadeTipo` = 'g';

UPDATE `estoque_itens`
SET
  `quantidadeTotal` = `quantidadeTotal` / 1000,
  `usoPorEvento` = `usoPorEvento` / 1000,
  `nivelMinimo` = CASE WHEN `nivelMinimo` IS NOT NULL THEN `nivelMinimo` / 1000 ELSE NULL END,
  `unidadeTipo` = 'l'
WHERE `unidadeTipo` = 'ml';
