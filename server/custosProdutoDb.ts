import { and, asc, eq, inArray } from "drizzle-orm";
import {
  custosProdutosComponentes,
  custosProdutosEtapas,
  custosProdutosFichas,
  type CustoProdutoComponenteRow,
  type CustoProdutoEtapaRow,
  type CustoProdutoFichaRow,
  type InsertCustoProdutoComponente,
  type InsertCustoProdutoEtapa,
  type InsertCustoProdutoFicha,
} from "../drizzle/schema";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

function isMysqlDuplicateColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Duplicate column name/i.test(msg);
}

export async function ensureCustosProdutosTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS \`custos_produtos_fichas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`tipo\` enum('producao_propria','revenda_processada','mix','manual') NOT NULL DEFAULT 'manual',
  \`categoria\` varchar(32) NOT NULL DEFAULT 'outros',
  \`nome\` varchar(200) NOT NULL,
  \`produtoComercialId\` varchar(64) NULL,
  \`unidadeVenda\` varchar(32) NOT NULL DEFAULT 'unidade',
  \`precoVendaReferencia\` decimal(14,2) NULL,
  \`precoCompraKg\` decimal(18,8) NULL,
  \`kgBrutoPorUnidade\` decimal(20,10) NULL,
  \`perdaLavagemPct\` decimal(8,4) NULL,
  \`perdaDescasquePct\` decimal(8,4) NULL,
  \`perdaSelecaoPct\` decimal(8,4) NULL,
  \`variedadeId\` int NULL,
  \`kgColhidoPorPlanta\` decimal(20,10) NULL,
  \`kgProducaoPorUnidade\` decimal(20,10) NULL,
  \`observacoes\` text NULL,
  \`ordem\` int NOT NULL DEFAULT 0,
  \`ativo\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`custos_produtos_fichas_id\` PRIMARY KEY(\`id\`),
  KEY \`idx_custos_prod_fichas_proj\` (\`projetoId\`)
)`,
    `CREATE TABLE IF NOT EXISTS \`custos_produtos_componentes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`fichaId\` int NOT NULL,
  \`tipo\` enum('variedade','estoque','produto_comercial','manual','ficha') NOT NULL DEFAULT 'manual',
  \`variedadeId\` int NULL,
  \`estoqueItemId\` int NULL,
  \`produtoComercialId\` varchar(64) NULL,
  \`componenteFichaId\` int NULL,
  \`nomeManual\` varchar(200) NULL,
  \`quantidadePorUnidade\` decimal(20,10) NOT NULL,
  \`unidadeComponente\` varchar(32) NOT NULL DEFAULT 'kg',
  \`custoUnitarioManual\` decimal(18,8) NULL,
  \`ordem\` int NOT NULL DEFAULT 0,
  CONSTRAINT \`custos_produtos_componentes_id\` PRIMARY KEY(\`id\`),
  KEY \`idx_custos_prod_comp_ficha\` (\`fichaId\`)
)`,
    `CREATE TABLE IF NOT EXISTS \`custos_produtos_etapas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`fichaId\` int NOT NULL,
  \`tipo\` enum('lavagem','descasque_corte','embalagem','adesivo','mao_de_obra','logistica','outros') NOT NULL DEFAULT 'outros',
  \`nome\` varchar(160) NOT NULL,
  \`custoPorUnidade\` decimal(14,6) NOT NULL DEFAULT 0,
  \`custoPorKgProcessado\` decimal(18,8) NULL,
  \`custoPercentual\` decimal(8,4) NULL,
  \`minutosPorUnidade\` decimal(10,4) NULL,
  \`regimeMo\` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer',
  \`ordem\` int NOT NULL DEFAULT 0,
  CONSTRAINT \`custos_produtos_etapas_id\` PRIMARY KEY(\`id\`),
  KEY \`idx_custos_prod_etapas_ficha\` (\`fichaId\`)
)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already exists/i.test(msg) && !/ER_TABLE_EXISTS_ERROR/i.test(msg)) {
        console.warn("[custosProdutoDb] ensure:", msg.slice(0, 160));
      }
    }
  }
  try {
    await db.execute(
      sql.raw("ALTER TABLE `custos_produtos_etapas` ADD COLUMN `custoPercentual` decimal(8,4) NULL"),
    );
  } catch (err: unknown) {
    if (!isMysqlDuplicateColumnError(err)) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[custosProdutoDb] ensure custoPercentual:", msg.slice(0, 160));
    }
  }
  for (const stmt of [
    "ALTER TABLE `custos_produtos_etapas` ADD COLUMN `minutosPorUnidade` decimal(10,4) NULL",
    "ALTER TABLE `custos_produtos_etapas` ADD COLUMN `regimeMo` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer'",
    "ALTER TABLE `custos_produtos_fichas` ADD COLUMN `custoCompraUn` decimal(14,6) NULL",
    "ALTER TABLE `custos_produtos_fichas` ADD COLUMN `modoCompraMp` enum('kg','unidade') NULL DEFAULT 'kg'",
    "ALTER TABLE `custos_produtos_fichas` ADD COLUMN `unidadesMpPorUnidade` decimal(10,4) NULL",
    "ALTER TABLE `custos_produtos_fichas` ADD COLUMN `kgPorUnidadeCompra` decimal(20,10) NULL",
  ]) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      if (!isMysqlDuplicateColumnError(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[custosProdutoDb] ensure etapa mo:", msg.slice(0, 160));
      }
    }
  }
}

export async function listCustosProdutoFichas(projetoId: number): Promise<CustoProdutoFichaRow[]> {
  await ensureCustosProdutosTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(custosProdutosFichas)
    .where(eq(custosProdutosFichas.projetoId, projetoId))
    .orderBy(asc(custosProdutosFichas.ordem), asc(custosProdutosFichas.nome));
}

export async function getCustoProdutoFichaById(
  projetoId: number,
  id: number,
): Promise<CustoProdutoFichaRow | undefined> {
  await ensureCustosProdutosTables();
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(custosProdutosFichas)
    .where(and(eq(custosProdutosFichas.projetoId, projetoId), eq(custosProdutosFichas.id, id)))
    .limit(1);
  return rows[0];
}

export async function listComponentesByFichaIds(fichaIds: number[]): Promise<CustoProdutoComponenteRow[]> {
  if (fichaIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(custosProdutosComponentes)
    .where(inArray(custosProdutosComponentes.fichaId, fichaIds))
    .orderBy(asc(custosProdutosComponentes.ordem), asc(custosProdutosComponentes.id));
}

export async function listEtapasByFichaIds(fichaIds: number[]): Promise<CustoProdutoEtapaRow[]> {
  if (fichaIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(custosProdutosEtapas)
    .where(inArray(custosProdutosEtapas.fichaId, fichaIds))
    .orderBy(asc(custosProdutosEtapas.ordem), asc(custosProdutosEtapas.id));
}

export async function insertCustoProdutoFicha(data: InsertCustoProdutoFicha): Promise<number> {
  await ensureCustosProdutosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(custosProdutosFichas).values(data);
  return Number(res[0].insertId);
}

export async function updateCustoProdutoFicha(
  projetoId: number,
  id: number,
  data: Partial<InsertCustoProdutoFicha>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(custosProdutosFichas)
    .set(data)
    .where(and(eq(custosProdutosFichas.projetoId, projetoId), eq(custosProdutosFichas.id, id)));
}

export async function deleteCustoProdutoFicha(projetoId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(custosProdutosComponentes).where(eq(custosProdutosComponentes.fichaId, id));
  await db.delete(custosProdutosEtapas).where(eq(custosProdutosEtapas.fichaId, id));
  await db
    .delete(custosProdutosFichas)
    .where(and(eq(custosProdutosFichas.projetoId, projetoId), eq(custosProdutosFichas.id, id)));
}

export async function replaceComponentesEtapas(
  fichaId: number,
  componentes: Omit<InsertCustoProdutoComponente, "fichaId">[],
  etapas: Omit<InsertCustoProdutoEtapa, "fichaId">[],
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(custosProdutosComponentes).where(eq(custosProdutosComponentes.fichaId, fichaId));
  await db.delete(custosProdutosEtapas).where(eq(custosProdutosEtapas.fichaId, fichaId));
  if (componentes.length > 0) {
    await db.insert(custosProdutosComponentes).values(componentes.map((c) => ({ ...c, fichaId })));
  }
  if (etapas.length > 0) {
    await db.insert(custosProdutosEtapas).values(etapas.map((e) => ({ ...e, fichaId })));
  }
}
