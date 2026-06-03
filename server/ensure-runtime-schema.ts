import * as db from "./db";

/**
 * Aplica todas as migrações de schema feitas em runtime (colunas/tabelas idempotentes).
 *
 * Fonte única de verdade do schema evolutivo: o `drizzle-kit migrate` aplica só as
 * migrações listadas no `_journal.json` (baseline estável); tudo o que veio depois é
 * garantido por estes `ensure*`. É chamado no arranque do servidor e no setup dos testes
 * (para o banco de CI/local ficar idêntico ao de produção sem depender do boot).
 */
export async function applyRuntimeSchemaEnsures(): Promise<void> {
  await db.ensureUsersRoleVarchar();
  await db.ensureUsersCriadoPorColumn();
  await db.ensureCiclosDosagemColumn();
  await db.ensurePlanosPlantioGerminacaoColumns();
  await db.ensureTransplantiosRastreioColumns();
  await db.ensureManutencoesBancadaColumns();
  await db.ensureRegistrosColheitaBancadaColumns();
  await db.ensureReceitasCrescimentoNovasColunas();
  await db.ensureEstoqueItensTable();
  await db.ensureEstoqueUnidadesKgLFromLegacyGramMl();
  await db.ensureVisionCultivoTables();
  await db.ensureProjetosTables();
  await db.ensureProjetoModulosTable();
  await db.ensureProjetosMicroverdesSupport();
  await db.ensureBancadasSchemaColumns();
  await db.ensurePerfisCultivoStatusColumn();
  await db.ensurePerfisReceitaIdColumn();
  await db.ensurePerfisQuantidadePlantasColumn();
  await db.ensureLotesProducaoSchema();
  await db.ensureVariedadesBabyLeafColumn();
  await db.ensureIncompleteMultiProjetoSchema();
  await db.ensureTorresNumeroEstruturaColumns();
}
