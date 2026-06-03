-- Dono do projeto: admin operacional só gere os projetos que ele mesmo criou.
-- Projetos existentes ficam com criadoPorId nulo (geridos pela equipe da plataforma).
-- Aplicado também em runtime por ensureProjetosCriadoPorColumn (applyRuntimeSchemaEnsures).

ALTER TABLE `projetos` ADD COLUMN `criadoPorId` int NULL;
