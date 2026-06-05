-- Limpa pedidos operacionais da semana atual para recriação a partir do Conta Azul.
-- Mantém vendas/orçamentos sincronizados em `pedidos` e remove apenas a camada operacional.

CREATE TEMPORARY TABLE `tmp_pedidos_operacionais_limpeza` AS
SELECT
  `id`,
  `pedido_conta_azul_id`,
  `sugestao_pedido_conta_azul_id`
FROM `pedidos_operacionais`
WHERE `data_entrega` >= '2026-06-01 00:00:00.000'
  AND `data_entrega` <= '2026-06-07 23:59:59.999';

UPDATE `pedidos` p
JOIN `tmp_pedidos_operacionais_limpeza` t
  ON p.`id` = t.`pedido_conta_azul_id`
  OR p.`id` = t.`sugestao_pedido_conta_azul_id`
SET
  p.`status_conciliacao` = 'NAO_CONCILIADA',
  p.`sugestao_pedido_operacional_id` = NULL;

UPDATE `pedidos` p
JOIN `tmp_pedidos_operacionais_limpeza` t
  ON p.`sugestao_pedido_operacional_id` = t.`id`
SET
  p.`status_conciliacao` = 'NAO_CONCILIADA',
  p.`sugestao_pedido_operacional_id` = NULL;

DELETE FROM `pedidos_operacionais`
WHERE `id` IN (
  SELECT `id` FROM `tmp_pedidos_operacionais_limpeza`
);

DELETE FROM `fechamentos_semanais`
WHERE `semana_inicio` >= '2026-06-01 00:00:00.000'
  AND `semana_inicio` <= '2026-06-01 23:59:59.999';

DROP TEMPORARY TABLE `tmp_pedidos_operacionais_limpeza`;
