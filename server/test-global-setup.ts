import { applyRuntimeSchemaEnsures } from "./ensure-runtime-schema";
import { closeDb } from "./db";

/**
 * Setup global do Vitest: garante que o banco de testes tenha o schema evolutivo completo
 * (mesmos `ensure*` do arranque do servidor). No CI, roda depois do `drizzle-kit migrate`
 * (baseline) e adiciona as colunas/tabelas que só existem via runtime ensures.
 * Retorna o teardown que fecha a conexão (para o processo de testes encerrar limpo).
 */
export default async function setup(): Promise<() => Promise<void>> {
  if (!process.env.DATABASE_URL) {
    console.warn("[test-setup] DATABASE_URL ausente — ensures de schema ignorados.");
    return async () => {};
  }
  try {
    await applyRuntimeSchemaEnsures();
  } catch (e) {
    console.error("[test-setup] Falha ao aplicar ensures de schema:", e);
    throw e;
  }
  return async () => {
    await closeDb();
  };
}
