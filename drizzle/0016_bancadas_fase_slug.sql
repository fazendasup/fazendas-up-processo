-- DDL consolidado em `ensureBancadasSchemaColumns()` (`server/db.ts`): slug, fase, ativa, índice `bancadas_projeto_slug`.
-- Migração SQL original falhava com ER_DUP_FIELDNAME / ER_DUP_KEYNAME quando `ensure*` já tinha corrido.

SELECT 1;
