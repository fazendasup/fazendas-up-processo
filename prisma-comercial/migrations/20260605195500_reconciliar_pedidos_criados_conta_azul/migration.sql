-- Pedidos operacionais criados diretamente a partir do Conta Azul são uma cópia
-- operacional da própria venda. Eles não devem permanecer como divergentes por
-- data/valor calculados em regras antigas.

UPDATE `pedidos_operacionais` po
JOIN `pedidos` p
  ON p.`id` = po.`pedido_conta_azul_id`
SET
  po.`data_entrega` = p.`data_pedido`,
  po.`dia_semana` = DAYOFWEEK(p.`data_pedido`) - 1,
  po.`status_conciliacao` = 'CONCILIADO',
  p.`status_conciliacao` = 'CONCILIADA'
WHERE po.`pedido_conta_azul_id` IS NOT NULL
  AND JSON_CONTAINS(po.`snapshot_conciliacao`, 'null', '$.operacional') = 1
  AND po.`status_conciliacao` = 'DIVERGENTE';
