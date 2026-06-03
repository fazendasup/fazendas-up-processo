-- Rastreio de autoria de usuários: admin operacional só enxerga/gere usuários que criou.
-- Aplicado também em runtime por ensureUsersCriadoPorColumn (applyRuntimeSchemaEnsures).

ALTER TABLE `users` ADD COLUMN `criadoPorId` int NULL;
