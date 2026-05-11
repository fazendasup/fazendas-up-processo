-- DDL real está em `ensurePlanosPlantioGerminacaoColumns()` no arranque (`server/db.ts`).
-- Bases que já correram ensure antes da migração Drizzle falhavam com ER_DUP_FIELDNAME ao repetir ALTER.
-- Esta entrada mantém o histórico journal alinhado; colunas são garantidas pelo servidor.

SELECT 1;
