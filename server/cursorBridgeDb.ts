import { and, desc, eq, sql } from "drizzle-orm";
import {
  solicitacoesAlteracaoSistema,
  type InsertSolicitacaoAlteracaoSistema,
  type SolicitacaoAlteracaoSistema,
} from "../drizzle/schema";
import { getDb } from "./db";

export async function ensureSolicitacoesAlteracaoSistemaTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`solicitacoes_alteracao_sistema\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`solicitadoPorId\` int NOT NULL,
  \`solicitadoPorNome\` varchar(255) NULL,
  \`pedido\` text NOT NULL,
  \`contextoConversacao\` text NULL,
  \`status\` varchar(32) NOT NULL DEFAULT 'pendente',
  \`resultado\` text NULL,
  \`erro\` text NULL,
  \`commitSha\` varchar(64) NULL,
  \`claimedAt\` timestamp NULL,
  \`concluidoAt\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_solicitacoes_alt_status\` (\`status\`),
  KEY \`idx_solicitacoes_alt_projeto\` (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    console.error("[Database] ensureSolicitacoesAlteracaoSistemaTable:", err);
  }
}

export async function createSolicitacaoAlteracaoSistema(
  data: InsertSolicitacaoAlteracaoSistema,
): Promise<SolicitacaoAlteracaoSistema> {
  await ensureSolicitacoesAlteracaoSistemaTable();
  const db = await getDb();
  if (!db) throw new Error("Base de dados indisponível");
  const result = await db.insert(solicitacoesAlteracaoSistema).values({
    ...data,
    status: data.status ?? "pendente",
  });
  const id = Number(result[0].insertId);
  const [row] = await db
    .select()
    .from(solicitacoesAlteracaoSistema)
    .where(eq(solicitacoesAlteracaoSistema.id, id))
    .limit(1);
  if (!row) throw new Error("Falha ao criar solicitação de alteração");
  return row;
}

export async function listSolicitacoesAlteracaoSistema(opts?: {
  status?: string;
  projetoId?: number;
  limit?: number;
}): Promise<SolicitacaoAlteracaoSistema[]> {
  await ensureSolicitacoesAlteracaoSistemaTable();
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 50);
  const filters = [];
  if (opts?.status) filters.push(eq(solicitacoesAlteracaoSistema.status, opts.status));
  if (opts?.projetoId != null) filters.push(eq(solicitacoesAlteracaoSistema.projetoId, opts.projetoId));
  const where = filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);
  const q = db.select().from(solicitacoesAlteracaoSistema).orderBy(desc(solicitacoesAlteracaoSistema.id)).limit(limit);
  return where ? q.where(where) : q;
}

export async function getSolicitacaoAlteracaoSistema(
  id: number,
): Promise<SolicitacaoAlteracaoSistema | null> {
  await ensureSolicitacoesAlteracaoSistemaTable();
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(solicitacoesAlteracaoSistema)
    .where(eq(solicitacoesAlteracaoSistema.id, id))
    .limit(1);
  return row ?? null;
}

export async function claimSolicitacaoAlteracaoSistema(
  id: number,
): Promise<{ row: SolicitacaoAlteracaoSistema; claimed: boolean } | null> {
  await ensureSolicitacoesAlteracaoSistemaTable();
  const db = await getDb();
  if (!db) return null;
  const current = await getSolicitacaoAlteracaoSistema(id);
  if (!current) return null;
  if (current.status !== "pendente") {
    return { row: current, claimed: false };
  }
  await db
    .update(solicitacoesAlteracaoSistema)
    .set({ status: "em_execucao", claimedAt: new Date() })
    .where(and(eq(solicitacoesAlteracaoSistema.id, id), eq(solicitacoesAlteracaoSistema.status, "pendente")));
  const row = await getSolicitacaoAlteracaoSistema(id);
  if (!row) return null;
  return { row, claimed: row.status === "em_execucao" };
}

export async function concluirSolicitacaoAlteracaoSistema(
  id: number,
  data: { resultado: string; commitSha?: string | null },
): Promise<SolicitacaoAlteracaoSistema | null> {
  await ensureSolicitacoesAlteracaoSistemaTable();
  const db = await getDb();
  if (!db) return null;
  await db
    .update(solicitacoesAlteracaoSistema)
    .set({
      status: "concluida",
      resultado: data.resultado,
      commitSha: data.commitSha ?? null,
      erro: null,
      concluidoAt: new Date(),
    })
    .where(eq(solicitacoesAlteracaoSistema.id, id));
  return getSolicitacaoAlteracaoSistema(id);
}

export async function falharSolicitacaoAlteracaoSistema(
  id: number,
  erro: string,
): Promise<SolicitacaoAlteracaoSistema | null> {
  await ensureSolicitacoesAlteracaoSistemaTable();
  const db = await getDb();
  if (!db) return null;
  await db
    .update(solicitacoesAlteracaoSistema)
    .set({
      status: "falhou",
      erro,
      concluidoAt: new Date(),
    })
    .where(eq(solicitacoesAlteracaoSistema.id, id));
  return getSolicitacaoAlteracaoSistema(id);
}
