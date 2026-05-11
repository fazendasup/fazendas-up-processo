-- Conversão g/ml → kg/L idempotente em `ensureEstoqueUnidadesKgLFromLegacyGramMl()` (`server/db.ts`).
-- Correr UPDATE aqui duplicaria divisão por 1000 se alguém reaplicasse o script manualmente.

SELECT 1;
