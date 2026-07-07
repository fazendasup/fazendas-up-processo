-- Retenção de auditoria de conciliação: índice por data + purge inicial (>90 dias)

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'pedidos_conciliacao_eventos'
    AND index_name = 'pedidos_conciliacao_eventos_criado_em_idx'
);
SET @sql_idx := IF(
  @idx_exists = 0,
  'CREATE INDEX `pedidos_conciliacao_eventos_criado_em_idx` ON `pedidos_conciliacao_eventos` (`criado_em`)',
  'SELECT 1'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

DELETE FROM `pedidos_conciliacao_eventos`
WHERE `criado_em` < DATE_SUB(NOW(), INTERVAL 90 DAY);
