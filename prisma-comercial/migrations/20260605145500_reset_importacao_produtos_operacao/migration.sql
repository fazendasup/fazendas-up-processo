-- Reinicia a seleção operacional de produtos.
-- Mesmo produtos já vinculados ao Conta Azul por sync anterior devem voltar para
-- "Disponíveis no Conta Azul" e só entrar na operação após ativação manual.

UPDATE `produtos_comerciais`
SET
  `ativo` = false,
  `importado_operacao` = false,
  `oculto_lista_compra` = true,
  `mix_ativo` = false,
  `mix_folha_leve` = false;
