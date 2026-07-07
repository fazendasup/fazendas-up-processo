-- Retenção de auditoria de conciliação: índice por data + purge inicial (>90 dias)

CREATE INDEX `pedidos_conciliacao_eventos_criado_em_idx`
  ON `pedidos_conciliacao_eventos` (`criado_em`);

DELETE FROM `pedidos_conciliacao_eventos`
WHERE `criado_em` < DATE_SUB(NOW(), INTERVAL 90 DAY);
