-- Schema multi-projeto consolidado em runtime por `ensureIncompleteMultiProjetoSchema` /
-- `server/ensure-multi-projeto-schema.ts` (idempotente).
-- A migração SQL original fazia DROP INDEX fixos (`variedades_slug_unique`, etc.); bases já
-- parcialmente migradas falhavam com ER_CANT_DROP_FIELD_OR_KEY (1091).

SELECT 1;
