ALTER TABLE `regras_comerciais_cliente`
  ADD COLUMN `tipo_venda_padrao` ENUM('RECORRENTE_SEMANAL', 'RECORRENTE_QUINZENAL', 'PLANO', 'AVULSO') NULL;
