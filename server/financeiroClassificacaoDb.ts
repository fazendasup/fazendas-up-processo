import { and, asc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  financeiroCaAjustesManuais,
  financeiroCaClassificacoes,
  financeiroCaRubricasMeta,
  type FinanceiroCaAjusteManualRow,
  type FinanceiroCaClassificacaoRow,
  type FinanceiroCaRubricaMetaRow,
  type InsertFinanceiroCaAjusteManual,
  type InsertFinanceiroCaClassificacao,
} from "../drizzle/schema";
import { getDb } from "./db";
import type { ComportamentoCusto } from "@shared/financeiroRubricaComportamento";

export async function ensureFinanceiroCaTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`financeiro_ca_classificacoes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`tipo\` enum('parcela','fornecedor') NOT NULL,
  \`chave\` varchar(191) NOT NULL,
  \`rubricaOverride\` varchar(191) NULL,
  \`centroCustoOverride\` varchar(191) NULL,
  \`excluido\` tinyint(1) NOT NULL DEFAULT 0,
  \`nota\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_fin_ca_class_proj_tipo_chave\` (\`projetoId\`,\`tipo\`,\`chave\`),
  KEY \`idx_fin_ca_class_proj\` (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureFinanceiroCaTables classificacoes:", err);
    }
  }
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`financeiro_ca_ajustes_manuais\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`tipo\` enum('pagar','receber') NOT NULL DEFAULT 'pagar',
  \`descricao\` varchar(255) NOT NULL,
  \`contraparte\` varchar(191) NULL,
  \`rubrica\` varchar(191) NOT NULL,
  \`centroCusto\` varchar(191) NULL,
  \`valor\` decimal(14,2) NOT NULL,
  \`dataCompetencia\` varchar(10) NULL,
  \`dataVencimento\` varchar(10) NULL,
  \`nota\` text,
  \`ativo\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_fin_ca_ajuste_proj\` (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureFinanceiroCaTables ajustes:", err);
    }
  }
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`financeiro_ca_rubricas_meta\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`rubrica\` varchar(191) NOT NULL,
  \`comportamentoCusto\` enum('fixo','variavel') NULL,
  \`nota\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_fin_ca_rub_meta_proj_rub\` (\`projetoId\`,\`rubrica\`),
  KEY \`idx_fin_ca_rub_meta_proj\` (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureFinanceiroCaTables rubricas_meta:", err);
    }
  }
}

export async function listFinanceiroCaClassificacoes(
  projetoId: number,
): Promise<FinanceiroCaClassificacaoRow[]> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financeiroCaClassificacoes)
    .where(eq(financeiroCaClassificacoes.projetoId, projetoId))
    .orderBy(asc(financeiroCaClassificacoes.tipo), asc(financeiroCaClassificacoes.chave));
}

export async function upsertFinanceiroCaClassificacao(
  projetoId: number,
  input: {
    tipo: "parcela" | "fornecedor";
    chave: string;
    rubricaOverride?: string | null;
    centroCustoOverride?: string | null;
    excluido?: boolean;
    nota?: string | null;
  },
): Promise<FinanceiroCaClassificacaoRow> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const chave = input.chave.trim();
  if (!chave) throw new Error("Chave obrigatória.");

  const existing = await db
    .select()
    .from(financeiroCaClassificacoes)
    .where(
      and(
        eq(financeiroCaClassificacoes.projetoId, projetoId),
        eq(financeiroCaClassificacoes.tipo, input.tipo),
        eq(financeiroCaClassificacoes.chave, chave),
      ),
    )
    .limit(1);

  const payload: Partial<InsertFinanceiroCaClassificacao> = {
    rubricaOverride: input.rubricaOverride?.trim() || null,
    centroCustoOverride: input.centroCustoOverride?.trim() || null,
    excluido: input.excluido ?? false,
    nota: input.nota?.trim() || null,
  };

  if (existing[0]) {
    await db
      .update(financeiroCaClassificacoes)
      .set(payload)
      .where(eq(financeiroCaClassificacoes.id, existing[0].id));
    const updated = await db
      .select()
      .from(financeiroCaClassificacoes)
      .where(eq(financeiroCaClassificacoes.id, existing[0].id))
      .limit(1);
    return updated[0]!;
  }

  const res = await db.insert(financeiroCaClassificacoes).values({
    projetoId,
    tipo: input.tipo,
    chave,
    ...payload,
    excluido: payload.excluido ?? false,
  });
  const id = Number(res[0].insertId);
  const row = await db
    .select()
    .from(financeiroCaClassificacoes)
    .where(eq(financeiroCaClassificacoes.id, id))
    .limit(1);
  return row[0]!;
}

export async function deleteFinanceiroCaClassificacao(
  projetoId: number,
  id: number,
): Promise<void> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(financeiroCaClassificacoes)
    .where(
      and(
        eq(financeiroCaClassificacoes.projetoId, projetoId),
        eq(financeiroCaClassificacoes.id, id),
      ),
    );
}

export async function listFinanceiroCaAjustesManuais(
  projetoId: number,
): Promise<FinanceiroCaAjusteManualRow[]> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financeiroCaAjustesManuais)
    .where(
      and(
        eq(financeiroCaAjustesManuais.projetoId, projetoId),
        eq(financeiroCaAjustesManuais.ativo, true),
      ),
    )
    .orderBy(asc(financeiroCaAjustesManuais.id));
}

export async function insertFinanceiroCaAjusteManual(
  projetoId: number,
  input: Omit<InsertFinanceiroCaAjusteManual, "id" | "projetoId" | "createdAt" | "updatedAt" | "ativo"> & {
    ativo?: boolean;
  },
): Promise<FinanceiroCaAjusteManualRow> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(financeiroCaAjustesManuais).values({
    projetoId,
    tipo: input.tipo ?? "pagar",
    descricao: input.descricao.trim(),
    contraparte: input.contraparte?.trim() || null,
    rubrica: input.rubrica.trim(),
    centroCusto: input.centroCusto?.trim() || null,
    valor: String(input.valor),
    dataCompetencia: input.dataCompetencia || null,
    dataVencimento: input.dataVencimento || null,
    nota: input.nota?.trim() || null,
    ativo: input.ativo ?? true,
  });
  const id = Number(res[0].insertId);
  const row = await db
    .select()
    .from(financeiroCaAjustesManuais)
    .where(eq(financeiroCaAjustesManuais.id, id))
    .limit(1);
  return row[0]!;
}

export async function updateFinanceiroCaAjusteManual(
  projetoId: number,
  id: number,
  data: Partial<InsertFinanceiroCaAjusteManual>,
): Promise<void> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const patch: Partial<InsertFinanceiroCaAjusteManual> = { ...data };
  if (patch.valor != null) patch.valor = String(patch.valor);
  await db
    .update(financeiroCaAjustesManuais)
    .set(patch)
    .where(
      and(
        eq(financeiroCaAjustesManuais.projetoId, projetoId),
        eq(financeiroCaAjustesManuais.id, id),
      ),
    );
}

export async function softDeleteFinanceiroCaAjusteManual(
  projetoId: number,
  id: number,
): Promise<void> {
  await updateFinanceiroCaAjusteManual(projetoId, id, { ativo: false });
}

export async function listFinanceiroCaRubricasMeta(
  projetoId: number,
): Promise<FinanceiroCaRubricaMetaRow[]> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(financeiroCaRubricasMeta)
    .where(eq(financeiroCaRubricasMeta.projetoId, projetoId))
    .orderBy(asc(financeiroCaRubricasMeta.rubrica));
}

export async function upsertFinanceiroCaRubricaMeta(
  projetoId: number,
  input: {
    rubrica: string;
    comportamentoCusto?: ComportamentoCusto | null;
    nota?: string | null;
  },
): Promise<FinanceiroCaRubricaMetaRow> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rubrica = input.rubrica.trim();
  if (!rubrica) throw new Error("Rúbrica obrigatória.");

  const existing = await db
    .select()
    .from(financeiroCaRubricasMeta)
    .where(
      and(
        eq(financeiroCaRubricasMeta.projetoId, projetoId),
        eq(financeiroCaRubricasMeta.rubrica, rubrica),
      ),
    )
    .limit(1);

  const comportamento =
    input.comportamentoCusto === undefined
      ? existing[0]?.comportamentoCusto ?? null
      : input.comportamentoCusto;

  if (existing[0]) {
    await db
      .update(financeiroCaRubricasMeta)
      .set({
        comportamentoCusto: comportamento,
        nota:
          input.nota === undefined ? existing[0].nota : input.nota,
      })
      .where(eq(financeiroCaRubricasMeta.id, existing[0].id));
    const row = await db
      .select()
      .from(financeiroCaRubricasMeta)
      .where(eq(financeiroCaRubricasMeta.id, existing[0].id))
      .limit(1);
    return row[0]!;
  }

  await db.insert(financeiroCaRubricasMeta).values({
    projetoId,
    rubrica,
    comportamentoCusto: comportamento,
    nota: input.nota ?? null,
  });
  const row = await db
    .select()
    .from(financeiroCaRubricasMeta)
    .where(
      and(
        eq(financeiroCaRubricasMeta.projetoId, projetoId),
        eq(financeiroCaRubricasMeta.rubrica, rubrica),
      ),
    )
    .limit(1);
  return row[0]!;
}

export async function deleteFinanceiroCaRubricaMeta(
  projetoId: number,
  rubrica: string,
): Promise<void> {
  await ensureFinanceiroCaTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(financeiroCaRubricasMeta)
    .where(
      and(
        eq(financeiroCaRubricasMeta.projetoId, projetoId),
        eq(financeiroCaRubricasMeta.rubrica, rubrica.trim()),
      ),
    );
}
