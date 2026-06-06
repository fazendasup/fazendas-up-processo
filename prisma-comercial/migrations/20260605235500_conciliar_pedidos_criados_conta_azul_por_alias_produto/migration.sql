-- Pedidos criados a partir do Conta Azul podem converter produtos para a operação
-- (produto operacional/alias). Essa conversão não é divergência real.

CREATE TEMPORARY TABLE `tmp_pedidos_criados_ca_divergentes_por_alias` AS
SELECT
  po.`id` AS `pedido_operacional_id`,
  po.`pedido_conta_azul_id` AS `pedido_conta_azul_id`
FROM `pedidos_operacionais` po
WHERE po.`pedido_conta_azul_id` IS NOT NULL
  AND po.`status_conciliacao` = 'DIVERGENTE'
  AND JSON_CONTAINS(po.`snapshot_conciliacao`, 'null', '$.operacional') = 1;

UPDATE `pedidos_operacionais` po
JOIN `tmp_pedidos_criados_ca_divergentes_por_alias` tmp
  ON tmp.`pedido_operacional_id` = po.`id`
SET po.`status_conciliacao` = 'CONCILIADO';

UPDATE `pedidos` p
JOIN `tmp_pedidos_criados_ca_divergentes_por_alias` tmp
  ON tmp.`pedido_conta_azul_id` = p.`id`
SET p.`status_conciliacao` = 'CONCILIADA';

DROP TEMPORARY TABLE `tmp_pedidos_criados_ca_divergentes_por_alias`;
