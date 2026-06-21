ALTER TABLE `custos_produtos_processo_modelos`
  MODIFY COLUMN `familia` enum('folhosas','legumes','microverdes','flores','outros') NOT NULL DEFAULT 'folhosas';
