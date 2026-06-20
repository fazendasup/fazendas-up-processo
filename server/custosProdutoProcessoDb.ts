import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
  type CustosProdutoProcessoConfig,
} from "@shared/custosProdutoProcessoPadrao";
import type { RegimeMoEtapa } from "@shared/custosMoEquipe";
import { custosProdutosProcessoConfig } from "../drizzle/schema";
import { getDb } from "./db";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function rowToConfig(row: typeof custosProdutosProcessoConfig.$inferSelect): CustosProdutoProcessoConfig {
  return {
    embalagemMicroverdeUn: num(row.embalagemMicroverdeUn) ?? CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO.embalagemMicroverdeUn,
    embalagemOutrosUn: num(row.embalagemOutrosUn) ?? CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO.embalagemOutrosUn,
    lavagemMinutosUn: num(row.lavagemMinutosUn),
    embalagemMinutosUn: num(row.embalagemMinutosUn),
    corteMinutosUn: num(row.corteMinutosUn),
    adesivoCustoUn: num(row.adesivoCustoUn),
    regimeMoPadrao: (row.regimeMoPadrao ?? "qualquer") as RegimeMoEtapa,
    incluirLavagem: row.incluirLavagem !== false,
    incluirCorte: row.incluirCorte === true,
    incluirAdesivo: row.incluirAdesivo !== false,
  };
}

export async function ensureCustosProdutoProcessoConfigTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`
CREATE TABLE IF NOT EXISTS \`custos_produtos_processo_config\` (
  \`projetoId\` int NOT NULL,
  \`embalagemMicroverdeUn\` decimal(14,6) NOT NULL DEFAULT 0.95,
  \`embalagemOutrosUn\` decimal(14,6) NOT NULL DEFAULT 0.60,
  \`lavagemMinutosUn\` decimal(10,4) NULL,
  \`embalagemMinutosUn\` decimal(10,4) NULL,
  \`corteMinutosUn\` decimal(10,4) NULL,
  \`adesivoCustoUn\` decimal(14,6) NULL,
  \`regimeMoPadrao\` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer',
  \`incluirLavagem\` tinyint(1) NOT NULL DEFAULT 1,
  \`incluirCorte\` tinyint(1) NOT NULL DEFAULT 0,
  \`incluirAdesivo\` tinyint(1) NOT NULL DEFAULT 1,
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(\`projetoId\`)
)`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[custosProdutoProcessoDb] ensure:", msg.slice(0, 160));
  }
}

export async function getProcessoConfig(projetoId: number): Promise<CustosProdutoProcessoConfig> {
  await ensureCustosProdutoProcessoConfigTable();
  const db = await getDb();
  if (!db) return { ...CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO };
  const rows = await db
    .select()
    .from(custosProdutosProcessoConfig)
    .where(eq(custosProdutosProcessoConfig.projetoId, projetoId))
    .limit(1);
  const row = rows[0];
  if (!row) return { ...CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO };
  return rowToConfig(row);
}

export async function setProcessoConfig(
  projetoId: number,
  config: CustosProdutoProcessoConfig,
): Promise<CustosProdutoProcessoConfig> {
  await ensureCustosProdutoProcessoConfigTable();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const payload = {
    projetoId,
    embalagemMicroverdeUn: String(config.embalagemMicroverdeUn),
    embalagemOutrosUn: String(config.embalagemOutrosUn),
    lavagemMinutosUn: config.lavagemMinutosUn != null ? String(config.lavagemMinutosUn) : null,
    embalagemMinutosUn: config.embalagemMinutosUn != null ? String(config.embalagemMinutosUn) : null,
    corteMinutosUn: config.corteMinutosUn != null ? String(config.corteMinutosUn) : null,
    adesivoCustoUn: config.adesivoCustoUn != null ? String(config.adesivoCustoUn) : null,
    regimeMoPadrao: config.regimeMoPadrao,
    incluirLavagem: config.incluirLavagem,
    incluirCorte: config.incluirCorte,
    incluirAdesivo: config.incluirAdesivo,
  };
  await db
    .insert(custosProdutosProcessoConfig)
    .values(payload)
    .onDuplicateKeyUpdate({
      set: {
        embalagemMicroverdeUn: payload.embalagemMicroverdeUn,
        embalagemOutrosUn: payload.embalagemOutrosUn,
        lavagemMinutosUn: payload.lavagemMinutosUn,
        embalagemMinutosUn: payload.embalagemMinutosUn,
        corteMinutosUn: payload.corteMinutosUn,
        adesivoCustoUn: payload.adesivoCustoUn,
        regimeMoPadrao: payload.regimeMoPadrao,
        incluirLavagem: payload.incluirLavagem,
        incluirCorte: payload.incluirCorte,
        incluirAdesivo: payload.incluirAdesivo,
      },
    });
  return getProcessoConfig(projetoId);
}
