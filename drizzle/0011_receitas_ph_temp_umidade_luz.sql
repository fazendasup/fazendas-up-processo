-- DDL e backfill estão em `ensureReceitasCrescimentoNovasColunas()` (`server/db.ts`, arranque).
-- Bases onde ensure já correu antes desta migração Drizzle falhavam com ER_DUP_FIELDNAME em `ph`.
-- Esta entrada só alinha o journal; o servidor garante colunas e dados legados.

SELECT 1;
