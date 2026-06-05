-- Pedidos criados diretamente a partir de venda/orçamento Conta Azul não devem
-- acusar divergência por `valor_estimado`: o valor operacional é derivado dos
-- itens, enquanto o Conta Azul pode ter líquido com desconto/frete/arredondamento.

CREATE TEMPORARY TABLE `tmp_divergencias_valor_criadas_ca` AS
SELECT DISTINCT
  po.`id` AS `pedido_operacional_id`,
  po.`pedido_conta_azul_id` AS `pedido_conta_azul_id`
FROM `pedidos_operacionais` po
JOIN `pedidos_conciliacao_eventos` e
  ON e.`pedido_operacional_id` = po.`id`
WHERE po.`pedido_conta_azul_id` IS NOT NULL
  AND po.`status_conciliacao` = 'DIVERGENTE'
  AND JSON_CONTAINS(po.`snapshot_conciliacao`, 'null', '$.operacional') = 1
  AND e.`tipo` = 'VENDA_ALTERADA_CA'
  AND JSON_LENGTH(e.`divergencias`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(e.`divergencias`, '$[0].campo')) = 'valor_estimado';

UPDATE `pedidos_operacionais` po
JOIN `tmp_divergencias_valor_criadas_ca` tmp
  ON tmp.`pedido_operacional_id` = po.`id`
SET po.`status_conciliacao` = 'CONCILIADO';

UPDATE `pedidos` p
JOIN `tmp_divergencias_valor_criadas_ca` tmp
  ON tmp.`pedido_conta_azul_id` = p.`id`
SET p.`status_conciliacao` = 'CONCILIADA';

DELETE e
FROM `pedidos_conciliacao_eventos` e
JOIN `tmp_divergencias_valor_criadas_ca` tmp
  ON tmp.`pedido_operacional_id` = e.`pedido_operacional_id`
WHERE e.`tipo` = 'VENDA_ALTERADA_CA'
  AND JSON_LENGTH(e.`divergencias`) = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(e.`divergencias`, '$[0].campo')) = 'valor_estimado';

DROP TEMPORARY TABLE `tmp_divergencias_valor_criadas_ca`;
