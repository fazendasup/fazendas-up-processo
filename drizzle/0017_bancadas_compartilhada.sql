-- Bancada compartilhada: uma linha/lógica para várias caixas (nutriente compartilhado)
ALTER TABLE `bancadas` ADD COLUMN `compartilhada` tinyint(1) NOT NULL DEFAULT 0;
