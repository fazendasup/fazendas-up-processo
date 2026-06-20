import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { CategoriaProdutoCusto, ModoCompraMp } from "@shared/custosProduto";
import {
  type MapeamentoProdutoComercial,
  type PerfilProcessoProduto,
  PERFIS_PROCESSO_PRODUTO,
} from "@shared/custosProdutoProcessoPadrao";
import { custosProdutosComercialMap } from "../drizzle/schema";
import { getDb } from "./db";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function ensureCustosProdutoComercialMapTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`
CREATE TABLE IF NOT EXISTS \`custos_produtos_comercial_map\` (
  \`projetoId\` int NOT NULL,
  \`produtoComercialId\` varchar(64) NOT NULL,
  \`categoriaCusto\` varchar(32) NOT NULL DEFAULT 'outros',
  \`perfilProcesso\` varchar(48) NOT NULL DEFAULT 'colheita_embalagem',
  \`kgPorUnidade\` decimal(20,10) NULL,
  \`modoCompraMp\` enum('kg','unidade') NULL DEFAULT 'kg',
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(\`projetoId\`, \`produtoComercialId\`)
)`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[custosProdutoComercialMapDb] ensure:", msg.slice(0, 160));
  }
  try {
    await db.execute(
      sql.raw(
        "ALTER TABLE `custos_produtos_comercial_map` ADD COLUMN `modoCompraMp` enum('kg','unidade') NULL DEFAULT 'kg'",
      ),
    );
  } catch {
    /* coluna já existe */
  }
}

export async function listComercialMap(projetoId: number): Promise<MapeamentoProdutoComercial[]> {
  await ensureCustosProdutoComercialMapTable();
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(custosProdutosComercialMap)
    .where(eq(custosProdutosComercialMap.projetoId, projetoId));
  return rows.map((r) => ({
    produtoComercialId: r.produtoComercialId,
    categoriaCusto: r.categoriaCusto as CategoriaProdutoCusto,
    perfilProcesso: (PERFIS_PROCESSO_PRODUTO.includes(r.perfilProcesso as PerfilProcessoProduto)
      ? r.perfilProcesso
      : "colheita_embalagem") as PerfilProcessoProduto,
    kgPorUnidade: num(r.kgPorUnidade),
    modoCompraMp: (r.modoCompraMp ?? "kg") as ModoCompraMp,
    processoModeloId: r.processoModeloId ?? null,
  }));
}

export async function upsertComercialMap(
  projetoId: number,
  itens: MapeamentoProdutoComercial[],
): Promise<void> {
  await ensureCustosProdutoComercialMapTable();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const item of itens) {
    await db
      .insert(custosProdutosComercialMap)
      .values({
        projetoId,
        produtoComercialId: item.produtoComercialId,
        categoriaCusto: item.categoriaCusto,
        perfilProcesso: item.perfilProcesso,
        kgPorUnidade: item.kgPorUnidade != null ? String(item.kgPorUnidade) : null,
        modoCompraMp: item.modoCompraMp ?? "kg",
        processoModeloId: item.processoModeloId ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          categoriaCusto: item.categoriaCusto,
          perfilProcesso: item.perfilProcesso,
          kgPorUnidade: item.kgPorUnidade != null ? String(item.kgPorUnidade) : null,
          modoCompraMp: item.modoCompraMp ?? "kg",
          processoModeloId: item.processoModeloId ?? null,
        },
      });
  }
}

export async function getComercialMapByProdutoIds(
  projetoId: number,
  produtoIds: string[],
): Promise<Map<string, MapeamentoProdutoComercial>> {
  if (produtoIds.length === 0) return new Map();
  const all = await listComercialMap(projetoId);
  const set = new Set(produtoIds);
  return new Map(all.filter((m) => set.has(m.produtoComercialId)).map((m) => [m.produtoComercialId, m]));
}

export async function deleteComercialMap(projetoId: number, produtoComercialId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(custosProdutosComercialMap)
    .where(
      and(
        eq(custosProdutosComercialMap.projetoId, projetoId),
        eq(custosProdutosComercialMap.produtoComercialId, produtoComercialId),
      ),
    );
}
