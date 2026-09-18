import { and, asc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  financeiroProjecaoCelulas,
  financeiroProjecaoColunas,
  financeiroProjecaoLinhas,
  financeiroProjecaoRubricasMes,
  type FinanceiroProjecaoCelulaRow,
  type FinanceiroProjecaoColunaRow,
  type FinanceiroProjecaoLinhaRow,
  type FinanceiroProjecaoRubricaMesRow,
} from "../drizzle/schema";
import { getDb } from "./db";

export async function ensureFinanceiroProjecaoTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const stmts = [
    `CREATE TABLE IF NOT EXISTS \`financeiro_projecao_colunas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`mesYm\` varchar(7) NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_fin_proj_col_proj_mes\` (\`projetoId\`,\`mesYm\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`financeiro_projecao_linhas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`descricao\` varchar(255) NOT NULL,
  \`fornecedor\` varchar(191) NULL,
  \`rubrica\` varchar(191) NULL,
  \`natureza\` enum('parcela','recorrente','unico','manual') NOT NULL DEFAULT 'manual',
  \`ativo\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_fin_proj_lin_proj\` (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`financeiro_projecao_celulas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`linhaId\` varchar(191) NOT NULL,
  \`mesYm\` varchar(7) NOT NULL,
  \`valorOverride\` decimal(14,2) NULL,
  \`ativo\` tinyint(1) NULL,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_fin_proj_cel_proj_linha_mes\` (\`projetoId\`,\`linhaId\`,\`mesYm\`),
  KEY \`idx_fin_proj_cel_proj\` (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`financeiro_projecao_rubricas_mes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`mesYm\` varchar(7) NOT NULL,
  \`rubrica\` varchar(191) NOT NULL,
  \`concluida\` tinyint(1) NOT NULL DEFAULT 0,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_fin_proj_rub_proj_mes_rub\` (\`projetoId\`,\`mesYm\`,\`rubrica\`),
  KEY \`idx_fin_proj_rub_proj_mes\` (\`projetoId\`,\`mesYm\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const s of stmts) {
    try {
      await db.execute(sql.raw(s));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
        console.error("[Database] ensureFinanceiroProjecaoTables:", err);
      }
    }
  }
}

export async function listProjecaoColunas(
  projetoId: number,
): Promise<FinanceiroProjecaoColunaRow[]> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financeiroProjecaoColunas)
    .where(eq(financeiroProjecaoColunas.projetoId, projetoId))
    .orderBy(asc(financeiroProjecaoColunas.mesYm));
}

export async function addProjecaoColuna(
  projetoId: number,
  mesYm: string,
): Promise<FinanceiroProjecaoColunaRow> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const ym = mesYm.trim();
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error("Mês inválido (use AAAA-MM).");

  const existing = await db
    .select()
    .from(financeiroProjecaoColunas)
    .where(
      and(
        eq(financeiroProjecaoColunas.projetoId, projetoId),
        eq(financeiroProjecaoColunas.mesYm, ym),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  await db.insert(financeiroProjecaoColunas).values({ projetoId, mesYm: ym });
  const rows = await db
    .select()
    .from(financeiroProjecaoColunas)
    .where(
      and(
        eq(financeiroProjecaoColunas.projetoId, projetoId),
        eq(financeiroProjecaoColunas.mesYm, ym),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("Falha ao criar coluna.");
  return rows[0];
}

export async function removeProjecaoColuna(
  projetoId: number,
  mesYm: string,
): Promise<void> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(financeiroProjecaoColunas)
    .where(
      and(
        eq(financeiroProjecaoColunas.projetoId, projetoId),
        eq(financeiroProjecaoColunas.mesYm, mesYm),
      ),
    );
}

export async function listProjecaoLinhasManuais(
  projetoId: number,
): Promise<FinanceiroProjecaoLinhaRow[]> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financeiroProjecaoLinhas)
    .where(
      and(
        eq(financeiroProjecaoLinhas.projetoId, projetoId),
        eq(financeiroProjecaoLinhas.ativo, true),
      ),
    )
    .orderBy(asc(financeiroProjecaoLinhas.id));
}

export async function insertProjecaoLinhaManual(
  projetoId: number,
  input: {
    descricao: string;
    fornecedor?: string | null;
    rubrica?: string | null;
    natureza?: "parcela" | "recorrente" | "unico" | "manual";
  },
): Promise<FinanceiroProjecaoLinhaRow> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const descricao = input.descricao.trim();
  if (!descricao) throw new Error("Descrição obrigatória.");

  const res = await db.insert(financeiroProjecaoLinhas).values({
    projetoId,
    descricao,
    fornecedor: input.fornecedor?.trim() || null,
    rubrica: input.rubrica?.trim() || null,
    natureza: input.natureza ?? "manual",
    ativo: true,
  });
  const id = Number((res as { insertId?: number }).insertId ?? 0);
  const rows = await db
    .select()
    .from(financeiroProjecaoLinhas)
    .where(eq(financeiroProjecaoLinhas.id, id))
    .limit(1);
  if (!rows[0]) throw new Error("Falha ao criar linha.");
  return rows[0];
}

export async function softDeleteProjecaoLinhaManual(
  projetoId: number,
  id: number,
): Promise<void> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(financeiroProjecaoLinhas)
    .set({ ativo: false })
    .where(
      and(
        eq(financeiroProjecaoLinhas.projetoId, projetoId),
        eq(financeiroProjecaoLinhas.id, id),
      ),
    );
}

export async function listProjecaoCelulaOverrides(
  projetoId: number,
): Promise<FinanceiroProjecaoCelulaRow[]> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financeiroProjecaoCelulas)
    .where(eq(financeiroProjecaoCelulas.projetoId, projetoId));
}

export async function upsertProjecaoCelula(
  projetoId: number,
  input: {
    linhaId: string;
    mesYm: string;
    valorOverride?: number | null;
    ativo?: boolean | null;
  },
): Promise<FinanceiroProjecaoCelulaRow> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const linhaId = input.linhaId.trim();
  const mesYm = input.mesYm.trim();
  if (!linhaId || !/^\d{4}-\d{2}$/.test(mesYm)) {
    throw new Error("Linha/mês inválidos.");
  }

  const existing = await db
    .select()
    .from(financeiroProjecaoCelulas)
    .where(
      and(
        eq(financeiroProjecaoCelulas.projetoId, projetoId),
        eq(financeiroProjecaoCelulas.linhaId, linhaId),
        eq(financeiroProjecaoCelulas.mesYm, mesYm),
      ),
    )
    .limit(1);

  const valorOverride =
    input.valorOverride == null || !Number.isFinite(input.valorOverride)
      ? null
      : String(input.valorOverride);
  const ativo = input.ativo == null ? null : input.ativo;

  if (existing[0]) {
    await db
      .update(financeiroProjecaoCelulas)
      .set({
        valorOverride:
          input.valorOverride === undefined
            ? existing[0].valorOverride
            : valorOverride,
        ativo: input.ativo === undefined ? existing[0].ativo : ativo,
      })
      .where(eq(financeiroProjecaoCelulas.id, existing[0].id));
    const updated = await db
      .select()
      .from(financeiroProjecaoCelulas)
      .where(eq(financeiroProjecaoCelulas.id, existing[0].id))
      .limit(1);
    return updated[0]!;
  }

  await db.insert(financeiroProjecaoCelulas).values({
    projetoId,
    linhaId,
    mesYm,
    valorOverride,
    ativo,
  });
  const rows = await db
    .select()
    .from(financeiroProjecaoCelulas)
    .where(
      and(
        eq(financeiroProjecaoCelulas.projetoId, projetoId),
        eq(financeiroProjecaoCelulas.linhaId, linhaId),
        eq(financeiroProjecaoCelulas.mesYm, mesYm),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("Falha ao salvar célula.");
  return rows[0];
}

/** Rúbricas marcadas como concluídas no mês (saldo liberado se pago a menos). */
export async function listRubricasMesConcluidas(
  projetoId: number,
  mesYm: string,
): Promise<string[]> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(financeiroProjecaoRubricasMes)
    .where(
      and(
        eq(financeiroProjecaoRubricasMes.projetoId, projetoId),
        eq(financeiroProjecaoRubricasMes.mesYm, mesYm),
        eq(financeiroProjecaoRubricasMes.concluida, true),
      ),
    );
  return rows.map(r => r.rubrica);
}

export async function upsertRubricaMesConcluida(
  projetoId: number,
  input: { mesYm: string; rubrica: string; concluida: boolean },
): Promise<FinanceiroProjecaoRubricaMesRow> {
  await ensureFinanceiroProjecaoTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const mesYm = input.mesYm.trim();
  const rubrica = input.rubrica.trim();
  if (!/^\d{4}-\d{2}$/.test(mesYm)) throw new Error("Mês inválido (AAAA-MM).");
  if (!rubrica) throw new Error("Rúbrica obrigatória.");

  const existing = await db
    .select()
    .from(financeiroProjecaoRubricasMes)
    .where(
      and(
        eq(financeiroProjecaoRubricasMes.projetoId, projetoId),
        eq(financeiroProjecaoRubricasMes.mesYm, mesYm),
        eq(financeiroProjecaoRubricasMes.rubrica, rubrica),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(financeiroProjecaoRubricasMes)
      .set({ concluida: input.concluida })
      .where(eq(financeiroProjecaoRubricasMes.id, existing[0].id));
    const updated = await db
      .select()
      .from(financeiroProjecaoRubricasMes)
      .where(eq(financeiroProjecaoRubricasMes.id, existing[0].id))
      .limit(1);
    return updated[0]!;
  }

  await db.insert(financeiroProjecaoRubricasMes).values({
    projetoId,
    mesYm,
    rubrica,
    concluida: input.concluida,
  });
  const rows = await db
    .select()
    .from(financeiroProjecaoRubricasMes)
    .where(
      and(
        eq(financeiroProjecaoRubricasMes.projetoId, projetoId),
        eq(financeiroProjecaoRubricasMes.mesYm, mesYm),
        eq(financeiroProjecaoRubricasMes.rubrica, rubrica),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("Falha ao salvar rúbrica.");
  return rows[0];
}
