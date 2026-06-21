import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
  type CustosProdutoProcessoConfig,
} from "@shared/custosProdutoProcessoPadrao";
import {
  configFromProcessoModelo,
  derivarProcessoModelo,
  LINHA_PROCESSO_INDUSTRIAL_PADRAO,
  normalizarLinhaProcessoInput,
  slugifyProcessoModelo,
  type FamiliaProcessoModelo,
  type ProcessoModeloRecord,
} from "@shared/custosLinhaProcessoIndustrial";
import type { CustoHoraPorRegime } from "@shared/custosMoEquipe";
import type { RegimeMoEtapa } from "@shared/custosMoEquipe";
import { custosProdutosProcessoConfig, custosProdutosProcessoModelos } from "../drizzle/schema";
import { getDb } from "./db";
import { getProcessoConfig } from "./custosProdutoProcessoDb";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseLinhaJson(raw: unknown) {
  if (raw == null || raw === "") return LINHA_PROCESSO_INDUSTRIAL_PADRAO;
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v || typeof v !== "object") return LINHA_PROCESSO_INDUSTRIAL_PADRAO;
    return normalizarLinhaProcessoInput(v);
  } catch {
    return LINHA_PROCESSO_INDUSTRIAL_PADRAO;
  }
}

function rowToModelo(row: typeof custosProdutosProcessoModelos.$inferSelect): ProcessoModeloRecord {
  return {
    id: row.id,
    nome: row.nome,
    slug: row.slug,
    descricao: row.descricao,
    familia: row.familia as FamiliaProcessoModelo,
    isDefault: row.isDefault === true,
    kgReferenciaMes: num(row.kgReferenciaMes),
    embalagemMicroverdeUn:
      num(row.embalagemMicroverdeUn) ?? CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO.embalagemMicroverdeUn,
    embalagemOutrosUn:
      num(row.embalagemOutrosUn) ?? CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO.embalagemOutrosUn,
    lavagemReaisKg: num(row.lavagemReaisKg),
    corteMinutosUn: num(row.corteMinutosUn),
    embalagemMinutosUn: num(row.embalagemMinutosUn),
    adesivoCustoUn: num(row.adesivoCustoUn),
    regimeMoPadrao: (row.regimeMoPadrao ?? "qualquer") as RegimeMoEtapa,
    incluirAdesivo: row.incluirAdesivo !== false,
    linhaProcesso: parseLinhaJson(row.linhaProcessoJson),
  };
}

export async function ensureProcessoModelosTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`
CREATE TABLE IF NOT EXISTS \`custos_produtos_processo_modelos\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`nome\` varchar(120) NOT NULL,
  \`slug\` varchar(64) NOT NULL,
  \`descricao\` text NULL,
  \`familia\` enum('folhosas','legumes','microverdes','flores','outros') NOT NULL DEFAULT 'folhosas',
  \`isDefault\` tinyint(1) NOT NULL DEFAULT 0,
  \`kgReferenciaMes\` decimal(14,4) NULL,
  \`embalagemMicroverdeUn\` decimal(14,6) NOT NULL DEFAULT 0.95,
  \`embalagemOutrosUn\` decimal(14,6) NOT NULL DEFAULT 0.60,
  \`lavagemReaisKg\` decimal(18,8) NULL,
  \`corteMinutosUn\` decimal(10,4) NULL,
  \`embalagemMinutosUn\` decimal(10,4) NULL,
  \`adesivoCustoUn\` decimal(14,6) NULL,
  \`regimeMoPadrao\` enum('clt','pj','qualquer') NOT NULL DEFAULT 'qualquer',
  \`incluirAdesivo\` tinyint(1) NOT NULL DEFAULT 1,
  \`linhaProcessoJson\` text NULL,
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(\`id\`),
  UNIQUE KEY \`uq_processo_modelo_slug\` (\`projetoId\`, \`slug\`)
)`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[processoModelosDb] ensure table:", msg.slice(0, 160));
  }
  try {
    await db.execute(
      sql.raw(
        "ALTER TABLE `custos_produtos_comercial_map` ADD COLUMN `processoModeloId` int NULL",
      ),
    );
  } catch {
    /* coluna já existe */
  }
}

async function clearDefaultModelo(projetoId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(custosProdutosProcessoModelos)
    .set({ isDefault: false })
    .where(eq(custosProdutosProcessoModelos.projetoId, projetoId));
}

export async function migrateLegacyConfigToModelo(projetoId: number): Promise<void> {
  await ensureProcessoModelosTable();
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ id: custosProdutosProcessoModelos.id })
    .from(custosProdutosProcessoModelos)
    .where(eq(custosProdutosProcessoModelos.projetoId, projetoId))
    .limit(1);
  if (existing.length > 0) return;

  const legacy = await getProcessoConfig(projetoId);
  const linha = legacy.linhaProcesso ?? LINHA_PROCESSO_INDUSTRIAL_PADRAO;
  await salvarProcessoModelo(projetoId, {
    nome: "Folhosas (padrão)",
    slug: "folhosas-padrao",
    descricao: "Migrado do modelo único anterior",
    familia: "folhosas",
    isDefault: true,
    kgReferenciaMes: null,
    embalagemMicroverdeUn: legacy.embalagemMicroverdeUn,
    embalagemOutrosUn: legacy.embalagemOutrosUn,
    adesivoCustoUn: legacy.adesivoCustoUn,
    regimeMoPadrao: legacy.regimeMoPadrao,
    incluirAdesivo: legacy.incluirAdesivo,
    linhaProcesso: linha,
  });
}

export async function listProcessoModelos(projetoId: number): Promise<ProcessoModeloRecord[]> {
  await migrateLegacyConfigToModelo(projetoId);
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(custosProdutosProcessoModelos)
    .where(eq(custosProdutosProcessoModelos.projetoId, projetoId))
    .orderBy(desc(custosProdutosProcessoModelos.isDefault), custosProdutosProcessoModelos.nome);
  return rows.map(rowToModelo);
}

export async function getProcessoModeloById(
  projetoId: number,
  id: number,
): Promise<ProcessoModeloRecord | null> {
  await ensureProcessoModelosTable();
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(custosProdutosProcessoModelos)
    .where(
      and(eq(custosProdutosProcessoModelos.projetoId, projetoId), eq(custosProdutosProcessoModelos.id, id)),
    )
    .limit(1);
  return rows[0] ? rowToModelo(rows[0]) : null;
}

export async function getDefaultProcessoModelo(projetoId: number): Promise<ProcessoModeloRecord | null> {
  const list = await listProcessoModelos(projetoId);
  return list.find((m) => m.isDefault) ?? list[0] ?? null;
}

export async function resolveProcessoConfigForModelo(
  projetoId: number,
  processoModeloId: number | null | undefined,
  mapaHora?: CustoHoraPorRegime | null,
): Promise<CustosProdutoProcessoConfig> {
  if (processoModeloId != null) {
    const m = await getProcessoModeloById(projetoId, processoModeloId);
    if (m) {
      const derived = derivarProcessoModelo(m, mapaHora);
      return configFromProcessoModelo(derived);
    }
  }
  const def = await getDefaultProcessoModelo(projetoId);
  if (def) {
    const derived = derivarProcessoModelo(def, mapaHora);
    return configFromProcessoModelo(derived);
  }
  return getProcessoConfig(projetoId);
}

export type SalvarProcessoModeloInput = Omit<
  ProcessoModeloRecord,
  "id" | "lavagemReaisKg" | "corteMinutosUn" | "embalagemMinutosUn"
> & { id?: number };

export async function salvarProcessoModelo(
  projetoId: number,
  input: SalvarProcessoModeloInput,
  mapaHora?: CustoHoraPorRegime | null,
): Promise<ProcessoModeloRecord> {
  await ensureProcessoModelosTable();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const slug = input.slug?.trim() || slugifyProcessoModelo(input.nome);
  const derived = derivarProcessoModelo(
    {
      id: input.id ?? 0,
      nome: input.nome.trim(),
      slug,
      descricao: input.descricao,
      familia: input.familia,
      isDefault: input.isDefault,
      kgReferenciaMes: input.kgReferenciaMes,
      embalagemMicroverdeUn: input.embalagemMicroverdeUn,
      embalagemOutrosUn: input.embalagemOutrosUn,
      adesivoCustoUn: input.adesivoCustoUn,
      regimeMoPadrao: input.regimeMoPadrao,
      incluirAdesivo: input.incluirAdesivo,
      linhaProcesso: normalizarLinhaProcessoInput(input.linhaProcesso),
    },
    mapaHora,
  );

  if (derived.isDefault) await clearDefaultModelo(projetoId);

  const payload = {
    projetoId,
    nome: derived.nome,
    slug: derived.slug,
    descricao: derived.descricao,
    familia: derived.familia,
    isDefault: derived.isDefault,
    kgReferenciaMes: derived.kgReferenciaMes != null ? String(derived.kgReferenciaMes) : null,
    embalagemMicroverdeUn: String(derived.embalagemMicroverdeUn),
    embalagemOutrosUn: String(derived.embalagemOutrosUn),
    lavagemReaisKg: derived.lavagemReaisKg != null ? String(derived.lavagemReaisKg) : null,
    corteMinutosUn: derived.corteMinutosUn != null ? String(derived.corteMinutosUn) : null,
    embalagemMinutosUn: derived.embalagemMinutosUn != null ? String(derived.embalagemMinutosUn) : null,
    adesivoCustoUn: derived.adesivoCustoUn != null ? String(derived.adesivoCustoUn) : null,
    regimeMoPadrao: derived.regimeMoPadrao,
    incluirAdesivo: derived.incluirAdesivo,
    linhaProcessoJson: JSON.stringify(derived.linhaProcesso),
  };

  if (input.id != null && input.id > 0) {
    await db
      .update(custosProdutosProcessoModelos)
      .set(payload)
      .where(
        and(
          eq(custosProdutosProcessoModelos.projetoId, projetoId),
          eq(custosProdutosProcessoModelos.id, input.id),
        ),
      );
    const saved = await getProcessoModeloById(projetoId, input.id);
    if (!saved) throw new Error("Modelo não encontrado após salvar");
    await syncLegacyProcessoConfig(projetoId, saved);
    return saved;
  }

  const res = await db.insert(custosProdutosProcessoModelos).values(payload);
  const newId = Number(res[0].insertId);
  const saved = await getProcessoModeloById(projetoId, newId);
  if (!saved) throw new Error("Falha ao criar modelo");
  if (derived.isDefault) await syncLegacyProcessoConfig(projetoId, saved);
  return saved;
}

async function syncLegacyProcessoConfig(projetoId: number, modelo: ProcessoModeloRecord): Promise<void> {
  if (!modelo.isDefault) return;
  const db = await getDb();
  if (!db) return;
  const cfg = configFromProcessoModelo(modelo);
  const payload = {
    projetoId,
    embalagemMicroverdeUn: String(cfg.embalagemMicroverdeUn),
    embalagemOutrosUn: String(cfg.embalagemOutrosUn),
    lavagemReaisKg: cfg.lavagemReaisKg != null ? String(cfg.lavagemReaisKg) : null,
    lavagemMinutosUn: null,
    embalagemMinutosUn: cfg.embalagemMinutosUn != null ? String(cfg.embalagemMinutosUn) : null,
    corteMinutosUn: cfg.corteMinutosUn != null ? String(cfg.corteMinutosUn) : null,
    adesivoCustoUn: cfg.adesivoCustoUn != null ? String(cfg.adesivoCustoUn) : null,
    regimeMoPadrao: cfg.regimeMoPadrao,
    incluirAdesivo: cfg.incluirAdesivo,
    linhaProcessoJson: cfg.linhaProcesso != null ? JSON.stringify(cfg.linhaProcesso) : null,
  };
  await db
    .insert(custosProdutosProcessoConfig)
    .values(payload)
    .onDuplicateKeyUpdate({ set: payload });
}

export async function excluirProcessoModelo(projetoId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const m = await getProcessoModeloById(projetoId, id);
  if (!m) return;
  if (m.isDefault) throw new Error("Não é possível excluir o modelo padrão.");
  await db
    .delete(custosProdutosProcessoModelos)
    .where(
      and(eq(custosProdutosProcessoModelos.projetoId, projetoId), eq(custosProdutosProcessoModelos.id, id)),
    );
}

export async function definirProcessoModeloPadrao(projetoId: number, id: number): Promise<ProcessoModeloRecord> {
  await clearDefaultModelo(projetoId);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(custosProdutosProcessoModelos)
    .set({ isDefault: true })
    .where(
      and(eq(custosProdutosProcessoModelos.projetoId, projetoId), eq(custosProdutosProcessoModelos.id, id)),
    );
  const saved = await getProcessoModeloById(projetoId, id);
  if (!saved) throw new Error("Modelo não encontrado");
  await syncLegacyProcessoConfig(projetoId, saved);
  return saved;
}
