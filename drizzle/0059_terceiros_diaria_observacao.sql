-- Diária e observação por prestador (terceiros / diaristas)
ALTER TABLE `terceiros_prestadores`
  ADD COLUMN `diariaBase` decimal(10, 2) NULL AFTER `acessoToken`,
  ADD COLUMN `observacao` text NULL AFTER `diariaBase`;

-- Reinaldo Bentes Mendonça: diária R$ 116 (8h); almoço R$ 25 descontado no turno diurno
UPDATE `terceiros_prestadores`
SET
  `diariaBase` = 116.00,
  `observacao` = 'Diária R$ 116 (8h de trabalho). Almoço R$ 25 descontado porque trabalha de dia.'
WHERE `cpf` = '77046609268';
