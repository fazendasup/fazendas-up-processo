-- Módulos contratáveis por projeto (SaaS modular)

CREATE TABLE IF NOT EXISTS projeto_modulos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projetoId INT NOT NULL,
  modulo VARCHAR(32) NOT NULL COMMENT 'estoque | automacao | inteligencia | visao_cultivo',
  habilitado TINYINT(1) NOT NULL DEFAULT 0,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY uq_projeto_modulo (projetoId, modulo),
  CONSTRAINT fk_projeto_modulos_projeto FOREIGN KEY (projetoId) REFERENCES projetos(id) ON DELETE CASCADE,
  INDEX idx_projeto_modulos_projeto (projetoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projetos já existentes: todos os módulos ativos (comportamento anterior)
INSERT IGNORE INTO projeto_modulos (projetoId, modulo, habilitado)
SELECT p.id, m.modulo, 1
FROM projetos p
CROSS JOIN (
  SELECT 'estoque' AS modulo
  UNION ALL SELECT 'automacao'
  UNION ALL SELECT 'inteligencia'
  UNION ALL SELECT 'visao_cultivo'
) AS m;
