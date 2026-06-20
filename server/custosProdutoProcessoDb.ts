import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
  type CustosProdutoProcessoConfig,
} from "@shared/custosProdutoProcessoPadrao";
import {
  normalizarLinhaProcessoInput,
  type LinhaProcessoIndustrialInput,
} from "@shared/custosLinhaProcessoIndustrial";
import type { RegimeMoEtapa } from "@shared/custosMoEquipe";
import { custosProdutosProcessoConfig } from "../drizzle/schema";
import { getDb } from "./db";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseLinhaProcessoJson(raw: unknown): LinhaProcessoIndustrialInput | null {
  if (raw == null || raw === "") return null;
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v || typeof v !== "object") return null;
    return normalizarLinhaProcessoInput(v as Partial<LinhaProcessoIndustrialInput> & { secagemMin?: number });
  } catch {
    return null;
  }
}

function rowToConfig(row: typeof custosProdutosProcessoConfig.$inferSelect): CustosProdutoProcessoConfig {
  return {
    embalagemMicroverdeUn: num(row.embalagemMicroverdeUn) ?? CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO.embalagemMicroverdeUn,
    embalagemOutrosUn: num(row.embalagemOutrosUn) ?? CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO.embalagemOutrosUn,
    lavagemReaisKg: num(row.lavagemReaisKg),
    lavagemMinutosUn: num(row.lavagemMinutosUn),
    embalagemMinutosUn: num(row.embalagemMinutosUn),
    corteMinutosUn: num(row.corteMinutosUn),
    adesivoCustoUn: num(row.adesivoCustoUn),
    regimeMoPadrao: (row.regimeMoPadrao ?? "qualquer") as RegimeMoEtapa,
    incluirAdesivo: row.incluirAdesivo !== false,
    linhaProcesso: parseLinhaProcessoJson(row.linhaProcessoJson),
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
  \`lavagemReaisKg\` decimal(18,8) NULL,
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
    await db.execute(
      sql.raw("ALTER TABLE `custos_produtos_processo_config` ADD COLUMN `lavagemReaisKg` decimal(18,8) NULL"),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/Duplicate column name/i.test(msg)) {
      console.warn("[custosProdutoProcessoDb] ensure:", msg.slice(0, 160));
    }
  }
  try {
    await db.execute(
      sql.raw("ALTER TABLE `custos_produtos_processo_config` ADD COLUMN `linhaProcessoJson` text NULL"),
    );
  } catch {
    /* coluna já existe */
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
    lavagemReaisKg: config.lavagemReaisKg != null ? String(config.lavagemReaisKg) : null,
    lavagemMinutosUn: config.lavagemMinutosUn != null ? String(config.lavagemMinutosUn) : null,
    embalagemMinutosUn: config.embalagemMinutosUn != null ? String(config.embalagemMinutosUn) : null,
    corteMinutosUn: config.corteMinutosUn != null ? String(config.corteMinutosUn) : null,
    adesivoCustoUn: config.adesivoCustoUn != null ? String(config.adesivoCustoUn) : null,
    regimeMoPadrao: config.regimeMoPadrao,
    incluirAdesivo: config.incluirAdesivo,
    linhaProcessoJson:
      config.linhaProcesso != null ? JSON.stringify(config.linhaProcesso) : null,
  };
  await db
    .insert(custosProdutosProcessoConfig)
    .values(payload)
    .onDuplicateKeyUpdate({
      set: {
        embalagemMicroverdeUn: payload.embalagemMicroverdeUn,
        embalagemOutrosUn: payload.embalagemOutrosUn,
        lavagemReaisKg: payload.lavagemReaisKg,
        lavagemMinutosUn: payload.lavagemMinutosUn,
        embalagemMinutosUn: payload.embalagemMinutosUn,
        corteMinutosUn: payload.corteMinutosUn,
        adesivoCustoUn: payload.adesivoCustoUn,
        regimeMoPadrao: payload.regimeMoPadrao,
        incluirAdesivo: payload.incluirAdesivo,
        linhaProcessoJson: payload.linhaProcessoJson,
      },
    });
  return getProcessoConfig(projetoId);
}
