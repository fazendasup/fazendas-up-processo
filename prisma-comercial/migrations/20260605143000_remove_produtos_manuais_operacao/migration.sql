-- Produtos operacionais devem vir exclusivamente do Conta Azul.
-- Remove produtos manuais sem dependências e oculta os que precisam permanecer por histórico.

UPDATE `produtos_comerciais`
SET
  `mix_produto_referencia_id` = NULL
WHERE `mix_produto_referencia_id` IN (
  SELECT `id` FROM (
    SELECT `id`
    FROM `produtos_comerciais`
    WHERE `conta_azul_produto_id` IS NULL
  ) AS produtos_manuais
);

DELETE FROM `precos_especiais_cliente`
WHERE `produto_id` IN (
  SELECT `id` FROM (
    SELECT `id`
    FROM `produtos_comerciais`
    WHERE `conta_azul_produto_id` IS NULL
  ) AS produtos_manuais
);

DELETE FROM `produtos_comerciais`
WHERE `conta_azul_produto_id` IS NULL
  AND `id` NOT IN (
    SELECT `produto_id` FROM (
      SELECT DISTINCT `produto_id`
      FROM `pedidos_operacionais_itens`
    ) AS produtos_com_pedido
  )
  AND `id` NOT IN (
    SELECT `produto_id` FROM (
      SELECT DISTINCT `produto_id`
      FROM `pedidos_operacionais_avarias`
    ) AS produtos_com_avaria
  );

UPDATE `produtos_comerciais`
SET
  `ativo` = false,
  `importado_operacao` = false,
  `oculto_lista_compra` = true,
  `mix_ativo` = false,
  `mix_folha_leve` = false
WHERE `conta_azul_produto_id` IS NULL;
