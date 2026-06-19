import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  custosRentabilidadeLinhas,
  custosRentabilidadePeriodos,
  type CustoRentabilidadeLinhaRow,
  type CustoRentabilidadePeriodoRow,
  type InsertCustoRentabilidadeLinha,
  type InsertCustoRentabilidadePeriodo,
} from "../drizzle/schema";
import { getDb } from "./db";

export async function ensureCustosRentabilidadeTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS \`custos_rentabilidade_periodos\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`titulo\` varchar(160) NOT NULL,
  \`inicio\` date NOT NULL,
  \`fim\` date NOT NULL,
  \`custoOperacionalTotal\` decimal(14,2) NULL,
  \`usarCustoSugerido\` tinyint(1) NOT NULL DEFAULT 1,
  \`observacoes\` text NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`custos_rentabilidade_periodos_id\` PRIMARY KEY(\`id\`),
  KEY \`idx_rentab_periodo_proj\` (\`projetoId\`),
  KEY \`idx_rentab_periodo_datas\` (\`projetoId\`, \`inicio\`, \`fim\`)
)`,
    `CREATE TABLE IF NOT EXISTS \`custos_rentabilidade_linhas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`periodoId\` int NOT NULL,
  \`fichaId\` int NULL,
  \`nomeProduto\` varchar(200) NOT NULL,
  \`quantidade\` decimal(20,6) NOT NULL DEFAULT 0,
  \`receitaTotal\` decimal(14,2) NOT NULL DEFAULT 0,
  \`custoUnitarioManual\` decimal(18,8) NULL,
  \`observacoes\` text NULL,
  \`ordem\` int NOT NULL DEFAULT 0,
  CONSTRAINT \`custos_rentabilidade_linhas_id\` PRIMARY KEY(\`id\`),
  KEY \`idx_rentab_linha_periodo\` (\`periodoId\`)
)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already exists/i.test(msg) && !/ER_TABLE_EXISTS_ERROR/i.test(msg)) {
        console.warn("[custosRentabilidadeDb] ensure:", msg.slice(0, 160));
      }
    }
  }
}

export async function listRentabilidadePeriodos(
  projetoId: number,
): Promise<CustoRentabilidadePeriodoRow[]> {
  await ensureCustosRentabilidadeTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(custosRentabilidadePeriodos)
    .where(eq(custosRentabilidadePeriodos.projetoId, projetoId))
    .orderBy(desc(custosRentabilidadePeriodos.inicio), desc(custosRentabilidadePeriodos.id));
}

export async function getRentabilidadePeriodo(
  projetoId: number,
  id: number,
): Promise<CustoRentabilidadePeriodoRow | undefined> {
  await ensureCustosRentabilidadeTables();
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(custosRentabilidadePeriodos)
    .where(
      and(eq(custosRentabilidadePeriodos.projetoId, projetoId), eq(custosRentabilidadePeriodos.id, id)),
    )
    .limit(1);
  return rows[0];
}

export async function listRentabilidadeLinhas(periodoId: number): Promise<CustoRentabilidadeLinhaRow[]> {
  await ensureCustosRentabilidadeTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(custosRentabilidadeLinhas)
    .where(eq(custosRentabilidadeLinhas.periodoId, periodoId))
    .orderBy(asc(custosRentabilidadeLinhas.ordem), asc(custosRentabilidadeLinhas.id));
}

export async function insertRentabilidadePeriodo(
  data: InsertCustoRentabilidadePeriodo,
): Promise<number> {
  await ensureCustosRentabilidadeTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(custosRentabilidadePeriodos).values(data);
  return Number(res[0].insertId);
}

export async function updateRentabilidadePeriodo(
  projetoId: number,
  id: number,
  data: Partial<InsertCustoRentabilidadePeriodo>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(custosRentabilidadePeriodos)
    .set(data)
    .where(
      and(eq(custosRentabilidadePeriodos.projetoId, projetoId), eq(custosRentabilidadePeriodos.id, id)),
    );
}

export async function deleteRentabilidadePeriodo(projetoId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(custosRentabilidadeLinhas).where(eq(custosRentabilidadeLinhas.periodoId, id));
  await db
    .delete(custosRentabilidadePeriodos)
    .where(
      and(eq(custosRentabilidadePeriodos.projetoId, projetoId), eq(custosRentabilidadePeriodos.id, id)),
    );
}

export async function replaceRentabilidadeLinhas(
  periodoId: number,
  linhas: Omit<InsertCustoRentabilidadeLinha, "periodoId">[],
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(custosRentabilidadeLinhas).where(eq(custosRentabilidadeLinhas.periodoId, periodoId));
  if (linhas.length === 0) return;
  await db.insert(custosRentabilidadeLinhas).values(linhas.map((l) => ({ ...l, periodoId })));
}
