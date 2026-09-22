import { and, eq, gte, lte, sql } from "drizzle-orm";
import {
  compraNf,
  compraNfItens,
  type CompraNfFonte,
  type InsertCompraNf,
  type InsertCompraNfItem,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  type CompraNfFonte as CompraNfFonteShared,
  type CompraNfItemRow,
  type CompraNfParsed,
} from "../shared/compraNf";

export async function ensureCompraNfTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`compra_nf\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`chaveAcesso\` varchar(44) NULL,
  \`numero\` varchar(32) NULL,
  \`serie\` varchar(8) NULL,
  \`dataEmissao\` varchar(10) NOT NULL,
  \`fornecedorNome\` varchar(255) NOT NULL,
  \`fornecedorCnpj\` varchar(18) NULL,
  \`fornecedorIdCa\` varchar(64) NULL,
  \`valorTotal\` decimal(14,2) NOT NULL DEFAULT 0,
  \`externalIdCa\` varchar(64) NULL,
  \`fonte\` enum('xml','conta_azul','manual') NOT NULL DEFAULT 'xml',
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_compra_nf_proj_chave\` (\`projetoId\`, \`chaveAcesso\`),
  UNIQUE KEY \`uq_compra_nf_proj_ca\` (\`projetoId\`, \`externalIdCa\`),
  KEY \`idx_compra_nf_proj_data\` (\`projetoId\`, \`dataEmissao\`),
  KEY \`idx_compra_nf_proj_forn\` (\`projetoId\`, \`fornecedorNome\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureCompraNfTables compra_nf:", err);
    }
  }
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`compra_nf_itens\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`compraNfId\` int NOT NULL,
  \`projetoId\` int NOT NULL,
  \`nItem\` int NULL,
  \`codigo\` varchar(64) NULL,
  \`descricao\` varchar(512) NOT NULL,
  \`quantidade\` decimal(14,4) NOT NULL DEFAULT 0,
  \`unidade\` varchar(16) NULL,
  \`valorUnitario\` decimal(14,4) NULL,
  \`valorTotal\` decimal(14,2) NOT NULL DEFAULT 0,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_compra_nf_itens_nf\` (\`compraNfId\`),
  KEY \`idx_compra_nf_itens_proj_desc\` (\`projetoId\`, \`descricao\`(191)),
  CONSTRAINT \`fk_compra_nf_itens_nf\`
    FOREIGN KEY (\`compraNfId\`) REFERENCES \`compra_nf\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureCompraNfTables compra_nf_itens:", err);
    }
  }
}

function toFonte(f: CompraNfFonteShared): CompraNfFonte {
  return f;
}

export async function upsertCompraNfComItens(input: {
  projetoId: number;
  parsed: CompraNfParsed;
  fonte: CompraNfFonteShared;
  externalIdCa?: string | null;
  fornecedorIdCa?: string | null;
}): Promise<{ id: number; created: boolean }> {
  await ensureCompraNfTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { projetoId, parsed, fonte, externalIdCa, fornecedorIdCa } = input;

  let existingId: number | null = null;
  if (parsed.chaveAcesso) {
    const rows = await db
      .select({ id: compraNf.id })
      .from(compraNf)
      .where(
        and(
          eq(compraNf.projetoId, projetoId),
          eq(compraNf.chaveAcesso, parsed.chaveAcesso),
        ),
      )
      .limit(1);
    existingId = rows[0]?.id ?? null;
  } else if (externalIdCa) {
    const rows = await db
      .select({ id: compraNf.id })
      .from(compraNf)
      .where(
        and(
          eq(compraNf.projetoId, projetoId),
          eq(compraNf.externalIdCa, externalIdCa),
        ),
      )
      .limit(1);
    existingId = rows[0]?.id ?? null;
  }

  const header: InsertCompraNf = {
    projetoId,
    chaveAcesso: parsed.chaveAcesso,
    numero: parsed.numero,
    serie: parsed.serie,
    dataEmissao: parsed.dataEmissao,
    fornecedorNome: parsed.fornecedorNome.slice(0, 255),
    fornecedorCnpj: parsed.fornecedorCnpj?.slice(0, 18) ?? null,
    fornecedorIdCa: fornecedorIdCa ?? null,
    valorTotal: String(parsed.valorTotal),
    externalIdCa: externalIdCa ?? null,
    fonte: toFonte(fonte),
  };

  let id: number;
  let created = false;
  if (existingId != null) {
    id = existingId;
    await db
      .update(compraNf)
      .set({
        ...header,
        updatedAt: new Date(),
      })
      .where(eq(compraNf.id, id));
    await db.delete(compraNfItens).where(eq(compraNfItens.compraNfId, id));
  } else {
    const [ins] = await db.insert(compraNf).values(header);
    id = Number(ins.insertId ?? 0);
    if (!id) {
      const again = await db
        .select({ id: compraNf.id })
        .from(compraNf)
        .where(
          and(
            eq(compraNf.projetoId, projetoId),
            parsed.chaveAcesso
              ? eq(compraNf.chaveAcesso, parsed.chaveAcesso)
              : externalIdCa
                ? eq(compraNf.externalIdCa, externalIdCa)
                : eq(compraNf.numero, parsed.numero ?? ""),
          ),
        )
        .limit(1);
      id = again[0]?.id ?? 0;
    }
    if (!id) throw new Error("Falha ao gravar compra NF.");
    created = true;
  }

  const itemRows: InsertCompraNfItem[] = parsed.itens.map(i => ({
    compraNfId: id,
    projetoId,
    nItem: i.nItem,
    codigo: i.codigo?.slice(0, 64) ?? null,
    descricao: i.descricao.slice(0, 512),
    quantidade: String(i.quantidade),
    unidade: i.unidade?.slice(0, 16) ?? null,
    valorUnitario:
      i.valorUnitario != null ? String(i.valorUnitario) : null,
    valorTotal: String(i.valorTotal),
  }));
  if (itemRows.length) {
    await db.insert(compraNfItens).values(itemRows);
  }

  return { id, created };
}

export async function listCompraNfItensPeriodo(input: {
  projetoId: number;
  inicioIso: string;
  fimIso: string;
}): Promise<CompraNfItemRow[]> {
  await ensureCompraNfTables();
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: compraNfItens.id,
      compraNfId: compraNfItens.compraNfId,
      descricao: compraNfItens.descricao,
      quantidade: compraNfItens.quantidade,
      unidade: compraNfItens.unidade,
      valorTotal: compraNfItens.valorTotal,
      dataEmissao: compraNf.dataEmissao,
      fornecedorNome: compraNf.fornecedorNome,
      numero: compraNf.numero,
      chaveAcesso: compraNf.chaveAcesso,
      fonte: compraNf.fonte,
    })
    .from(compraNfItens)
    .innerJoin(compraNf, eq(compraNfItens.compraNfId, compraNf.id))
    .where(
      and(
        eq(compraNf.projetoId, input.projetoId),
        gte(compraNf.dataEmissao, input.inicioIso),
        lte(compraNf.dataEmissao, input.fimIso),
      ),
    );

  return rows.map(r => ({
    id: r.id,
    compraNfId: r.compraNfId,
    descricao: r.descricao,
    quantidade: Number(r.quantidade) || 0,
    unidade: r.unidade,
    valorTotal: Number(r.valorTotal) || 0,
    dataEmissao: r.dataEmissao,
    fornecedorNome: r.fornecedorNome,
    numero: r.numero,
    chaveAcesso: r.chaveAcesso,
    fonte: r.fonte as CompraNfFonteShared,
  }));
}

export async function countCompraNf(projetoId: number): Promise<number> {
  await ensureCompraNfTables();
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(compraNf)
    .where(eq(compraNf.projetoId, projetoId));
  return Number(rows[0]?.n ?? 0);
}
