import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  financeiroCaConfig,
  type FinanceiroCaConfigRow,
} from "../drizzle/schema";
import { getDb } from "./db";

export async function ensureFinanceiroCaConfigTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`financeiro_ca_config\` (
  \`projetoId\` int NOT NULL,
  \`contaAzulContaId\` varchar(64) NULL,
  \`bradescoContaId\` varchar(64) NULL,
  \`bradescoSaldoInicial\` decimal(14,2) NULL,
  \`bradescoSaldoInicialData\` varchar(10) NULL,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureFinanceiroCaConfigTable:", err);
    }
  }
}

export async function getFinanceiroCaConfig(
  projetoId: number,
): Promise<FinanceiroCaConfigRow | null> {
  await ensureFinanceiroCaConfigTable();
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(financeiroCaConfig)
    .where(eq(financeiroCaConfig.projetoId, projetoId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertFinanceiroCaConfig(
  projetoId: number,
  input: {
    contaAzulContaId?: string | null;
    bradescoContaId?: string | null;
    bradescoSaldoInicial?: number | null;
    bradescoSaldoInicialData?: string | null;
  },
): Promise<FinanceiroCaConfigRow> {
  await ensureFinanceiroCaConfigTable();
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");

  const existing = await getFinanceiroCaConfig(projetoId);
  const payload = {
    contaAzulContaId:
      input.contaAzulContaId !== undefined
        ? input.contaAzulContaId
        : (existing?.contaAzulContaId ?? null),
    bradescoContaId:
      input.bradescoContaId !== undefined
        ? input.bradescoContaId
        : (existing?.bradescoContaId ?? null),
    bradescoSaldoInicial:
      input.bradescoSaldoInicial !== undefined
        ? input.bradescoSaldoInicial == null
          ? null
          : String(input.bradescoSaldoInicial)
        : (existing?.bradescoSaldoInicial ?? null),
    bradescoSaldoInicialData:
      input.bradescoSaldoInicialData !== undefined
        ? input.bradescoSaldoInicialData
        : (existing?.bradescoSaldoInicialData ?? null),
  };

  if (existing) {
    await db
      .update(financeiroCaConfig)
      .set(payload)
      .where(eq(financeiroCaConfig.projetoId, projetoId));
  } else {
    await db.insert(financeiroCaConfig).values({
      projetoId,
      ...payload,
    });
  }

  const row = await getFinanceiroCaConfig(projetoId);
  if (!row) throw new Error("Falha ao gravar config financeira");
  return row;
}
