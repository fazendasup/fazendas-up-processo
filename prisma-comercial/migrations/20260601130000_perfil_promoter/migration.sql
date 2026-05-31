-- Perfil específico para promoters de campo.
-- VENDEDOR permanece no enum para compatibilidade com usuários existentes.
ALTER TABLE `usuarios`
  MODIFY `perfil` ENUM('VENDEDOR','PROMOTER','GERENTE_COMERCIAL','COMERCIAL','OPERACOES','ADMIN') NOT NULL;
