import { and, asc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { custosMoEquipes, type InsertCustoMoEquipe } from "../drizzle/schema";
import { getDb } from "./db";

function isMysqlDuplicateColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Duplicate column name/i.test(msg);
}

export async function ensureCustosMoEquipesTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql.raw(`
CREATE TABLE IF NOT EXISTS \`custos_mo_equipes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`nome\` varchar(160) NOT NULL,
  \`regime\` enum('clt','pj') NOT NULL,
  \`finalidade\` enum('processamento','overhead') NOT NULL DEFAULT 'processamento',
  \`numPessoas\` int NOT NULL DEFAULT 1,
  \`horasMes\` decimal(10,2) NOT NULL DEFAULT 0,
  \`custoMensalBase\` decimal(14,2) NULL,
  \`encargosPct\` decimal(8,4) NULL,
  \`custoMensalTotal\` decimal(14,2) NULL,
  \`observacoes\` text NULL,
  \`ordem\` int NOT NULL DEFAULT 0,
  \`ativo\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`custos_mo_equipes_id\` PRIMARY KEY(\`id\`),
  KEY \`idx_custos_mo_equipes_proj\` (\`projetoId\`)
)`));
  for (const stmt of [
    "ALTER TABLE `custos_produtos_etapas` ADD COLUMN `minutosPorUnidade` decimal(10,4) NULL",
    "ALTER TABLE `custos_produtos_etapas` ADD COLUMN `regimeMo` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer'",
  ]) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      if (!isMysqlDuplicateColumnError(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[custosMoEquipeDb] ensure column:", msg.slice(0, 160));
      }
    }
  }
}

export async function listMoEquipes(projetoId: number) {
  await ensureCustosMoEquipesTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(custosMoEquipes)
    .where(eq(custosMoEquipes.projetoId, projetoId))
    .orderBy(asc(custosMoEquipes.ordem), asc(custosMoEquipes.nome));
}

export async function insertMoEquipe(data: InsertCustoMoEquipe): Promise<number> {
  await ensureCustosMoEquipesTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(custosMoEquipes).values(data);
  return Number(res[0].insertId);
}

export async function updateMoEquipe(
  projetoId: number,
  id: number,
  data: Partial<InsertCustoMoEquipe>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(custosMoEquipes)
    .set(data)
    .where(and(eq(custosMoEquipes.projetoId, projetoId), eq(custosMoEquipes.id, id)));
}

export async function deleteMoEquipe(projetoId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(custosMoEquipes)
    .where(and(eq(custosMoEquipes.projetoId, projetoId), eq(custosMoEquipes.id, id)));
}
