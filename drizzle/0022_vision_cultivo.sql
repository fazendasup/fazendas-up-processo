-- Visão computacional — análises de imagens do cultivo + amostras para treino supervisionado

CREATE TABLE IF NOT EXISTS vision_cultivo_analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projetoId INT NOT NULL,
  createdByUserId INT NOT NULL,
  torreSlug VARCHAR(64) NULL,
  variedadeNome VARCHAR(256) NULL,
  contextoNotas VARCHAR(512) NULL,
  mimeType VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
  imageSha256 CHAR(64) NOT NULL,
  resultadoJson JSON NOT NULL,
  modeloVersao VARCHAR(32) NOT NULL DEFAULT 'stub-v1',
  storageKey VARCHAR(512) NULL,
  imagemArmazenada LONGTEXT NULL COMMENT 'Opcional: base64 miniatura ou dados quando não há object storage',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_vc_projeto_created (projetoId, createdAt DESC),
  INDEX idx_vc_sha (projetoId, imageSha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vision_training_samples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projetoId INT NOT NULL,
  analysisId INT NULL COMMENT 'Opcional — vínculo com análise anterior',
  createdByUserId INT NOT NULL,
  rotuloPrincipal VARCHAR(64) NOT NULL COMMENT 'Ex.: saude_ok, praga, doenca_foliar, deficiencia_nutricional, atraso_fenologico, estresse_hidrico',
  rotulosExtras JSON NULL,
  splitTreino ENUM('treino', 'validacao', 'teste') NOT NULL DEFAULT 'treino',
  imagemSha256 CHAR(64) NOT NULL,
  imagemBase64 LONGTEXT NOT NULL COMMENT 'Imagem para pipeline de treino (limitar tamanho na API)',
  mimeType VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
  confirmadoPorAdmin TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_vts_projeto (projetoId, splitTreino),
  INDEX idx_vts_rotulo (projetoId, rotuloPrincipal),
  CONSTRAINT fk_vts_analysis FOREIGN KEY (analysisId) REFERENCES vision_cultivo_analyses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
