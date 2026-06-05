-- Opção B: remove toda a camada operacional desde o go-live (01/06/2026)
-- para recriação limpa a partir das vendas Conta Azul.
-- Mantém vendas/orçamentos sincronizados em `pedidos`, catálogo e regras.

CREATE TEMPORARY TABLE `tmp_pedidos_operacionais_go_live` AS
SELECT
  `id`,
  `pedido_conta_azul_id`,
  `sugestao_pedido_conta_azul_id`
FROM `pedidos_operacionais`
WHERE `data_entrega` >= '2026-06-01 00:00:00.000';

UPDATE `pedidos` p
JOIN `tmp_pedidos_operacionais_go_live` t
  ON p.`id` = t.`pedido_conta_azul_id`
  OR p.`id` = t.`sugestao_pedido_conta_azul_id`
SET
  p.`status_conciliacao` = 'NAO_CONCILIADA',
  p.`sugestao_pedido_operacional_id` = NULL;

UPDATE `pedidos` p
JOIN `tmp_pedidos_operacionais_go_live` t
  ON p.`sugestao_pedido_operacional_id` = t.`id`
SET
  p.`status_conciliacao` = 'NAO_CONCILIADA',
  p.`sugestao_pedido_operacional_id` = NULL;

-- Vendas CA do período operacional voltam para recriação manual/automática.
UPDATE `pedidos`
SET
  `status_conciliacao` = 'NAO_CONCILIADA',
  `sugestao_pedido_operacional_id` = NULL
WHERE `origem_pedido` = 'CONTA_AZUL'
  AND `data_pedido` >= '2026-06-01 00:00:00.000'
  AND `status_conciliacao` NOT IN ('IGNORADA', 'VENDA_ERRADA');

DELETE FROM `pedidos_operacionais`
WHERE `id` IN (
  SELECT `id` FROM `tmp_pedidos_operacionais_go_live`
);

DELETE FROM `fechamentos_semanais`
WHERE `semana_inicio` >= '2026-06-01 00:00:00.000';

DROP TEMPORARY TABLE `tmp_pedidos_operacionais_go_live`;
