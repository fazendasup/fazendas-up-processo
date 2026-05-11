import { receitaCicloPrioritariaParaVariedade } from "@shared/cicloReceita";
import { eq, and, or, inArray, sql, asc, desc, count, ne, isNull, gt, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { Pool as Mysql2Pool } from "mysql2";
import type { ResultSetHeader } from "mysql2/promise";
import {
  InsertUser, users,
  projetos,
  projetoUsuarios,
  projetoModulos,
  bancadas,
  caixasBancada,
  medicoesBancada,
  aplicacoesBancada,
  variedades, InsertVariedade,
  fasesConfig, InsertFaseConfig,
  torres, InsertTorre,
  caixasAgua, InsertCaixaAgua,
  medicoesCaixa, InsertMedicaoCaixa,
  aplicacoesCaixa, InsertAplicacaoCaixa,
  andares, InsertAndar,
  perfis, InsertPerfil,
  furos, InsertFuro,
  aplicacoesAndar, InsertAplicacaoAndar,
  germinacao, InsertGerminacao,
  transplantios, InsertTransplantio,
  manutencoes, InsertManutencao,
  ciclos, InsertCiclo,
  receitasCrescimento, InsertReceitaCrescimento,
  tarefas, InsertTarefa,
  registrosColheita, InsertRegistroColheita,
  planosPlantio, InsertPlanoPlantio,
  estoqueItens, InsertEstoqueItem,
  visionCultivoAnalyses, InsertVisionCultivoAnalysis,
  visionTrainingSamples, InsertVisionTrainingSample,
  intelligentAlerts, InsertIntelligentAlert,
  recommendationRules, InsertRecommendationRule,
  alertEvents, InsertAlertEvent,
  type InsertProjeto,
  type ProjetoModuloRow,
  type InsertBancada,
  type InsertProjetoUsuario,
  type InsertMedicaoBancada,
  type InsertAplicacaoBancada,
  type InsertCaixaBancada,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { MODULOS_CONTRATAVEIS, NOME_PROJETO_FAZENDA_LEGADO, type ModuloContratavel } from "../shared/const";
import type { OperationalResetClusters } from "../shared/operationalReset";
import {
  ESTRUTURA_OVERRIDE_FV_12x6,
  estruturaFaseParaProjeto,
  parseTorreEstruturaOverrideJson,
  type Fase,
} from "../shared/types";
import {
  runEnsureIncompleteMultiProjetoSchema,
  type EnsureMultiProjetoSchemaResult,
  columnExists,
  tableExists,
} from "./ensure-multi-projeto-schema";

/** Drizzle envolve erros MySQL em `cause`; o `message` superficial costuma ser só "Failed query: …". */
function isMysqlDuplicateColumnError(err: unknown): boolean {
  let cur: unknown = err;
  for (let d = 0; d < 12 && cur != null; d++) {
    if (typeof cur === "object") {
      const o = cur as { errno?: number; code?: string; message?: string };
      if (o.errno === 1060 || o.code === "ER_DUP_FIELDNAME") return true;
      // Índices/FKs duplicados também são idempotência esperada nos ensures.
      if (o.errno === 1061 || o.code === "ER_DUP_KEYNAME") return true;
      if (o.errno === 1826 || o.code === "ER_FK_DUP_NAME") return true;
      if (
        typeof o.message === "string" &&
        (/Duplicate column name/i.test(o.message) ||
          /Duplicate key name/i.test(o.message) ||
          /Duplicate foreign key/i.test(o.message) ||
          /Duplicate foreign key constraint name/i.test(o.message))
      ) {
        return true;
      }
    }
    cur = cur instanceof Error ? cur.cause : undefined;
  }
  const top = err instanceof Error ? err.message : String(err);
  return (
    /Duplicate column name/i.test(top) ||
    /ER_DUP_FIELDNAME/i.test(top) ||
    /Duplicate key name/i.test(top) ||
    /ER_DUP_KEYNAME/i.test(top) ||
    /Duplicate foreign key/i.test(top) ||
    /Duplicate foreign key constraint name/i.test(top) ||
    /ER_FK_DUP_NAME/i.test(top)
  );
}

export type { EnsureMultiProjetoSchemaResult } from "./ensure-multi-projeto-schema";

export type EnsureIncompleteMultiProjetoResult =
  | (EnsureMultiProjetoSchemaResult & { ok: true; nullRowsPatched: number })
  | { ok: false; reason: string };

/**
 * Aplica DDL/backfill da migração 0014 quando `projetoId` ainda não existe nas tabelas operacionais,
 * depois preenche `projetoId` NULL com o projeto legado.
 */
export async function ensureIncompleteMultiProjetoSchema(): Promise<EnsureIncompleteMultiProjetoResult> {
  const dbConn = await getDb();
  if (!dbConn) return { ok: false, reason: "Database not available" };
  await ensureProjetosTables();
  const fvpId = await getOrCreateFazendaVerticalPrincipalProjetoId();
  const r = await runEnsureIncompleteMultiProjetoSchema(dbConn, fvpId);
  const nullRowsPatched = await assignNullProjetoIdsToFvp(fvpId);
  if (r.columnsAdded.length > 0) {
    console.log(
      `[Database] ensureIncompleteMultiProjetoSchema: fvpId=${fvpId} nullRowsPatched=${nullRowsPatched}`,
    );
  }
  return { ok: true, ...r, nullRowsPatched };
}

let _db: ReturnType<typeof drizzle> | null = null;

/** Charset UTF-8 + timeout de ligação (evita servidor HTTP preso indefinidamente se o MySQL não estiver a ouvir). */
function mysqlUrlWithUtf8mb4(url: string): string {
  let out = url.trim();
  if (!/[?&]charset=utf8/i.test(out)) {
    out = out.includes("?") ? `${out}&charset=utf8mb4` : `${out}?charset=utf8mb4`;
  }
  if (!/[?&]connectTimeout=/i.test(out)) {
    out += "&connectTimeout=10000";
  }
  return out;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(mysqlUrlWithUtf8mb4(process.env.DATABASE_URL));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/** Tabelas operacionais com `projetoId` (nomes MySQL) — UPDATE WHERE projetoId IS NULL. */
const OPERATIONAL_TABLE_NAMES_MYSQL = [
  "variedades",
  "fases_config",
  "caixas_agua",
  "torres",
  "medicoes_caixa",
  "aplicacoes_caixa",
  "andares",
  "perfis",
  "furos",
  "aplicacoes_andar",
  "germinacao",
  "transplantios",
  "manutencoes",
  "ciclos",
  "receitas_crescimento",
  "tarefas",
  "registros_colheita",
  "planos_plantio",
  "recommendation_rules",
  "intelligent_alerts",
  "alert_events",
  "estoque_itens",
  "bancadas",
  "caixas_bancada",
  "medicoes_bancada",
  "aplicacoes_bancada",
] as const;

function affectedRowsFromExecute(res: unknown): number {
  const h = Array.isArray(res) ? res[0] : res;
  return Number((h as ResultSetHeader)?.affectedRows ?? 0);
}

/**
 * Bases antigas ou migrações incompletas podem ter `projetoId` NULL — o painel não mostra essas linhas.
 */
export async function assignNullProjetoIdsToFvp(fvpId: number): Promise<number> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  let total = 0;
  const pid = Number(fvpId);
  for (const name of OPERATIONAL_TABLE_NAMES_MYSQL) {
    try {
      const res = await dbConn.execute(
        sql.raw(`UPDATE \`${name}\` SET projetoId = ${pid} WHERE projetoId IS NULL`),
      );
      total += affectedRowsFromExecute(res);
    } catch (err) {
      console.warn(`[Database] assignNullProjetoIdsToFvp ignorado (${name}):`, err);
    }
  }
  return total;
}

// ============================================================
// Users
// ============================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) {
      values.role = "platform_admin";
      updateSet.role = "platform_admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// Projetos (multi-tenant)
// ============================================================

export type ListProjetosForUserOpts = { includeInactive?: boolean };

export async function listProjetosForUser(userId: number, opts?: ListProjetosForUserOpts) {
  const dbConn = await getDb();
  if (!dbConn) return [];
  await ensureProjetosTables();
  const membership = eq(projetoUsuarios.userId, userId);
  const whereClause =
    opts?.includeInactive === true ? membership : and(membership, eq(projetos.status, "ativo"));
  return dbConn
    .select({
      projeto: projetos,
      role: projetoUsuarios.role,
    })
    .from(projetoUsuarios)
    .innerJoin(projetos, eq(projetos.id, projetoUsuarios.projetoId))
    .where(whereClause);
}

/** Contagens por projeto para diagnosticar dados “presos” noutro ID (multi-projeto). */
export type OperationalCounts = {
  torres: number;
  andares: number;
  ciclos: number;
  caixasAgua: number;
  variedades: number;
  bancadas: number;
  planosPlantio: number;
};

export const zeroOperationalCounts = (): OperationalCounts => ({
  torres: 0,
  andares: 0,
  ciclos: 0,
  caixasAgua: 0,
  variedades: 0,
  bancadas: 0,
  planosPlantio: 0,
});

export async function getOperationalCountsForProjetos(projetoIds: number[]): Promise<Record<number, OperationalCounts>> {
  const out: Record<number, OperationalCounts> = {};
  for (const id of projetoIds) {
    out[id] = zeroOperationalCounts();
  }
  if (projetoIds.length === 0) return out;

  const dbConn = await getDb();
  if (!dbConn) return out;

  const bump = (pid: number, key: keyof OperationalCounts, n: number) => {
    if (!out[pid]) out[pid] = zeroOperationalCounts();
    out[pid][key] = n;
  };

  const safeGroup = async (label: string, run: () => Promise<{ projetoId: number | null; n: unknown }[]>) => {
    try {
      return await run();
    } catch (err) {
      console.warn(`[Database] getOperationalCountsForProjetos (${label}) ignorado:`, err);
      return [];
    }
  };

  const [
    ctTorres,
    ctAndares,
    ctCiclos,
    ctCaixas,
    ctVariedades,
    ctBancadas,
    ctPlanos,
  ] = await Promise.all([
    safeGroup("torres", () =>
      dbConn
        .select({ projetoId: torres.projetoId, n: count() })
        .from(torres)
        .where(inArray(torres.projetoId, projetoIds))
        .groupBy(torres.projetoId),
    ),
    safeGroup("andares", () =>
      dbConn
        .select({ projetoId: andares.projetoId, n: count() })
        .from(andares)
        .where(inArray(andares.projetoId, projetoIds))
        .groupBy(andares.projetoId),
    ),
    safeGroup("ciclos", () =>
      dbConn
        .select({ projetoId: ciclos.projetoId, n: count() })
        .from(ciclos)
        .where(inArray(ciclos.projetoId, projetoIds))
        .groupBy(ciclos.projetoId),
    ),
    safeGroup("caixas_agua", () =>
      dbConn
        .select({ projetoId: caixasAgua.projetoId, n: count() })
        .from(caixasAgua)
        .where(inArray(caixasAgua.projetoId, projetoIds))
        .groupBy(caixasAgua.projetoId),
    ),
    safeGroup("variedades", () =>
      dbConn
        .select({ projetoId: variedades.projetoId, n: count() })
        .from(variedades)
        .where(inArray(variedades.projetoId, projetoIds))
        .groupBy(variedades.projetoId),
    ),
    safeGroup("bancadas", () =>
      dbConn
        .select({ projetoId: bancadas.projetoId, n: count() })
        .from(bancadas)
        .where(inArray(bancadas.projetoId, projetoIds))
        .groupBy(bancadas.projetoId),
    ),
    safeGroup("planos_plantio", () =>
      dbConn
        .select({ projetoId: planosPlantio.projetoId, n: count() })
        .from(planosPlantio)
        .where(inArray(planosPlantio.projetoId, projetoIds))
        .groupBy(planosPlantio.projetoId),
    ),
  ]);

  for (const r of ctTorres) bump(Number(r.projetoId), "torres", Number(r.n));
  for (const r of ctAndares) bump(Number(r.projetoId), "andares", Number(r.n));
  for (const r of ctCiclos) bump(Number(r.projetoId), "ciclos", Number(r.n));
  for (const r of ctCaixas) bump(Number(r.projetoId), "caixasAgua", Number(r.n));
  for (const r of ctVariedades) bump(Number(r.projetoId), "variedades", Number(r.n));
  for (const r of ctBancadas) bump(Number(r.projetoId), "bancadas", Number(r.n));
  for (const r of ctPlanos) bump(Number(r.projetoId), "planosPlantio", Number(r.n));

  return out;
}

async function assertNoUniqueConflictsOnProjetoMerge(
  dbConn: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  fromProjetoId: number,
  toProjetoId: number,
): Promise<void> {
  const intersectTorreSlugs = async () => {
    const [fromRows, toRows] = await Promise.all([
      dbConn.select({ slug: torres.slug }).from(torres).where(eq(torres.projetoId, fromProjetoId)),
      dbConn.select({ slug: torres.slug }).from(torres).where(eq(torres.projetoId, toProjetoId)),
    ]);
    const toSet = new Set(toRows.map((r) => r.slug));
    return fromRows.filter((r) => toSet.has(r.slug)).map((r) => r.slug);
  };

  const intersectVariedadeSlugs = async () => {
    const [fromRows, toRows] = await Promise.all([
      dbConn.select({ slug: variedades.slug }).from(variedades).where(eq(variedades.projetoId, fromProjetoId)),
      dbConn.select({ slug: variedades.slug }).from(variedades).where(eq(variedades.projetoId, toProjetoId)),
    ]);
    const toSet = new Set(toRows.map((r) => r.slug));
    return fromRows.filter((r) => toSet.has(r.slug)).map((r) => r.slug);
  };

  const intersectCaixaSlugs = async () => {
    const [fromRows, toRows] = await Promise.all([
      dbConn.select({ slug: caixasAgua.slug }).from(caixasAgua).where(eq(caixasAgua.projetoId, fromProjetoId)),
      dbConn.select({ slug: caixasAgua.slug }).from(caixasAgua).where(eq(caixasAgua.projetoId, toProjetoId)),
    ]);
    const toSet = new Set(toRows.map((r) => r.slug));
    return fromRows.filter((r) => toSet.has(r.slug)).map((r) => r.slug);
  };

  const intersectFases = async () => {
    const [fromRows, toRows] = await Promise.all([
      dbConn.select({ fase: fasesConfig.fase }).from(fasesConfig).where(eq(fasesConfig.projetoId, fromProjetoId)),
      dbConn.select({ fase: fasesConfig.fase }).from(fasesConfig).where(eq(fasesConfig.projetoId, toProjetoId)),
    ]);
    const toSet = new Set(toRows.map((r) => r.fase));
    return fromRows.filter((r) => toSet.has(r.fase)).map((r) => r.fase);
  };

  const [tSlugs, vSlugs, cSlugs, fases] = await Promise.all([
    intersectTorreSlugs(),
    intersectVariedadeSlugs(),
    intersectCaixaSlugs(),
    intersectFases(),
  ]);

  if (tSlugs.length || vSlugs.length || cSlugs.length || fases.length) {
    const parts: string[] = [];
    if (tSlugs.length) parts.push(`torres (slug): ${tSlugs.join(", ")}`);
    if (vSlugs.length) parts.push(`variedades (slug): ${vSlugs.join(", ")}`);
    if (cSlugs.length) parts.push(`caixas d'água (slug): ${cSlugs.join(", ")}`);
    if (fases.length) parts.push(`fases_config (fase): ${fases.join(", ")}`);
    throw new Error(
      `Conflito de chave única ao juntar projetos — já existem no destino: ${parts.join("; ")}. ` +
        `Esvaíe ou renomeie no projeto destino, ou contacte suporte.`,
    );
  }
}

/**
 * Move todas as linhas operacionais de `fromProjetoId` para `toProjetoId` (mesmo registo em `projetos`).
 * Uso típico: dados legados ficaram num ID e o painel está noutro projeto vazio.
 * Só para administradores global; valida conflitos de slug/fase únicos.
 */
export type ReassignOperationalOptions = {
  /** Quando a origem é um `projetoId` órfão (sem linha em `projetos`), não falhar na verificação do projeto de origem. */
  allowMissingSourceProjeto?: boolean;
};

export async function reassignOperationalDataBetweenProjetos(
  fromProjetoId: number,
  toProjetoId: number,
  opts?: ReassignOperationalOptions,
): Promise<{ ok: true }> {
  if (fromProjetoId === toProjetoId) {
    throw new Error("Origem e destino têm de ser projetos diferentes.");
  }
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const [fromP, toP] = await Promise.all([
    dbConn.select({ id: projetos.id }).from(projetos).where(eq(projetos.id, fromProjetoId)).limit(1),
    dbConn.select({ id: projetos.id }).from(projetos).where(eq(projetos.id, toProjetoId)).limit(1),
  ]);
  if (toP.length === 0) {
    throw new Error("O projeto de destino não existe.");
  }
  if (!opts?.allowMissingSourceProjeto && fromP.length === 0) {
    throw new Error("O projeto de origem não existe.");
  }

  await assertNoUniqueConflictsOnProjetoMerge(dbConn, fromProjetoId, toProjetoId);

  await dbConn.transaction(async (tx) => {
    await tx.update(variedades).set({ projetoId: toProjetoId }).where(eq(variedades.projetoId, fromProjetoId));
    await tx.update(fasesConfig).set({ projetoId: toProjetoId }).where(eq(fasesConfig.projetoId, fromProjetoId));
    await tx.update(caixasAgua).set({ projetoId: toProjetoId }).where(eq(caixasAgua.projetoId, fromProjetoId));
    await tx.update(torres).set({ projetoId: toProjetoId }).where(eq(torres.projetoId, fromProjetoId));
    await tx.update(medicoesCaixa).set({ projetoId: toProjetoId }).where(eq(medicoesCaixa.projetoId, fromProjetoId));
    await tx.update(aplicacoesCaixa).set({ projetoId: toProjetoId }).where(eq(aplicacoesCaixa.projetoId, fromProjetoId));
    await tx.update(andares).set({ projetoId: toProjetoId }).where(eq(andares.projetoId, fromProjetoId));
    await tx.update(perfis).set({ projetoId: toProjetoId }).where(eq(perfis.projetoId, fromProjetoId));
    await tx.update(furos).set({ projetoId: toProjetoId }).where(eq(furos.projetoId, fromProjetoId));
    await tx.update(aplicacoesAndar).set({ projetoId: toProjetoId }).where(eq(aplicacoesAndar.projetoId, fromProjetoId));
    await tx.update(germinacao).set({ projetoId: toProjetoId }).where(eq(germinacao.projetoId, fromProjetoId));
    await tx.update(transplantios).set({ projetoId: toProjetoId }).where(eq(transplantios.projetoId, fromProjetoId));
    await tx.update(manutencoes).set({ projetoId: toProjetoId }).where(eq(manutencoes.projetoId, fromProjetoId));
    await tx.update(ciclos).set({ projetoId: toProjetoId }).where(eq(ciclos.projetoId, fromProjetoId));
    await tx.update(receitasCrescimento).set({ projetoId: toProjetoId }).where(eq(receitasCrescimento.projetoId, fromProjetoId));
    await tx.update(tarefas).set({ projetoId: toProjetoId }).where(eq(tarefas.projetoId, fromProjetoId));
    await tx.update(registrosColheita).set({ projetoId: toProjetoId }).where(eq(registrosColheita.projetoId, fromProjetoId));
    await tx.update(planosPlantio).set({ projetoId: toProjetoId }).where(eq(planosPlantio.projetoId, fromProjetoId));
    await tx.update(recommendationRules).set({ projetoId: toProjetoId }).where(eq(recommendationRules.projetoId, fromProjetoId));
    await tx.update(intelligentAlerts).set({ projetoId: toProjetoId }).where(eq(intelligentAlerts.projetoId, fromProjetoId));
    await tx.update(alertEvents).set({ projetoId: toProjetoId }).where(eq(alertEvents.projetoId, fromProjetoId));
    await tx.update(estoqueItens).set({ projetoId: toProjetoId }).where(eq(estoqueItens.projetoId, fromProjetoId));
    await tx.update(bancadas).set({ projetoId: toProjetoId }).where(eq(bancadas.projetoId, fromProjetoId));
    await tx.update(caixasBancada).set({ projetoId: toProjetoId }).where(eq(caixasBancada.projetoId, fromProjetoId));
    await tx.update(medicoesBancada).set({ projetoId: toProjetoId }).where(eq(medicoesBancada.projetoId, fromProjetoId));
    await tx.update(aplicacoesBancada).set({ projetoId: toProjetoId }).where(eq(aplicacoesBancada.projetoId, fromProjetoId));
  });

  return { ok: true };
}

/**
 * Garante que existe um projeto ativo com o nome legado e devolve o seu `id`.
 */
export async function getOrCreateFazendaVerticalPrincipalProjetoId(): Promise<number> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await ensureProjetosTables();
  const prefer = await dbConn
    .select({ id: projetos.id })
    .from(projetos)
    .where(and(eq(projetos.status, "ativo"), eq(projetos.nome, NOME_PROJETO_FAZENDA_LEGADO)))
    .limit(1);
  if (prefer.length > 0) {
    return prefer[0]!.id;
  }
  const [ins] = await dbConn.insert(projetos).values({
    nome: NOME_PROJETO_FAZENDA_LEGADO,
    tipo: "fazenda_vertical",
    status: "ativo",
    descricao: "Projeto original com os dados existentes do sistema (migração legado).",
  });
  return Number(ins.insertId);
}

/** Inclui linhas com `projetoId` NULL (em SQL, `NULL <> x` não é verdadeiro). */
function notFvpProjetoIdColumn(col: Parameters<typeof isNull>[0], excludeId: number) {
  return or(isNull(col), ne(col as never, excludeId));
}

async function collectDistinctOperationalProjetoIdsExcluding(
  dbConn: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  excludeId: number,
): Promise<number[]> {
  const ids = new Set<number>();
  const scan = async (label: string, run: () => Promise<{ pid: unknown }[]>) => {
    try {
      const rows = await run();
      for (const r of rows) {
        if (r.pid == null) continue;
        const n = Number(r.pid);
        if (Number.isFinite(n) && n !== excludeId) ids.add(n);
      }
    } catch (err) {
      console.warn(`[Database] collectDistinctOperationalProjetoIdsExcluding (${label}):`, err);
    }
  };
  await Promise.all([
    scan("torres", () =>
      dbConn
        .select({ pid: torres.projetoId })
        .from(torres)
        .where(notFvpProjetoIdColumn(torres.projetoId, excludeId))
        .groupBy(torres.projetoId),
    ),
    scan("ciclos", () =>
      dbConn
        .select({ pid: ciclos.projetoId })
        .from(ciclos)
        .where(notFvpProjetoIdColumn(ciclos.projetoId, excludeId))
        .groupBy(ciclos.projetoId),
    ),
    scan("variedades", () =>
      dbConn
        .select({ pid: variedades.projetoId })
        .from(variedades)
        .where(notFvpProjetoIdColumn(variedades.projetoId, excludeId))
        .groupBy(variedades.projetoId),
    ),
    scan("caixas_agua", () =>
      dbConn
        .select({ pid: caixasAgua.projetoId })
        .from(caixasAgua)
        .where(notFvpProjetoIdColumn(caixasAgua.projetoId, excludeId))
        .groupBy(caixasAgua.projetoId),
    ),
    scan("germinacao", () =>
      dbConn
        .select({ pid: germinacao.projetoId })
        .from(germinacao)
        .where(notFvpProjetoIdColumn(germinacao.projetoId, excludeId))
        .groupBy(germinacao.projetoId),
    ),
    scan("planos_plantio", () =>
      dbConn
        .select({ pid: planosPlantio.projetoId })
        .from(planosPlantio)
        .where(notFvpProjetoIdColumn(planosPlantio.projetoId, excludeId))
        .groupBy(planosPlantio.projetoId),
    ),
    scan("bancadas", () =>
      dbConn
        .select({ pid: bancadas.projetoId })
        .from(bancadas)
        .where(notFvpProjetoIdColumn(bancadas.projetoId, excludeId))
        .groupBy(bancadas.projetoId),
    ),
    scan("fases_config", () =>
      dbConn
        .select({ pid: fasesConfig.projetoId })
        .from(fasesConfig)
        .where(notFvpProjetoIdColumn(fasesConfig.projetoId, excludeId))
        .groupBy(fasesConfig.projetoId),
    ),
    scan("receitas", () =>
      dbConn
        .select({ pid: receitasCrescimento.projetoId })
        .from(receitasCrescimento)
        .where(notFvpProjetoIdColumn(receitasCrescimento.projetoId, excludeId))
        .groupBy(receitasCrescimento.projetoId),
    ),
    scan("tarefas", () =>
      dbConn
        .select({ pid: tarefas.projetoId })
        .from(tarefas)
        .where(notFvpProjetoIdColumn(tarefas.projetoId, excludeId))
        .groupBy(tarefas.projetoId),
    ),
    scan("andares", () =>
      dbConn
        .select({ pid: andares.projetoId })
        .from(andares)
        .where(notFvpProjetoIdColumn(andares.projetoId, excludeId))
        .groupBy(andares.projetoId),
    ),
    scan("perfis", () =>
      dbConn
        .select({ pid: perfis.projetoId })
        .from(perfis)
        .where(notFvpProjetoIdColumn(perfis.projetoId, excludeId))
        .groupBy(perfis.projetoId),
    ),
    scan("manutencoes", () =>
      dbConn
        .select({ pid: manutencoes.projetoId })
        .from(manutencoes)
        .where(notFvpProjetoIdColumn(manutencoes.projetoId, excludeId))
        .groupBy(manutencoes.projetoId),
    ),
  ]);
  return Array.from(ids).sort((a, b) => a - b);
}

export type LegacyMigrationVerification = {
  torres: number;
  andares: number;
  ciclos: number;
  receitasCrescimento: number;
  variedades: number;
  planosPlantio: number;
  caixasAgua: number;
};

async function verifyOperationalDataForFvpProjeto(fvpId: number): Promise<LegacyMigrationVerification> {
  const dbConn = await getDb();
  const empty: LegacyMigrationVerification = {
    torres: 0,
    andares: 0,
    ciclos: 0,
    receitasCrescimento: 0,
    variedades: 0,
    planosPlantio: 0,
    caixasAgua: 0,
  };
  if (!dbConn) return empty;

  const cnt = async (label: string, run: () => Promise<{ c: unknown }[]>): Promise<number> => {
    try {
      const [r] = await run();
      return Number(r?.c ?? 0);
    } catch {
      console.warn(`[Database] verifyOperationalDataForFvpProjeto (${label}) ignorado`);
      return 0;
    }
  };
  const [
    nTorres,
    nAndares,
    nCiclos,
    nReceitas,
    nVariedades,
    nPlanos,
    nCaixas,
  ] = await Promise.all([
    cnt("torres", () =>
      dbConn.select({ c: count() }).from(torres).where(eq(torres.projetoId, fvpId)),
    ),
    cnt("andares", () =>
      dbConn.select({ c: count() }).from(andares).where(eq(andares.projetoId, fvpId)),
    ),
    cnt("ciclos", () => dbConn.select({ c: count() }).from(ciclos).where(eq(ciclos.projetoId, fvpId))),
    cnt("receitas", () =>
      dbConn.select({ c: count() }).from(receitasCrescimento).where(eq(receitasCrescimento.projetoId, fvpId)),
    ),
    cnt("variedades", () =>
      dbConn.select({ c: count() }).from(variedades).where(eq(variedades.projetoId, fvpId)),
    ),
    cnt("planos", () =>
      dbConn.select({ c: count() }).from(planosPlantio).where(eq(planosPlantio.projetoId, fvpId)),
    ),
    cnt("caixas", () =>
      dbConn.select({ c: count() }).from(caixasAgua).where(eq(caixasAgua.projetoId, fvpId)),
    ),
  ]);
  return {
    torres: nTorres,
    andares: nAndares,
    ciclos: nCiclos,
    receitasCrescimento: nReceitas,
    variedades: nVariedades,
    planosPlantio: nPlanos,
    caixasAgua: nCaixas,
  };
}

/**
 * Consolida **todos** os `projetoId` operacionais distintos (exceto o do próprio legado) para
 * {@link NOME_PROJETO_FAZENDA_LEGADO}. Inclui IDs órfãos (sem linha em `projetos`).
 * 1) Atribui `projetoId` em linhas NULL; 2) une origens uma a uma (erros não abortam tudo); 3) confirma contagens.
 */
export async function migrateAllOperationalDataToFazendaVerticalPrincipal(): Promise<{
  fvpId: number;
  mergedFrom: number[];
  mergeErrors: string[];
  nullRowsUpdated: number;
  verification: LegacyMigrationVerification;
}> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const ensureRes = await ensureIncompleteMultiProjetoSchema();
  if (!ensureRes.ok) throw new Error(ensureRes.reason);
  const fvpId = ensureRes.fvpId;
  const nullRowsUpdated = ensureRes.nullRowsPatched;
  const sourceIds = await collectDistinctOperationalProjetoIdsExcluding(dbConn, fvpId);
  const mergedFrom: number[] = [];
  const mergeErrors: string[] = [];
  for (const fromId of sourceIds) {
    try {
      const exists = await dbConn.select({ id: projetos.id }).from(projetos).where(eq(projetos.id, fromId)).limit(1);
      const orphan = exists.length === 0;
      await reassignOperationalDataBetweenProjetos(fromId, fvpId, { allowMissingSourceProjeto: orphan });
      mergedFrom.push(fromId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      mergeErrors.push(`origem projetoId ${fromId}: ${msg}`);
      console.error(`[Database] migrateAllOperationalDataToFazendaVerticalPrincipal falhou origem=${fromId}`, e);
    }
  }
  await ensureProjetoMembershipsBootstrap();
  const verification = await verifyOperationalDataForFvpProjeto(fvpId);
  return { fvpId, mergedFrom, mergeErrors, nullRowsUpdated, verification };
}

export async function getProjetoById(projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) return undefined;
  const rows = await dbConn.select().from(projetos).where(eq(projetos.id, projetoId)).limit(1);
  return rows[0];
}

export async function getProjetoByIdForUser(userId: number, projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) return undefined;
  const rows = await dbConn
    .select({ projeto: projetos })
    .from(projetoUsuarios)
    .innerJoin(projetos, eq(projetos.id, projetoUsuarios.projetoId))
    .where(and(eq(projetoUsuarios.userId, userId), eq(projetos.id, projetoId)))
    .limit(1);
  return rows[0]?.projeto;
}

/** Projeto ativo + usuário vinculado (para middleware tRPC). */
export async function resolveProjetoForUser(userId: number, projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) return undefined;
  const rows = await dbConn
    .select({ id: projetos.id, tipo: projetos.tipo, status: projetos.status })
    .from(projetoUsuarios)
    .innerJoin(projetos, eq(projetos.id, projetoUsuarios.projetoId))
    .where(
      and(
        eq(projetoUsuarios.userId, userId),
        eq(projetos.id, projetoId),
        eq(projetos.status, "ativo"),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function userHasProjetoAccess(userId: number, projetoId: number): Promise<boolean> {
  const row = await getProjetoByIdForUser(userId, projetoId);
  return row != null;
}

export async function createProjeto(data: InsertProjeto, creatorUserId: number, creatorRole: "admin" | "operador" | "visualizador" = "admin") {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await ensureProjetosTables();
  const usarCaixaAgua = data.tipo === "microverdes" ? Boolean(data.usarCaixaAgua ?? false) : true;
  const payload: InsertProjeto = {
    nome: data.nome,
    tipo: data.tipo,
    status: data.status ?? "ativo",
    descricao: data.descricao ?? null,
    endereco: data.endereco ?? null,
    responsavelId: data.responsavelId ?? null,
    usarCaixaAgua,
  };
  const [ins] = await dbConn.insert(projetos).values(payload);
  const projetoId = Number(ins.insertId);
  await dbConn.insert(projetoUsuarios).values({
    projetoId,
    userId: creatorUserId,
    role: creatorRole,
  } satisfies InsertProjetoUsuario);
  await seedProjetoModulosForNewProjeto(projetoId);
  return { id: projetoId };
}

function mysqlErrnoChain(err: unknown): number | undefined {
  let e: unknown = err;
  for (let i = 0; i < 6 && e != null; i++) {
    if (typeof e === "object" && e !== null && "errno" in e) {
      const n = (e as { errno?: unknown }).errno;
      if (typeof n === "number") return n;
    }
    if (typeof e === "object" && e !== null && "cause" in e) {
      e = (e as { cause?: unknown }).cause;
      continue;
    }
    break;
  }
  return undefined;
}

/** Novos projetos: todos os módulos opcionais começam desligados (contratação explícita). */
export async function seedProjetoModulosForNewProjeto(projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) return;
  const values = MODULOS_CONTRATAVEIS.map((modulo) => ({
    projetoId,
    modulo,
    habilitado: false,
  }));
  try {
    await dbConn.insert(projetoModulos).values(values);
  } catch (e) {
    if (mysqlErrnoChain(e) === 1146) return;
    throw e;
  }
}

/** Mapa de módulos contratados (falta de linha = compat pré-migração: tratado como ligado). */
export async function getProjetoModulosMap(projetoId: number): Promise<Record<ModuloContratavel, boolean>> {
  const base = (): Record<ModuloContratavel, boolean> => ({
    estoque: false,
    automacao: false,
    inteligencia: false,
    visao_cultivo: false,
  });
  const dbConn = await getDb();
  const out = base();
  if (!dbConn) return out;
  let rows: ProjetoModuloRow[];
  try {
    rows = await dbConn.select().from(projetoModulos).where(eq(projetoModulos.projetoId, projetoId));
  } catch (e) {
    /** Base sem migração `projeto_modulos`: mesmo comportamento que zero linhas (tudo ligado). */
    if (mysqlErrnoChain(e) === 1146) {
      for (const k of MODULOS_CONTRATAVEIS) out[k] = true;
      return out;
    }
    throw e;
  }
  if (rows.length === 0) {
    for (const k of MODULOS_CONTRATAVEIS) out[k] = true;
    return out;
  }
  for (const k of MODULOS_CONTRATAVEIS) {
    const r = rows.find((x) => x.modulo === k);
    out[k] = r ? Boolean(r.habilitado) : true;
  }
  return out;
}

export async function setProjetoModuloHabilitado(
  projetoId: number,
  modulo: ModuloContratavel,
  habilitado: boolean,
) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const upsert = () =>
    dbConn
      .insert(projetoModulos)
      .values({ projetoId, modulo, habilitado })
      .onDuplicateKeyUpdate({
        set: { habilitado },
      });

  try {
    await upsert();
  } catch (e) {
    if (mysqlErrnoChain(e) === 1146) {
      await ensureProjetoModulosTable();
      await upsert();
      return;
    }
    throw e;
  }
}

/** Lista todos os projetos (admin global da plataforma). */
export async function listAllProjetosBasico() {
  const dbConn = await getDb();
  if (!dbConn) return [];
  return dbConn
    .select({
      id: projetos.id,
      nome: projetos.nome,
      tipo: projetos.tipo,
      status: projetos.status,
    })
    .from(projetos)
    .orderBy(asc(projetos.nome));
}

export async function updateProjeto(projetoId: number, data: Partial<InsertProjeto>) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  if (data.tipo !== undefined) {
    throw new Error("O tipo do projeto não pode ser alterado após a criação.");
  }
  await dbConn.update(projetos).set(data).where(eq(projetos.id, projetoId));
}

export async function deactivateProjeto(projetoId: number) {
  await updateProjeto(projetoId, { status: "inativo" });
}

export async function reactivateProjeto(projetoId: number) {
  await updateProjeto(projetoId, { status: "ativo" });
}

export async function addProjetoUser(projetoId: number, userId: number, role: InsertProjetoUsuario["role"]) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn.insert(projetoUsuarios).values({ projetoId, userId, role });
}

export async function removeProjetoUser(projetoId: number, userId: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn
    .delete(projetoUsuarios)
    .where(and(eq(projetoUsuarios.projetoId, projetoId), eq(projetoUsuarios.userId, userId)));
}

export async function updateProjetoUserRole(projetoId: number, userId: number, role: InsertProjetoUsuario["role"]) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn
    .update(projetoUsuarios)
    .set({ role })
    .where(and(eq(projetoUsuarios.projetoId, projetoId), eq(projetoUsuarios.userId, userId)));
}

export async function listProjetoUsers(projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) return [];
  return dbConn
    .select({
      id: projetoUsuarios.id,
      userId: projetoUsuarios.userId,
      role: projetoUsuarios.role,
      createdAt: projetoUsuarios.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(projetoUsuarios)
    .innerJoin(users, eq(users.id, projetoUsuarios.userId))
    .where(eq(projetoUsuarios.projetoId, projetoId));
}

/**
 * Cria `projetos` e `projeto_usuarios` se ainda não existirem (bases sem `pnpm db:migrate`).
 * Alinhado à migração 0014 — evita "Failed query" em SELECT/INSERT quando só faltam estas tabelas.
 */
export async function ensureProjetosTables(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  try {
    await dbConn.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`projetos\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`nome\` varchar(255) NOT NULL,
  \`tipo\` enum('fazenda_vertical','hidroponia','microverdes') NOT NULL,
  \`descricao\` text,
  \`endereco\` varchar(500),
  \`responsavelId\` int,
  \`usarCaixaAgua\` tinyint(1) NOT NULL DEFAULT 1,
  \`status\` enum('ativo','inativo','planejamento') NOT NULL DEFAULT 'ativo',
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`projetos_id\` PRIMARY KEY(\`id\`)
)`));
    await dbConn.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`projeto_usuarios\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`userId\` int NOT NULL,
  \`role\` enum('admin','operador','visualizador') NOT NULL DEFAULT 'operador',
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`projeto_usuarios_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`projeto_usuarios_projeto_user\` UNIQUE(\`projetoId\`,\`userId\`)
)`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /ER_TABLE_EXISTS_ERROR/i.test(msg)) return;
    console.error("[Database] ensureProjetosTables CREATE:", err);
    return;
  }
  const fkStmts = [
    "ALTER TABLE `projeto_usuarios` ADD CONSTRAINT `projeto_usuarios_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`)",
    "ALTER TABLE `projeto_usuarios` ADD CONSTRAINT `projeto_usuarios_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`)",
  ];
  for (const stmt of fkStmts) {
    try {
      await dbConn.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const errno = (err as { errno?: number }).errno;
      if (
        errno === 1005 ||
        errno === 1061 ||
        errno === 1826 ||
        /Duplicate foreign key|ER_DUP_KEY|Duplicate key name|already exists|Can't create table/i.test(msg) ||
        /Failed to open the referenced table/i.test(msg)
      ) {
        continue;
      }
      // Drizzle reemite "Failed query" quando a constraint já existe (migração 0014).
      if (/Failed query: ALTER TABLE.*projeto_usuarios.*ADD CONSTRAINT/i.test(msg)) {
        continue;
      }
      console.warn("[Database] ensureProjetosTables FK:", msg);
    }
  }
}

/**
 * Garante `projeto_modulos` + backfill (migração 0023) em bases que não correram `pnpm db:migrate`.
 * Projetos existentes recebem os quatro módulos com `habilitado=1` (INSERT IGNORE, idempotente).
 */
export async function ensureProjetoModulosTable(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  if (!(await tableExists(dbConn, "projetos"))) return;
  try {
    await dbConn.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`projeto_modulos\` (
  \`id\` INT AUTO_INCREMENT NOT NULL,
  \`projetoId\` INT NOT NULL,
  \`modulo\` VARCHAR(32) NOT NULL,
  \`habilitado\` TINYINT(1) NOT NULL DEFAULT 0,
  \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_projeto_modulo\` (\`projetoId\`, \`modulo\`),
  INDEX \`idx_projeto_modulos_projeto\` (\`projetoId\`),
  CONSTRAINT \`fk_projeto_modulos_projeto\` FOREIGN KEY (\`projetoId\`) REFERENCES \`projetos\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /ER_TABLE_EXISTS_ERROR/i.test(msg)) {
      /* ok */
    } else {
      console.error("[Database] ensureProjetoModulosTable CREATE:", err);
      return;
    }
  }
  try {
    await dbConn.execute(sql.raw(`INSERT IGNORE INTO \`projeto_modulos\` (\`projetoId\`, \`modulo\`, \`habilitado\`)
SELECT \`p\`.\`id\`, \`m\`.\`modulo\`, 1
FROM \`projetos\` \`p\`
CROSS JOIN (
  SELECT 'estoque' AS modulo
  UNION ALL SELECT 'automacao'
  UNION ALL SELECT 'inteligencia'
  UNION ALL SELECT 'visao_cultivo'
) AS \`m\``));
  } catch (err: unknown) {
    console.warn("[Database] ensureProjetoModulosTable backfill:", err);
  }
}

/** Enum `microverdes` + coluna `usarCaixaAgua` (bases que só correram `ensureProjetosTables` antigo). */
export async function ensureProjetosMicroverdesSupport(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  if (!(await tableExists(dbConn, "projetos"))) return;
  const run = async (label: string, stmt: string) => {
    try {
      await dbConn.execute(sql.raw(stmt));
    } catch (e) {
      if (isMysqlDuplicateColumnError(e)) return;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Database] ensureProjetosMicroverdesSupport ${label}:`, msg.slice(0, 220));
    }
  };
  await run(
    "tipo_enum_microverdes",
    "ALTER TABLE `projetos` MODIFY COLUMN `tipo` ENUM('fazenda_vertical','hidroponia','microverdes') NOT NULL",
  );
  await run(
    "usarCaixaAgua",
    "ALTER TABLE `projetos` ADD COLUMN `usarCaixaAgua` tinyint(1) NOT NULL DEFAULT 1",
  );
}

export async function getProjetoRow(projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) return undefined;
  const rows = await dbConn.select().from(projetos).where(eq(projetos.id, projetoId)).limit(1);
  return rows[0];
}

/**
 * No arranque ou a pedido (tRPC): garante o projeto legado e liga **todos** os utilizadores a ele
 * (INSERT IGNORE), não só quem ainda não tinha nenhum projeto ativo.
 *
 * Motivo: após multi-projeto, quem já tinha sido associado só a um projeto novo/vazio deixava de ver
 * «Fazenda Vertical Principal», onde a migração 0014 consolidou torres/ciclos — o painel ficava a 0.
 */
export async function ensureProjetoMembershipsBootstrap(): Promise<{ ok: boolean; message?: string }> {
  const dbConn = await getDb();
  if (!dbConn) {
    return { ok: false, message: "Base de dados indisponível (verifique DATABASE_URL)." };
  }
  await ensureProjetosTables();
  try {
    let pid: number;
    const prefer = await dbConn
      .select({ id: projetos.id })
      .from(projetos)
      .where(and(eq(projetos.status, "ativo"), eq(projetos.nome, NOME_PROJETO_FAZENDA_LEGADO)))
      .limit(1);
    if (prefer.length > 0) {
      pid = prefer[0]!.id;
    } else {
      const rows = await dbConn
        .select({ id: projetos.id })
        .from(projetos)
        .where(eq(projetos.status, "ativo"))
        .orderBy(asc(projetos.id))
        .limit(1);
      if (rows.length === 0) {
        const [ins] = await dbConn.insert(projetos).values({
          nome: NOME_PROJETO_FAZENDA_LEGADO,
          tipo: "fazenda_vertical",
          status: "ativo",
          descricao: "Projeto original com os dados existentes do sistema (bootstrap).",
        });
        pid = Number(ins.insertId);
        console.log(`[Database] ensureProjetoMembershipsBootstrap: criado projeto padrão id=${pid}`);
      } else {
        pid = rows[0]!.id;
      }
    }

    /** Liga cada utilizador ao projeto legado (idempotente; não remove outras filiações). */
    await dbConn.execute(
      sql.raw(`INSERT IGNORE INTO projeto_usuarios (projetoId, userId, role)
        SELECT ${pid}, u.id, 'admin' FROM users u`),
    );
    return { ok: true };
  } catch (error) {
    console.warn("[Database] ensureProjetoMembershipsBootstrap:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, message: msg };
  }
}

// ============================================================
// Bancadas (hidroponia)
// ============================================================

/**
 * Garante tabela `bancadas` e colunas (slug/fase/ativa/compartilhada) + índice único.
 * Usa INFORMATION_SCHEMA para não depender de ordem de migrações; cria a tabela se não existir.
 */
export async function ensureBancadasSchemaColumns(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;

  const ignore = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    const errno = (err as { errno?: number }).errno;
    if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return true;
    if (isMysqlDuplicateColumnError(err)) return true;
    if (/Duplicate key name/i.test(msg) || errno === 1061) return true;
    if (errno === 1826 || /Duplicate foreign key constraint name/i.test(msg)) return true;
    if (/Duplicate foreign key/i.test(msg)) return true;
    return false;
  };

  const run = async (stmt: string) => {
    try {
      await dbConn.execute(sql.raw(stmt));
    } catch (err: unknown) {
      if (ignore(err)) return;
      console.error("[Database] ensureBancadasSchemaColumns:", err);
    }
  };

  if (!(await tableExists(dbConn, "bancadas"))) {
    try {
      await dbConn.execute(sql.raw(`CREATE TABLE \`bancadas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`slug\` varchar(64) NOT NULL,
  \`nome\` varchar(255) NOT NULL,
  \`codigo\` varchar(50),
  \`fase\` varchar(32) NOT NULL DEFAULT 'vegetativa',
  \`quantidadeCaixas\` int NOT NULL DEFAULT 1,
  \`tipoCultivo\` varchar(100),
  \`comprimentoMetros\` decimal(5,2),
  \`status\` enum('ativa','inativa','manutencao') NOT NULL DEFAULT 'ativa',
  \`ativa\` tinyint(1) NOT NULL DEFAULT 1,
  \`compartilhada\` tinyint(1) NOT NULL DEFAULT 0,
  \`plantioVariedadeId\` int,
  \`plantioDataEntrada\` timestamp NULL,
  \`plantioPrevisaoColheita\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`bancadas_id\` PRIMARY KEY(\`id\`),
  UNIQUE KEY \`bancadas_projeto_slug\` (\`projetoId\`,\`slug\`)
)`));
    } catch (err: unknown) {
      console.error("[Database] ensureBancadasSchemaColumns CREATE TABLE bancadas:", err);
    }
    /* Não retornar: continuar para criar `caixas_bancada` / medições / aplicações quando aplicável. */
  }

  if (!(await columnExists(dbConn, "bancadas", "slug"))) {
    await run("ALTER TABLE `bancadas` ADD COLUMN `slug` varchar(64) NULL");
    try {
      await dbConn.execute(
        sql.raw("UPDATE `bancadas` SET `slug` = CONCAT('banc-', `id`) WHERE `slug` IS NULL OR `slug` = ''"),
      );
    } catch (err: unknown) {
      if (!ignore(err)) console.warn("[Database] ensureBancadasSchemaColumns backfill slug:", err);
    }
    await run("ALTER TABLE `bancadas` MODIFY `slug` varchar(64) NOT NULL");
  }
  if (!(await columnExists(dbConn, "bancadas", "fase"))) {
    await run("ALTER TABLE `bancadas` ADD COLUMN `fase` varchar(32) NOT NULL DEFAULT 'vegetativa'");
  }
  if (!(await columnExists(dbConn, "bancadas", "ativa"))) {
    await run("ALTER TABLE `bancadas` ADD COLUMN `ativa` tinyint(1) NOT NULL DEFAULT 1");
  }
  if (!(await columnExists(dbConn, "bancadas", "compartilhada"))) {
    await run("ALTER TABLE `bancadas` ADD COLUMN `compartilhada` tinyint(1) NOT NULL DEFAULT 0");
  }
  if (!(await columnExists(dbConn, "bancadas", "plantioVariedadeId"))) {
    await run("ALTER TABLE `bancadas` ADD COLUMN `plantioVariedadeId` int NULL");
  }
  if (!(await columnExists(dbConn, "bancadas", "plantioDataEntrada"))) {
    await run("ALTER TABLE `bancadas` ADD COLUMN `plantioDataEntrada` timestamp NULL");
  }
  if (!(await columnExists(dbConn, "bancadas", "plantioPrevisaoColheita"))) {
    await run("ALTER TABLE `bancadas` ADD COLUMN `plantioPrevisaoColheita` timestamp NULL");
  }
  await run("CREATE UNIQUE INDEX `bancadas_projeto_slug` ON `bancadas` (`projetoId`, `slug`)");

  /** Tabelas 0014 usadas por `syncCaixasBancadaForBancada` — podem faltar se só `bancadas` foi criada aqui. */
  const ensureBancadaChildTable = async (name: string, ddl: string) => {
    if (await tableExists(dbConn, name)) return;
    try {
      await dbConn.execute(sql.raw(ddl));
    } catch (err: unknown) {
      if (!ignore(err)) console.error(`[Database] ensureBancadasSchemaColumns CREATE ${name}:`, err);
    }
  };

  await ensureBancadaChildTable(
    "caixas_bancada",
    `CREATE TABLE \`caixas_bancada\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`bancadaId\` int NOT NULL,
  \`projetoId\` int NOT NULL,
  \`posicao\` int NOT NULL,
  \`variedadeId\` int,
  \`status\` enum('vazia','plantada','germinando','colheita') NOT NULL DEFAULT 'vazia',
  \`dataPlantio\` timestamp NULL,
  \`dataPrevisaoColheita\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`caixas_bancada_id\` PRIMARY KEY(\`id\`)
)`,
  );

  await ensureBancadaChildTable(
    "medicoes_bancada",
    `CREATE TABLE \`medicoes_bancada\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`bancadaId\` int NOT NULL,
  \`projetoId\` int NOT NULL,
  \`ph\` decimal(4,2),
  \`ec\` decimal(5,2),
  \`temperaturaAgua\` decimal(4,1),
  \`temperaturaAmbiente\` decimal(4,1),
  \`umidade\` decimal(4,1),
  \`observacoes\` text,
  \`medidoPor\` int,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`medicoes_bancada_id\` PRIMARY KEY(\`id\`)
)`,
  );

  await ensureBancadaChildTable(
    "aplicacoes_bancada",
    `CREATE TABLE \`aplicacoes_bancada\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`bancadaId\` int NOT NULL,
  \`projetoId\` int NOT NULL,
  \`tipoAplicacao\` varchar(100) NOT NULL,
  \`produto\` varchar(255) NOT NULL,
  \`quantidade\` decimal(10,3),
  \`unidade\` varchar(20),
  \`observacoes\` text,
  \`aplicadoPor\` int,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`aplicacoes_bancada_id\` PRIMARY KEY(\`id\`)
)`,
  );

  if (await tableExists(dbConn, "projetos")) {
    await run(
      "ALTER TABLE `bancadas` ADD CONSTRAINT `bancadas_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`)",
    );
    await run(
      "ALTER TABLE `caixas_bancada` ADD CONSTRAINT `caixas_bancada_bancada_fk` FOREIGN KEY (`bancadaId`) REFERENCES `bancadas`(`id`)",
    );
    await run(
      "ALTER TABLE `caixas_bancada` ADD CONSTRAINT `caixas_bancada_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`)",
    );
    await run(
      "ALTER TABLE `medicoes_bancada` ADD CONSTRAINT `medicoes_bancada_bancada_fk` FOREIGN KEY (`bancadaId`) REFERENCES `bancadas`(`id`)",
    );
    await run(
      "ALTER TABLE `medicoes_bancada` ADD CONSTRAINT `medicoes_bancada_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`)",
    );
    await run(
      "ALTER TABLE `aplicacoes_bancada` ADD CONSTRAINT `aplicacoes_bancada_bancada_fk` FOREIGN KEY (`bancadaId`) REFERENCES `bancadas`(`id`)",
    );
    await run(
      "ALTER TABLE `aplicacoes_bancada` ADD CONSTRAINT `aplicacoes_bancada_projeto_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`)",
    );
  }
  if (await tableExists(dbConn, "caixas_bancada")) {
    await run("CREATE INDEX `idx_caixas_bancada_projeto` ON `caixas_bancada` (`projetoId`)");
  }
}

export async function getAllBancadas(projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) return [];
  return dbConn.select().from(bancadas).where(eq(bancadas.projetoId, projetoId));
}

export async function getBancadaById(projetoId: number, id: number) {
  const dbConn = await getDb();
  if (!dbConn) return undefined;
  const rows = await dbConn
    .select()
    .from(bancadas)
    .where(and(eq(bancadas.projetoId, projetoId), eq(bancadas.id, id)))
    .limit(1);
  return rows[0];
}

function slugifyBancadaNome(nome: string): string {
  const s = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, 48) || "bancada";
}

export async function generateUniqueBancadaSlug(projetoId: number, nome: string): Promise<string> {
  await ensureBancadasSchemaColumns();
  const base = slugifyBancadaNome(nome);
  const dbConn = await getDb();
  if (!dbConn) return `${base}-${Date.now().toString(36)}`;
  for (let n = 0; n < 60; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const exists = await dbConn
      .select({ id: bancadas.id })
      .from(bancadas)
      .where(and(eq(bancadas.projetoId, projetoId), eq(bancadas.slug, candidate)))
      .limit(1);
    if (exists.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createBancada(data: InsertBancada) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const [r] = await dbConn.insert(bancadas).values(data);
  return { id: Number(r.insertId) };
}

export async function createBancadaWithDefaults(
  projetoId: number,
  input: {
    nome: string;
    fase: string;
    codigo?: string | null;
    quantidadeCaixas: number;
    tipoCultivo?: string | null;
    comprimentoMetros?: string | null;
    compartilhada?: boolean;
  },
): Promise<{ id: number }> {
  const slug = await generateUniqueBancadaSlug(projetoId, input.nome);
  const r = await createBancada({
    projetoId,
    slug,
    nome: input.nome.trim(),
    fase: input.fase,
    codigo: input.codigo ?? null,
    quantidadeCaixas: input.quantidadeCaixas,
    tipoCultivo: input.tipoCultivo ?? null,
    comprimentoMetros: input.comprimentoMetros ?? null,
    compartilhada: input.compartilhada ?? false,
    status: "ativa",
    ativa: true,
  });
  await syncCaixasBancadaForBancada(projetoId, r.id, input.quantidadeCaixas);
  return r;
}

export async function deleteBancada(projetoId: number, id: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn
    .delete(medicoesBancada)
    .where(and(eq(medicoesBancada.projetoId, projetoId), eq(medicoesBancada.bancadaId, id)));
  await dbConn
    .delete(aplicacoesBancada)
    .where(and(eq(aplicacoesBancada.projetoId, projetoId), eq(aplicacoesBancada.bancadaId, id)));
  await dbConn.delete(caixasBancada).where(and(eq(caixasBancada.projetoId, projetoId), eq(caixasBancada.bancadaId, id)));
  await dbConn.delete(bancadas).where(and(eq(bancadas.projetoId, projetoId), eq(bancadas.id, id)));
}

export async function updateBancada(projetoId: number, id: number, data: Partial<InsertBancada>) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn
    .update(bancadas)
    .set(data)
    .where(and(eq(bancadas.projetoId, projetoId), eq(bancadas.id, id)));
}

export async function updateBancadaQuantidadeCaixas(projetoId: number, id: number, quantidadeCaixas: number) {
  await updateBancada(projetoId, id, { quantidadeCaixas });
  await syncCaixasBancadaForBancada(projetoId, id, quantidadeCaixas);
}

/** Garante linhas em `caixas_bancada` com posição 1..quantidade (remove excedentes com posição > quantidade). */
export async function syncCaixasBancadaForBancada(
  projetoId: number,
  bancadaId: number,
  quantidade: number,
): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const q = Math.max(1, Math.floor(Number(quantidade)) || 1);
  const existing = await dbConn
    .select()
    .from(caixasBancada)
    .where(and(eq(caixasBancada.projetoId, projetoId), eq(caixasBancada.bancadaId, bancadaId)))
    .orderBy(asc(caixasBancada.posicao));
  const n = existing.length;
  for (let p = n + 1; p <= q; p++) {
    await dbConn.insert(caixasBancada).values({
      projetoId,
      bancadaId,
      posicao: p,
      status: "vazia",
    });
  }
  if (n > q) {
    await dbConn
      .delete(caixasBancada)
      .where(
        and(
          eq(caixasBancada.projetoId, projetoId),
          eq(caixasBancada.bancadaId, bancadaId),
          gt(caixasBancada.posicao, q),
        ),
      );
  }
}

export async function getCaixasByBancadaId(projetoId: number, bancadaId: number) {
  const dbConn = await getDb();
  if (!dbConn) return [];
  return dbConn
    .select()
    .from(caixasBancada)
    .where(and(eq(caixasBancada.projetoId, projetoId), eq(caixasBancada.bancadaId, bancadaId)))
    .orderBy(asc(caixasBancada.posicao));
}

export async function getCaixaBancadaById(projetoId: number, id: number) {
  const dbConn = await getDb();
  if (!dbConn) return undefined;
  const rows = await dbConn
    .select()
    .from(caixasBancada)
    .where(and(eq(caixasBancada.projetoId, projetoId), eq(caixasBancada.id, id)))
    .limit(1);
  return rows[0];
}

export async function updateCaixaBancada(projetoId: number, id: number, data: Partial<InsertCaixaBancada>) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn
    .update(caixasBancada)
    .set(data)
    .where(and(eq(caixasBancada.projetoId, projetoId), eq(caixasBancada.id, id)));
}

export async function getMedicoesByBancadaId(projetoId: number, bancadaId: number) {
  const dbConn = await getDb();
  if (!dbConn) return [];
  return dbConn
    .select()
    .from(medicoesBancada)
    .where(and(eq(medicoesBancada.projetoId, projetoId), eq(medicoesBancada.bancadaId, bancadaId)))
    .orderBy(desc(medicoesBancada.createdAt));
}

export async function createMedicaoBancada(
  data: Pick<InsertMedicaoBancada, "projetoId" | "bancadaId"> & {
    ec: number;
    ph: number;
    temperaturaAgua?: number | null;
    temperaturaAmbiente?: number | null;
    umidade?: number | null;
    observacoes?: string | null;
    medidoPor?: number | null;
  },
) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const [r] = await dbConn.insert(medicoesBancada).values({
    projetoId: data.projetoId,
    bancadaId: data.bancadaId,
    ec: String(data.ec),
    ph: String(data.ph),
    temperaturaAgua: data.temperaturaAgua != null ? String(data.temperaturaAgua) : null,
    temperaturaAmbiente: data.temperaturaAmbiente != null ? String(data.temperaturaAmbiente) : null,
    umidade: data.umidade != null ? String(data.umidade) : null,
    observacoes: data.observacoes ?? null,
    medidoPor: data.medidoPor ?? null,
  });
  return { id: Number(r.insertId) };
}

export async function deleteMedicaoBancada(projetoId: number, id: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn.delete(medicoesBancada).where(and(eq(medicoesBancada.projetoId, projetoId), eq(medicoesBancada.id, id)));
}

export async function getAplicacoesByBancadaId(projetoId: number, bancadaId: number) {
  const dbConn = await getDb();
  if (!dbConn) return [];
  return dbConn
    .select()
    .from(aplicacoesBancada)
    .where(and(eq(aplicacoesBancada.projetoId, projetoId), eq(aplicacoesBancada.bancadaId, bancadaId)))
    .orderBy(desc(aplicacoesBancada.createdAt));
}

export async function createAplicacaoBancada(
  data: Pick<InsertAplicacaoBancada, "projetoId" | "bancadaId" | "tipoAplicacao" | "produto"> & {
    quantidade?: number | null;
    unidade?: string | null;
    observacoes?: string | null;
    aplicadoPor?: number | null;
  },
) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const [r] = await dbConn.insert(aplicacoesBancada).values({
    projetoId: data.projetoId,
    bancadaId: data.bancadaId,
    tipoAplicacao: data.tipoAplicacao,
    produto: data.produto,
    quantidade: data.quantidade != null ? String(data.quantidade) : null,
    unidade: data.unidade ?? null,
    observacoes: data.observacoes ?? null,
    aplicadoPor: data.aplicadoPor ?? null,
  });
  return { id: Number(r.insertId) };
}

export async function deleteAplicacaoBancada(projetoId: number, id: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  await dbConn
    .delete(aplicacoesBancada)
    .where(and(eq(aplicacoesBancada.projetoId, projetoId), eq(aplicacoesBancada.id, id)));
}

// ============================================================
// Variedades
// ============================================================

export async function getAllVariedades(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(variedades).where(eq(variedades.projetoId, projetoId));
}

export async function getVariedadeBySlug(projetoId: number, slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(variedades)
    .where(and(eq(variedades.projetoId, projetoId), eq(variedades.slug, slug)))
    .limit(1);
  return result[0];
}

export async function getVariedadeById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(variedades)
    .where(and(eq(variedades.projetoId, projetoId), eq(variedades.id, id)))
    .limit(1);
  return result[0];
}

export async function createVariedade(data: InsertVariedade) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(variedades).values(data);
  return { id: result[0].insertId };
}

export async function updateVariedade(projetoId: number, id: number, data: Partial<InsertVariedade>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(variedades)
    .set(data)
    .where(and(eq(variedades.projetoId, projetoId), eq(variedades.id, id)));
}

export async function deleteVariedade(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(variedades).where(and(eq(variedades.projetoId, projetoId), eq(variedades.id, id)));
}

// ============================================================
// Fases Config
// ============================================================

export async function getAllFasesConfig(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fasesConfig).where(eq(fasesConfig.projetoId, projetoId));
}

export async function upsertFaseConfig(data: InsertFaseConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fasesConfig).values(data).onDuplicateKeyUpdate({
    set: {
      label: data.label,
      ecMin: data.ecMin,
      ecMax: data.ecMax,
      phMin: data.phMin,
      phMax: data.phMax,
      cor: data.cor,
      corLight: data.corLight,
      icon: data.icon,
    },
  });
}

// ============================================================
// Torres
// ============================================================

export async function getAllTorres(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(torres).where(eq(torres.projetoId, projetoId));
}

export async function getTorreById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(torres)
    .where(and(eq(torres.projetoId, projetoId), eq(torres.id, id)))
    .limit(1);
  return result[0];
}

export async function getTorreBySlug(projetoId: number, slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(torres)
    .where(and(eq(torres.projetoId, projetoId), eq(torres.slug, slug)))
    .limit(1);
  return result[0];
}

/** Próximo número operacional livre no projeto (1…N). */
export async function getNextNumeroTorre(projetoId: number): Promise<number> {
  const dbConn = await getDb();
  if (!dbConn) return 1;
  const [row] = await dbConn
    .select({ mx: max(torres.numeroTorre) })
    .from(torres)
    .where(eq(torres.projetoId, projetoId));
  const n = Number(row?.mx);
  return (Number.isFinite(n) ? n : 0) + 1;
}

export async function getTorreByProjetoNumero(projetoId: number, numeroTorre: number) {
  const dbConn = await getDb();
  if (!dbConn) return undefined;
  const rows = await dbConn
    .select()
    .from(torres)
    .where(and(eq(torres.projetoId, projetoId), eq(torres.numeroTorre, numeroTorre)))
    .limit(1);
  return rows[0];
}

export async function createTorre(data: InsertTorre) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(torres).values(data);
  return { id: result[0].insertId };
}

/** Cria torre + andares + perfis + furos conforme a fase (igual ao seed admin). Opcional: caixa existente; senão cria uma caixa dedicada. */
export async function createTorreComEstrutura(params: {
  projetoId: number;
  slug: string;
  nome: string;
  fase: Fase;
  numAndares: number;
  caixaAguaId?: number | null;
  numeroTorre: number;
  estruturaOverrideJson?: string | null;
}): Promise<{ id: number }> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const { projetoId } = params;

  let caixaId: number | null = params.caixaAguaId ?? null;
  if (caixaId == null) {
    const slugBase = params.nome
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40);
    const caixaSlug = `ca-${slugBase || "torre"}-${Date.now().toString(36)}`;
    const caixaNome = `Caixa ${params.nome}`.slice(0, 128);
    const created = await createCaixaAgua({
      projetoId,
      slug: caixaSlug,
      nome: caixaNome,
      fase: params.fase,
    });
    caixaId = created.id;
  }

  const torreResult = await dbConn.insert(torres).values({
    projetoId,
    slug: params.slug,
    nome: params.nome,
    fase: params.fase,
    numeroTorre: params.numeroTorre,
    estruturaOverrideJson: params.estruturaOverrideJson ?? null,
    numAndares: params.numAndares,
    caixaAguaId: caixaId,
    ativa: true,
  });
  const torreId = Number(torreResult[0].insertId);

  const projRow = await getProjetoRow(projetoId);
  const ov = parseTorreEstruturaOverrideJson(params.estruturaOverrideJson ?? null);
  const est = estruturaFaseParaProjeto(projRow?.tipo as "fazenda_vertical" | "hidroponia" | "microverdes" | undefined, params.fase, ov);
  for (let a = 1; a <= params.numAndares; a++) {
    const andarResult = await dbConn.insert(andares).values({
      projetoId,
      torreId,
      numero: a,
      lavado: true,
    });
    const andarId = Number(andarResult[0].insertId);

    const perfilData = Array.from({ length: est.perfis }, (_, i) => ({
      projetoId,
      andarId,
      perfilIndex: i,
      ativo: false,
    }));
    if (perfilData.length > 0) await dbConn.insert(perfis).values(perfilData);

    if (est.furosPorPerfil > 0) {
      const furoData: { projetoId: number; andarId: number; perfilIndex: number; furoIndex: number; status: string }[] = [];
      for (let p = 0; p < est.perfis; p++) {
        for (let f = 0; f < est.furosPorPerfil; f++) {
          furoData.push({ projetoId, andarId, perfilIndex: p, furoIndex: f, status: "vazio" });
        }
      }
      if (furoData.length > 0) await dbConn.insert(furos).values(furoData);
    }
  }

  return { id: torreId };
}

type DbConn = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Remove um andar e referências dependentes (mantém a torre). */
async function deleteAndarCascade(
  dbConn: DbConn,
  projetoId: number,
  torreId: number,
  andarId: number,
  andarNumero: number,
): Promise<void> {
  await dbConn.delete(registrosColheita).where(and(eq(registrosColheita.projetoId, projetoId), eq(registrosColheita.andarId, andarId)));

  await dbConn.delete(tarefas).where(
    and(eq(tarefas.projetoId, projetoId), eq(tarefas.torreId, torreId), eq(tarefas.andarNumero, andarNumero)),
  );

  await dbConn.delete(manutencoes).where(
    and(eq(manutencoes.projetoId, projetoId), eq(manutencoes.torreId, torreId), eq(manutencoes.andarNumero, andarNumero)),
  );

  await dbConn.delete(transplantios).where(
    and(
      eq(transplantios.projetoId, projetoId),
      or(eq(transplantios.andarOrigemId, andarId), eq(transplantios.andarDestinoId, andarId)),
    ),
  );

  await dbConn
    .delete(planosPlantio)
    .where(and(eq(planosPlantio.projetoId, projetoId), eq(planosPlantio.andarDestinoId, andarId)));

  const alertRows = await dbConn
    .select({ id: intelligentAlerts.id })
    .from(intelligentAlerts)
    .where(
      and(
        eq(intelligentAlerts.projetoId, projetoId),
        eq(intelligentAlerts.entidadeTipo, "andar"),
        eq(intelligentAlerts.entidadeId, andarId),
      ),
    );
  const alertIds = alertRows.map((r) => r.id);
  if (alertIds.length > 0) {
    await dbConn.delete(alertEvents).where(and(eq(alertEvents.projetoId, projetoId), inArray(alertEvents.alertaId, alertIds)));
    await dbConn.delete(intelligentAlerts).where(and(eq(intelligentAlerts.projetoId, projetoId), inArray(intelligentAlerts.id, alertIds)));
  }

  await dbConn.delete(aplicacoesAndar).where(and(eq(aplicacoesAndar.projetoId, projetoId), eq(aplicacoesAndar.andarId, andarId)));
  await dbConn.delete(furos).where(and(eq(furos.projetoId, projetoId), eq(furos.andarId, andarId)));
  await dbConn.delete(perfis).where(and(eq(perfis.projetoId, projetoId), eq(perfis.andarId, andarId)));
  await dbConn.delete(andares).where(and(eq(andares.projetoId, projetoId), eq(andares.id, andarId)));
}

/**
 * Garante que existem exactamente `targetNum` andares (números 1..N) com perfis/furos conforme a fase da torre.
 * Remove andares com numero > target; cria os que faltam até target.
 */
export async function syncTorreAndaresToNumAndares(projetoId: number, torreId: number, targetNum: number): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const torre = await getTorreById(projetoId, torreId);
  if (!torre) throw new Error("Torre não encontrada");
  const target = Math.max(1, Math.floor(Number(targetNum)) || 1);

  const listDesc = await dbConn
    .select()
    .from(andares)
    .where(and(eq(andares.projetoId, projetoId), eq(andares.torreId, torreId)))
    .orderBy(desc(andares.numero));

  for (const a of listDesc) {
    if (a.numero > target) {
      await deleteAndarCascade(dbConn, projetoId, torreId, a.id, a.numero);
    }
  }

  const after = await dbConn
    .select()
    .from(andares)
    .where(and(eq(andares.projetoId, projetoId), eq(andares.torreId, torreId)))
    .orderBy(asc(andares.numero));

  const maxNum = after.length > 0 ? Math.max(...after.map((x) => x.numero)) : 0;
  const projRow = await getProjetoRow(projetoId);
  const ov = parseTorreEstruturaOverrideJson(torre.estruturaOverrideJson ?? null);
  const est = estruturaFaseParaProjeto(projRow?.tipo as "fazenda_vertical" | "hidroponia" | "microverdes" | undefined, torre.fase as Fase, ov);

  for (let n = maxNum + 1; n <= target; n++) {
    const andarResult = await dbConn.insert(andares).values({
      projetoId,
      torreId,
      numero: n,
      lavado: true,
    });
    const andarId = Number(andarResult[0].insertId);

    const perfilData = Array.from({ length: est.perfis }, (_, i) => ({
      projetoId,
      andarId,
      perfilIndex: i,
      ativo: false,
    }));
    if (perfilData.length > 0) await dbConn.insert(perfis).values(perfilData);

    if (est.furosPorPerfil > 0) {
      const furoData: { projetoId: number; andarId: number; perfilIndex: number; furoIndex: number; status: string }[] = [];
      for (let p = 0; p < est.perfis; p++) {
        for (let f = 0; f < est.furosPorPerfil; f++) {
          furoData.push({ projetoId, andarId, perfilIndex: p, furoIndex: f, status: "vazio" });
        }
      }
      if (furoData.length > 0) await dbConn.insert(furos).values(furoData);
    }
  }
}

export async function updateTorre(projetoId: number, id: number, updates: Partial<InsertTorre>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(torres).set(updates).where(and(eq(torres.projetoId, projetoId), eq(torres.id, id)));
  return getTorreById(projetoId, id);
}

export async function toggleTorreAtiva(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const torre = await getTorreById(projetoId, id);
  if (!torre) throw new Error("Torre not found");
  await db.update(torres).set({ ativa: !torre.ativa }).where(and(eq(torres.projetoId, projetoId), eq(torres.id, id)));
  return getTorreById(projetoId, id);
}

export async function deleteTorre(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const torre = await getTorreById(projetoId, id);
  if (!torre) throw new Error("Torre não encontrada");

  const andaresList = await getAndaresByTorreId(projetoId, id);
  const andarIds = andaresList.map((a) => a.id);

  await db.delete(registrosColheita).where(and(eq(registrosColheita.projetoId, projetoId), eq(registrosColheita.torreId, id)));

  await db.delete(tarefas).where(and(eq(tarefas.projetoId, projetoId), eq(tarefas.torreId, id)));

  await db.delete(manutencoes).where(and(eq(manutencoes.projetoId, projetoId), eq(manutencoes.torreId, id)));

  const tpParts = [
    eq(transplantios.torreOrigemId, id),
    eq(transplantios.torreDestinoId, id),
  ];
  if (andarIds.length > 0) {
    tpParts.push(inArray(transplantios.andarOrigemId, andarIds));
    tpParts.push(inArray(transplantios.andarDestinoId, andarIds));
  }
  await db.delete(transplantios).where(and(eq(transplantios.projetoId, projetoId), or(...tpParts)));

  const planoParts = [eq(planosPlantio.torreDestinoId, id)];
  if (andarIds.length > 0) planoParts.push(inArray(planosPlantio.andarDestinoId, andarIds));
  await db.delete(planosPlantio).where(and(eq(planosPlantio.projetoId, projetoId), or(...planoParts)));

  const alertWhereInner =
    andarIds.length > 0
      ? or(
          and(eq(intelligentAlerts.entidadeTipo, "torre"), eq(intelligentAlerts.entidadeId, id)),
          and(eq(intelligentAlerts.entidadeTipo, "andar"), inArray(intelligentAlerts.entidadeId, andarIds)),
        )
      : and(eq(intelligentAlerts.entidadeTipo, "torre"), eq(intelligentAlerts.entidadeId, id));
  const alertWhere = and(eq(intelligentAlerts.projetoId, projetoId), alertWhereInner);
  const alertRows = await db.select({ id: intelligentAlerts.id }).from(intelligentAlerts).where(alertWhere);
  const alertIds = alertRows.map((r) => r.id);
  if (alertIds.length > 0) {
    await db.delete(alertEvents).where(and(eq(alertEvents.projetoId, projetoId), inArray(alertEvents.alertaId, alertIds)));
    await db.delete(intelligentAlerts).where(and(eq(intelligentAlerts.projetoId, projetoId), inArray(intelligentAlerts.id, alertIds)));
  }

  if (andarIds.length > 0) {
    await db.delete(aplicacoesAndar).where(and(eq(aplicacoesAndar.projetoId, projetoId), inArray(aplicacoesAndar.andarId, andarIds)));
    await db.delete(furos).where(and(eq(furos.projetoId, projetoId), inArray(furos.andarId, andarIds)));
    await db.delete(perfis).where(and(eq(perfis.projetoId, projetoId), inArray(perfis.andarId, andarIds)));
    await db.delete(andares).where(and(eq(andares.projetoId, projetoId), eq(andares.torreId, id)));
  }

  const caixaIdOrfa = torre.caixaAguaId;
  await db.delete(torres).where(and(eq(torres.projetoId, projetoId), eq(torres.id, id)));

  if (caixaIdOrfa != null) {
    const outras = await db
      .select({ id: torres.id })
      .from(torres)
      .where(and(eq(torres.projetoId, projetoId), eq(torres.caixaAguaId, caixaIdOrfa)))
      .limit(1);
    if (outras.length === 0) {
      await db.delete(tarefas).where(and(eq(tarefas.projetoId, projetoId), eq(tarefas.caixaAguaId, caixaIdOrfa)));
      await db.delete(medicoesCaixa).where(and(eq(medicoesCaixa.projetoId, projetoId), eq(medicoesCaixa.caixaAguaId, caixaIdOrfa)));
      await db.delete(aplicacoesCaixa).where(and(eq(aplicacoesCaixa.projetoId, projetoId), eq(aplicacoesCaixa.caixaAguaId, caixaIdOrfa)));
      await db.delete(caixasAgua).where(and(eq(caixasAgua.projetoId, projetoId), eq(caixasAgua.id, caixaIdOrfa)));
    }
  }

  return { success: true };
}

// ============================================================
// Estoque (insumos)
// ============================================================

export async function getAllEstoqueItens(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(estoqueItens)
    .where(eq(estoqueItens.projetoId, projetoId))
    .orderBy(asc(estoqueItens.categoria), asc(estoqueItens.nome));
}

export async function getEstoqueItemById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(estoqueItens)
    .where(and(eq(estoqueItens.projetoId, projetoId), eq(estoqueItens.id, id)))
    .limit(1);
  return r[0];
}

const INSERT_ESTOQUE_ITENS = `INSERT INTO estoque_itens (
  projetoId, categoria, nome, quantidadeTotal, unidadeTipo, usoPorEvento, frequenciaDias,
  prazoEntregaDias, diasMargemCompra, nivelMinimo, precoUnitario, fornecedor, observacoes
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;

/** O mesmo pool que o Drizzle usa (callback pool); executamos INSERT cru com bindings explícitos. */
function getMysqlPoolPromise(dbConn: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const raw = (dbConn as unknown as { $client: Mysql2Pool }).$client;
  if (raw && typeof (raw as Mysql2Pool & { promise?: () => unknown }).promise === "function") {
    return (raw as Mysql2Pool & { promise: () => import("mysql2/promise").Pool }).promise();
  }
  throw new Error("Pool mysql2 sem .promise() — atualize mysql2");
}

export async function createEstoqueItem(data: InsertEstoqueItem) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const nivelOk = data.nivelMinimo != null && Number.isFinite(data.nivelMinimo);
  const precoOk = data.precoUnitario != null && Number.isFinite(data.precoUnitario);
  const forn = data.fornecedor?.trim() ? data.fornecedor.trim() : null;
  const obs = data.observacoes?.trim() ? data.observacoes.trim() : null;

  const pid = data.projetoId;
  if (pid == null || !Number.isFinite(pid)) {
    throw new Error("projetoId é obrigatório em createEstoqueItem");
  }
  const params: unknown[] = [
    pid,
    data.categoria,
    data.nome,
    Number(data.quantidadeTotal),
    data.unidadeTipo ?? "unidade",
    Number(data.usoPorEvento),
    Number(data.frequenciaDias),
    Number(data.prazoEntregaDias),
    Number(data.diasMargemCompra),
    nivelOk ? data.nivelMinimo! : null,
    precoOk ? data.precoUnitario! : null,
    forn,
    obs,
  ];
  if (params.length !== 13) {
    throw new Error(`Invariant: esperados 13 parâmetros no INSERT estoque, recebidos ${params.length}`);
  }

  const pool = getMysqlPoolPromise(dbConn);
  const [header] = await pool.execute<ResultSetHeader>(
    INSERT_ESTOQUE_ITENS,
    params as (string | number | null | boolean | Date | Buffer)[],
  );
  const insertId = Number(header.insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new Error("INSERT estoque_itens não devolveu insertId");
  }
  return { id: insertId };
}

export async function updateEstoqueItem(projetoId: number, id: number, data: Partial<InsertEstoqueItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(estoqueItens)
    .set(data)
    .where(and(eq(estoqueItens.projetoId, projetoId), eq(estoqueItens.id, id)));
  return getEstoqueItemById(projetoId, id);
}

export async function deleteEstoqueItem(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(estoqueItens).where(and(eq(estoqueItens.projetoId, projetoId), eq(estoqueItens.id, id)));
  return { success: true };
}

// ============================================================
// Caixas d'Água
// ============================================================

export async function getAllCaixasAgua(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caixasAgua).where(eq(caixasAgua.projetoId, projetoId));
}

export async function getCaixaAguaById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(caixasAgua)
    .where(and(eq(caixasAgua.projetoId, projetoId), eq(caixasAgua.id, id)))
    .limit(1);
  return rows[0];
}

export async function createCaixaAgua(data: InsertCaixaAgua) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(caixasAgua).values(data);
  return { id: result[0].insertId };
}

// ============================================================
// Medições Caixa
// ============================================================

export async function getMedicoesByCaixaId(projetoId: number, caixaAguaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(medicoesCaixa)
    .where(and(eq(medicoesCaixa.projetoId, projetoId), eq(medicoesCaixa.caixaAguaId, caixaAguaId)));
}

export async function createMedicaoCaixa(data: InsertMedicaoCaixa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(medicoesCaixa).values(data);
  return { id: result[0].insertId };
}

export async function deleteMedicaoCaixa(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(medicoesCaixa).where(and(eq(medicoesCaixa.projetoId, projetoId), eq(medicoesCaixa.id, id)));
}

// ============================================================
// Aplicações Caixa
// ============================================================

export async function getAplicacoesByCaixaId(projetoId: number, caixaAguaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aplicacoesCaixa)
    .where(and(eq(aplicacoesCaixa.projetoId, projetoId), eq(aplicacoesCaixa.caixaAguaId, caixaAguaId)));
}

export async function createAplicacaoCaixa(data: InsertAplicacaoCaixa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aplicacoesCaixa).values(data);
  return { id: result[0].insertId };
}

export async function deleteAplicacaoCaixa(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aplicacoesCaixa).where(and(eq(aplicacoesCaixa.projetoId, projetoId), eq(aplicacoesCaixa.id, id)));
}

// ============================================================
// Andares
// ============================================================

export async function getAllAndares(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(andares).where(eq(andares.projetoId, projetoId));
}

export async function getAndaresByTorreId(projetoId: number, torreId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(andares)
    .where(and(eq(andares.projetoId, projetoId), eq(andares.torreId, torreId)))
    .orderBy(asc(andares.numero));
}

export async function getAndarById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(andares)
    .where(and(eq(andares.projetoId, projetoId), eq(andares.id, id)))
    .limit(1);
  return result[0];
}

export async function updateAndar(projetoId: number, id: number, data: Partial<InsertAndar>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(andares).set(data).where(and(eq(andares.projetoId, projetoId), eq(andares.id, id)));
}

// ============================================================
// Perfis
// ============================================================

export async function getPerfisByAndarId(projetoId: number, andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(perfis)
    .where(and(eq(perfis.projetoId, projetoId), eq(perfis.andarId, andarId)));
}

export async function updatePerfilByAndarAndIndex(
  projetoId: number,
  andarId: number,
  perfilIndex: number,
  data: Partial<InsertPerfil>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(perfis)
    .set(data)
    .where(
      and(
        eq(perfis.projetoId, projetoId),
        eq(perfis.andarId, andarId),
        eq(perfis.perfilIndex, perfilIndex),
      ),
    );
}

export async function resetPerfisByAndarId(projetoId: number, andarId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(perfis)
    .set({ ativo: false, variedadeId: null, receitaId: null, dataEntrada: null, cultivoStatus: null })
    .where(and(eq(perfis.projetoId, projetoId), eq(perfis.andarId, andarId)));
}

// ============================================================
// Furos
// ============================================================

export async function getFurosByAndarId(projetoId: number, andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(furos).where(and(eq(furos.projetoId, projetoId), eq(furos.andarId, andarId)));
}

export async function updateFuroByAndarAndIndex(
  projetoId: number,
  andarId: number,
  perfilIndex: number,
  furoIndex: number,
  data: Partial<InsertFuro>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(furos).set(data).where(
    and(
      eq(furos.projetoId, projetoId),
      eq(furos.andarId, andarId),
      eq(furos.perfilIndex, perfilIndex),
      eq(furos.furoIndex, furoIndex),
    ),
  );
}

export async function resetFurosByAndarId(projetoId: number, andarId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(furos)
    .set({ status: "vazio", variedadeId: null })
    .where(and(eq(furos.projetoId, projetoId), eq(furos.andarId, andarId)));
}

// Batch update all furos of an andar
export async function batchUpdateFuros(
  projetoId: number,
  andarId: number,
  updates: Array<{ perfilIndex: number; furoIndex: number; status?: string; variedadeId?: number | null }>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await Promise.all(
    updates.map((u) => {
      const data: Partial<InsertFuro> = {};
      if (u.status !== undefined) data.status = u.status;
      if (u.variedadeId !== undefined) data.variedadeId = u.variedadeId;
      return db.update(furos).set(data).where(
        and(
          eq(furos.projetoId, projetoId),
          eq(furos.andarId, andarId),
          eq(furos.perfilIndex, u.perfilIndex),
          eq(furos.furoIndex, u.furoIndex),
        ),
      );
    }),
  );
}

// Batch update all perfis of an andar
export async function batchUpdatePerfis(
  projetoId: number,
  andarId: number,
  updates: Array<{
    perfilIndex: number;
    variedadeId?: number | null;
    ativo?: boolean;
    dataEntrada?: Date | null;
    cultivoStatus?: string | null;
  }>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const needsReceita = updates.some((u) => u.variedadeId !== undefined);
  const receitasCache = needsReceita ? await getAllReceitas(projetoId) : null;
  await Promise.all(
    updates.map((u) => {
      const data: Partial<InsertPerfil> = {};
      if (u.variedadeId !== undefined) {
        data.variedadeId = u.variedadeId;
        if (u.variedadeId == null) {
          data.receitaId = null;
        } else if (receitasCache) {
          data.receitaId = receitaCicloPrioritariaParaVariedade(receitasCache, u.variedadeId)?.id ?? null;
        }
      }
      if (u.ativo !== undefined) data.ativo = u.ativo;
      if (u.dataEntrada !== undefined) data.dataEntrada = u.dataEntrada;
      if (u.cultivoStatus !== undefined) data.cultivoStatus = u.cultivoStatus;
      return db.update(perfis).set(data).where(
        and(eq(perfis.projetoId, projetoId), eq(perfis.andarId, andarId), eq(perfis.perfilIndex, u.perfilIndex)),
      );
    }),
  );
}

// Set all furos of an andar to a single status/variedade in one query
export async function setAllFurosOfAndar(
  projetoId: number,
  andarId: number,
  data: { status?: string; variedadeId?: number | null },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const setData: Partial<InsertFuro> = {};
  if (data.status !== undefined) setData.status = data.status;
  if (data.variedadeId !== undefined) setData.variedadeId = data.variedadeId;
  await db.update(furos).set(setData).where(and(eq(furos.projetoId, projetoId), eq(furos.andarId, andarId)));
}

// Set all perfis of an andar
export async function setAllPerfisOfAndar(
  projetoId: number,
  andarId: number,
  data: { variedadeId?: number | null; ativo?: boolean; dataEntrada?: Date | null; cultivoStatus?: string | null },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const setData: Partial<InsertPerfil> = {};
  if (data.variedadeId !== undefined) {
    setData.variedadeId = data.variedadeId;
    if (data.variedadeId == null) {
      setData.receitaId = null;
    } else {
      const rs = await getAllReceitas(projetoId);
      setData.receitaId = receitaCicloPrioritariaParaVariedade(rs, data.variedadeId)?.id ?? null;
    }
  }
  if (data.ativo !== undefined) setData.ativo = data.ativo;
  if (data.dataEntrada !== undefined) setData.dataEntrada = data.dataEntrada;
  if (data.cultivoStatus !== undefined) setData.cultivoStatus = data.cultivoStatus;
  await db.update(perfis).set(setData).where(and(eq(perfis.projetoId, projetoId), eq(perfis.andarId, andarId)));
}

// ============================================================
// Movimentação de Perfis / Andares
// ============================================================

// Move a single perfil (and its furos) from one andar to another
export async function moverPerfil(
  projetoId: number,
  origemAndarId: number,
  perfilIndex: number,
  destinoAndarId: number,
  destinoPerfilIndex: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const srcPerfis = await db
    .select()
    .from(perfis)
    .where(
      and(
        eq(perfis.projetoId, projetoId),
        eq(perfis.andarId, origemAndarId),
        eq(perfis.perfilIndex, perfilIndex),
      ),
    );
  const srcPerfil = srcPerfis[0];
  if (!srcPerfil) throw new Error("Perfil de origem não encontrado");

  const srcFuros = await db
    .select()
    .from(furos)
    .where(
      and(
        eq(furos.projetoId, projetoId),
        eq(furos.andarId, origemAndarId),
        eq(furos.perfilIndex, perfilIndex),
      ),
    );

  await db
    .update(perfis)
    .set({
      variedadeId: srcPerfil.variedadeId,
      ativo: srcPerfil.ativo,
    })
    .where(
      and(
        eq(perfis.projetoId, projetoId),
        eq(perfis.andarId, destinoAndarId),
        eq(perfis.perfilIndex, destinoPerfilIndex),
      ),
    );

  for (const srcFuro of srcFuros) {
    await db
      .update(furos)
      .set({
        status: srcFuro.status,
        variedadeId: srcFuro.variedadeId,
      })
      .where(
        and(
          eq(furos.projetoId, projetoId),
          eq(furos.andarId, destinoAndarId),
          eq(furos.perfilIndex, destinoPerfilIndex),
          eq(furos.furoIndex, srcFuro.furoIndex),
        ),
      );
  }

  await db
    .update(perfis)
    .set({ ativo: false, variedadeId: null })
    .where(
      and(
        eq(perfis.projetoId, projetoId),
        eq(perfis.andarId, origemAndarId),
        eq(perfis.perfilIndex, perfilIndex),
      ),
    );

  await db
    .update(furos)
    .set({ status: "vazio", variedadeId: null })
    .where(
      and(
        eq(furos.projetoId, projetoId),
        eq(furos.andarId, origemAndarId),
        eq(furos.perfilIndex, perfilIndex),
      ),
    );
}

// Move ALL perfis (and furos) from one andar to another
export async function moverTodosPerfilAndar(projetoId: number, origemAndarId: number, destinoAndarId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const srcPerfis = await db
    .select()
    .from(perfis)
    .where(and(eq(perfis.projetoId, projetoId), eq(perfis.andarId, origemAndarId)));

  const srcFuros = await db
    .select()
    .from(furos)
    .where(and(eq(furos.projetoId, projetoId), eq(furos.andarId, origemAndarId)));

  const srcAndarArr = await db
    .select()
    .from(andares)
    .where(and(eq(andares.projetoId, projetoId), eq(andares.id, origemAndarId)))
    .limit(1);
  const srcAndar = srcAndarArr[0];

  for (const p of srcPerfis) {
    await db
      .update(perfis)
      .set({
        variedadeId: p.variedadeId,
        ativo: p.ativo,
      })
      .where(
        and(
          eq(perfis.projetoId, projetoId),
          eq(perfis.andarId, destinoAndarId),
          eq(perfis.perfilIndex, p.perfilIndex),
        ),
      );
  }

  for (const f of srcFuros) {
    await db
      .update(furos)
      .set({
        status: f.status,
        variedadeId: f.variedadeId,
      })
      .where(
        and(
          eq(furos.projetoId, projetoId),
          eq(furos.andarId, destinoAndarId),
          eq(furos.perfilIndex, f.perfilIndex),
          eq(furos.furoIndex, f.furoIndex),
        ),
      );
  }

  if (srcAndar) {
    await db
      .update(andares)
      .set({
        dataEntrada: srcAndar.dataEntrada,
        lavado: srcAndar.lavado,
      })
      .where(and(eq(andares.projetoId, projetoId), eq(andares.id, destinoAndarId)));
  }

  await db
    .update(perfis)
    .set({ ativo: false, variedadeId: null })
    .where(and(eq(perfis.projetoId, projetoId), eq(perfis.andarId, origemAndarId)));

  await db
    .update(furos)
    .set({ status: "vazio", variedadeId: null })
    .where(and(eq(furos.projetoId, projetoId), eq(furos.andarId, origemAndarId)));

  await db
    .update(andares)
    .set({
      dataEntrada: null,
      lavado: true,
      dataColheitaTotal: null,
    })
    .where(and(eq(andares.projetoId, projetoId), eq(andares.id, origemAndarId)));
}

// ============================================================
// Aplicações Andar
// ============================================================

export async function getAplicacoesByAndarId(projetoId: number, andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aplicacoesAndar)
    .where(and(eq(aplicacoesAndar.projetoId, projetoId), eq(aplicacoesAndar.andarId, andarId)));
}

export async function createAplicacaoAndar(data: InsertAplicacaoAndar) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aplicacoesAndar).values(data);
  return { id: result[0].insertId };
}

export async function deleteAplicacaoAndar(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aplicacoesAndar).where(and(eq(aplicacoesAndar.projetoId, projetoId), eq(aplicacoesAndar.id, id)));
}

// ============================================================
// Germinação
// ============================================================

export async function getAllGerminacao(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(germinacao).where(eq(germinacao.projetoId, projetoId));
}

export async function createGerminacao(data: InsertGerminacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(germinacao).values(data);
  return { id: result[0].insertId };
}

export async function updateGerminacao(projetoId: number, id: number, data: Partial<InsertGerminacao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(germinacao).set(data).where(and(eq(germinacao.projetoId, projetoId), eq(germinacao.id, id)));
}

export async function deleteGerminacao(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(germinacao).where(and(eq(germinacao.projetoId, projetoId), eq(germinacao.id, id)));
}

// ============================================================
// Transplantios
// ============================================================

export async function getAllTransplantios(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transplantios).where(eq(transplantios.projetoId, projetoId));
}

export async function createTransplantio(data: InsertTransplantio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transplantios).values(data);
  return { id: result[0].insertId };
}

export async function deleteTransplantio(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(transplantios).where(and(eq(transplantios.projetoId, projetoId), eq(transplantios.id, id)));
}

// ============================================================
// Manutenções
// ============================================================

export async function getAllManutencoes(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(manutencoes).where(eq(manutencoes.projetoId, projetoId));
}

export async function createManutencao(data: InsertManutencao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(manutencoes).values(data);
  return { id: result[0].insertId };
}

export async function updateManutencao(projetoId: number, id: number, data: Partial<InsertManutencao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(manutencoes).set(data).where(and(eq(manutencoes.projetoId, projetoId), eq(manutencoes.id, id)));
}

export async function deleteManutencao(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(manutencoes).where(and(eq(manutencoes.projetoId, projetoId), eq(manutencoes.id, id)));
}

// ============================================================
// Ciclos
// ============================================================

export async function getAllCiclos(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureCiclosDosagemColumn();
  return db.select().from(ciclos).where(eq(ciclos.projetoId, projetoId));
}

export async function createCiclo(data: InsertCiclo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ciclos).values(data);
  return { id: result[0].insertId };
}

export async function updateCiclo(projetoId: number, id: number, data: Partial<InsertCiclo>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ciclos).set(data).where(and(eq(ciclos.projetoId, projetoId), eq(ciclos.id, id)));
}

export async function deleteCiclo(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ciclos).where(and(eq(ciclos.projetoId, projetoId), eq(ciclos.id, id)));
}

// ============================================================
// Full data load (for dashboard/context)
// ============================================================

export async function loadFullFazendaData(projetoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Compat: adiciona colunas novas em bases antigas (ex.: testes/local sem migrate).
  await ensureCiclosDosagemColumn();
  await ensureTransplantiosRastreioColumns();
  await ensureReceitasCrescimentoNovasColunas();
  await ensureEstoqueItensTable();
  await ensureVisionCultivoTables();
  await ensurePerfisCultivoStatusColumn();
  await ensurePerfisReceitaIdColumn();

  const projetoMeta = await getProjetoRow(projetoId);
  const omitCaixaAguaModulo =
    projetoMeta?.tipo === "microverdes" && projetoMeta.usarCaixaAgua === false;

  const [
    allTorres,
    allCaixas,
    allAndares,
    allPerfis,
    allFuros,
    allMedicoes,
    allAplicacoesCaixa,
    allAplicacoesAndar,
    allVariedades,
    allFasesConfig,
    allGerminacao,
    allTransplantios,
    allManutencoes,
    allCiclos,
    allReceitas,
    allTarefas,
    allRegistrosColheita,
    allPlanosPlantio,
  ] = await Promise.all([
    db.select().from(torres).where(eq(torres.projetoId, projetoId)),
    omitCaixaAguaModulo
      ? Promise.resolve([] as (typeof caixasAgua.$inferSelect)[])
      : db.select().from(caixasAgua).where(eq(caixasAgua.projetoId, projetoId)),
    db.select().from(andares).where(eq(andares.projetoId, projetoId)),
    db.select().from(perfis).where(eq(perfis.projetoId, projetoId)),
    db.select().from(furos).where(eq(furos.projetoId, projetoId)),
    omitCaixaAguaModulo
      ? Promise.resolve([] as (typeof medicoesCaixa.$inferSelect)[])
      : db.select().from(medicoesCaixa).where(eq(medicoesCaixa.projetoId, projetoId)),
    omitCaixaAguaModulo
      ? Promise.resolve([] as (typeof aplicacoesCaixa.$inferSelect)[])
      : db.select().from(aplicacoesCaixa).where(eq(aplicacoesCaixa.projetoId, projetoId)),
    db.select().from(aplicacoesAndar).where(eq(aplicacoesAndar.projetoId, projetoId)),
    db.select().from(variedades).where(eq(variedades.projetoId, projetoId)),
    db.select().from(fasesConfig).where(eq(fasesConfig.projetoId, projetoId)),
    db.select().from(germinacao).where(eq(germinacao.projetoId, projetoId)),
    db.select().from(transplantios).where(eq(transplantios.projetoId, projetoId)),
    db.select().from(manutencoes).where(eq(manutencoes.projetoId, projetoId)),
    db.select().from(ciclos).where(eq(ciclos.projetoId, projetoId)),
    db.select().from(receitasCrescimento).where(eq(receitasCrescimento.projetoId, projetoId)),
    db.select().from(tarefas).where(eq(tarefas.projetoId, projetoId)),
    db.select().from(registrosColheita).where(eq(registrosColheita.projetoId, projetoId)),
    db.select().from(planosPlantio).where(eq(planosPlantio.projetoId, projetoId)),
  ]);

  const torresOut = omitCaixaAguaModulo
    ? allTorres.map((t) => ({ ...t, caixaAguaId: null as number | null }))
    : allTorres;

  /** Prazos por fase vêm da receita base da variedade; colunas em `variedades` são só legado/fallback. */
  const variedadesComCicloDaReceita = allVariedades.map((v) => {
    const r = receitaCicloPrioritariaParaVariedade(allReceitas, v.id);
    if (!r) return v;
    return {
      ...v,
      diasMudas: r.diasMudas ?? v.diasMudas,
      diasVegetativa: r.diasVegetativa ?? v.diasVegetativa,
      diasMaturacao: r.diasMaturacao ?? v.diasMaturacao,
    };
  });

  return {
    projetoTipo: projetoMeta?.tipo ?? null,
    torres: torresOut,
    caixasAgua: allCaixas,
    andares: allAndares,
    perfis: allPerfis,
    furos: allFuros,
    medicoesCaixa: allMedicoes,
    aplicacoesCaixa: allAplicacoesCaixa,
    aplicacoesAndar: allAplicacoesAndar,
    variedades: variedadesComCicloDaReceita,
    fasesConfig: allFasesConfig,
    germinacao: allGerminacao,
    transplantios: allTransplantios,
    manutencoes: allManutencoes,
    ciclos: allCiclos,
    receitas: allReceitas,
    tarefas: allTarefas,
    registrosColheita: allRegistrosColheita,
    planosPlantio: allPlanosPlantio,
  };
}

/** Garante colunas novas em `receitas_crescimento` (migração 0011) — evita SELECT inválido e lista vazia em bases antigas. */
export async function ensureReceitasCrescimentoNovasColunas(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const alters = [
    "ALTER TABLE `receitas_crescimento` ADD COLUMN `ph` FLOAT NULL",
    "ALTER TABLE `receitas_crescimento` ADD COLUMN `temperaturaMedia` FLOAT NULL",
    "ALTER TABLE `receitas_crescimento` ADD COLUMN `umidadeMedia` FLOAT NULL",
    "ALTER TABLE `receitas_crescimento` ADD COLUMN `horasLuzPorFase` JSON NULL",
  ];

  for (const stmt of alters) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isMysqlDuplicateColumnError(err)) continue;
      if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return;
      console.error("[Database] ensureReceitasCrescimentoNovasColunas ALTER:", err);
    }
  }

  const backfills = [
    `UPDATE receitas_crescimento SET temperaturaMedia = CASE
        WHEN temperaturaMin IS NOT NULL AND temperaturaMax IS NOT NULL THEN (temperaturaMin + temperaturaMax) / 2
        ELSE COALESCE(temperaturaMin, temperaturaMax) END
      WHERE temperaturaMedia IS NULL`,
    `UPDATE receitas_crescimento SET umidadeMedia = CASE
        WHEN umidadeMin IS NOT NULL AND umidadeMax IS NOT NULL THEN (umidadeMin + umidadeMax) / 2
        ELSE COALESCE(umidadeMin, umidadeMax) END
      WHERE umidadeMedia IS NULL`,
    `UPDATE receitas_crescimento SET ph = COALESCE(
        CAST(JSON_EXTRACT(phPorFase, '$.mudas') AS DECIMAL(10, 3)),
        CAST(JSON_EXTRACT(phPorFase, '$.vegetativa') AS DECIMAL(10, 3)),
        CAST(JSON_EXTRACT(phPorFase, '$.maturacao') AS DECIMAL(10, 3))
      )
      WHERE ph IS NULL AND phPorFase IS NOT NULL`,
    `UPDATE receitas_crescimento SET horasLuzPorFase = JSON_OBJECT(
        'mudas', horasLuz,
        'vegetativa', horasLuz,
        'maturacao', horasLuz
      )
      WHERE horasLuzPorFase IS NULL AND horasLuz IS NOT NULL`,
  ];

  for (const stmt of backfills) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Database] ensureReceitasCrescimentoNovasColunas backfill:", msg);
    }
  }
}

/** Garante colunas novas de rastreio em `transplantios` (migração 0010). */
export async function ensureTransplantiosRastreioColumns(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const statements = [
    "ALTER TABLE `transplantios` ADD COLUMN `torreOrigemId` int",
    "ALTER TABLE `transplantios` ADD COLUMN `andarOrigemId` int",
    "ALTER TABLE `transplantios` ADD COLUMN `observacoes` text",
  ];

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isMysqlDuplicateColumnError(err)) continue;
      // Se tabela não existe ainda, apenas deixe falhar em silêncio (setup inicial/migrações cuidam disso).
      if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return;
      console.error("[Database] ensureTransplantiosRastreioColumns:", err);
    }
  }
}

/** Garante coluna de dosagem em `ciclos` (migração 0012). */
export async function ensureCiclosDosagemColumn(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw("ALTER TABLE `ciclos` ADD COLUMN `dosagem` varchar(128)"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isMysqlDuplicateColumnError(err)) return;
    if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return;
    console.error("[Database] ensureCiclosDosagemColumn:", err);
  }
}

/**
 * Coloca `users.role` em VARCHAR (legado mig. 0027 no journal; DDL efectivo é aqui).
 * ENUM antigo sem `platform_admin` gerava 1265 no bootstrap.
 * Evita ALTER na fase `drizzle-kit migrate` (metadata lock com deploy sobreposto na Railway).
 */
export async function ensureUsersRoleVarchar(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) {
    console.warn("[Database] ensureUsersRoleVarchar: sem ligação à BD.");
    return;
  }

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const meta = await dbConn.execute(
        sql.raw(
          "SELECT COLUMN_TYPE AS ct FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role' LIMIT 1",
        ),
      );
      const rowsUnknown: unknown = Array.isArray(meta) ? meta[0] : meta;
      const row0 =
        Array.isArray(rowsUnknown) && rowsUnknown.length > 0 ? (rowsUnknown[0] as Record<string, unknown>) : null;
      const ct = row0 && typeof row0.ct === "string" ? row0.ct : "";
      if (/^varchar/i.test(ct)) {
        return;
      }

      await dbConn.execute(sql.raw("SET SESSION lock_wait_timeout = 25"));
      await dbConn.execute(
        sql.raw(
          "ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(32) NOT NULL DEFAULT 'user'",
        ),
      );
      console.log("[Database] users.role = VARCHAR(32) (bootstrap/login com platform_admin OK).");
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return;
      const lockWait = /1205|Lock wait timeout|errno: 1205/i.test(msg);
      if (lockWait && attempt < maxAttempts - 1) {
        console.warn(
          `[Database] ensureUsersRoleVarchar: espera de lock na BD (deploy sobreposto?). Tentativa ${attempt + 2}/${maxAttempts} em 6s…`,
        );
        await new Promise((r) => setTimeout(r, 6000));
        continue;
      }
      console.error("[Database] ensureUsersRoleVarchar:", err);
      return;
    }
  }
}

/** Garante coluna `cultivoStatus` em `perfis` (migração 0020) — microverdes iluminação sem furos. */
export async function ensurePerfisCultivoStatusColumn(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw("ALTER TABLE `perfis` ADD COLUMN `cultivoStatus` varchar(16) NULL"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isMysqlDuplicateColumnError(err)) return;
    if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return;
    console.error("[Database] ensurePerfisCultivoStatusColumn:", err);
  }
}

/** Garante coluna `receitaId` em `perfis` (migração 0021) — prazos alinhados à receita escolhida. */
export async function ensurePerfisReceitaIdColumn(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw("ALTER TABLE `perfis` ADD COLUMN `receitaId` int NULL"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isMysqlDuplicateColumnError(err)) return;
    if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return;
    console.error("[Database] ensurePerfisReceitaIdColumn:", err);
  }
}

/** Garante tabela `estoque_itens` (migração 0013) — bases locais sem `db:migrate`. */
export async function ensureEstoqueItensTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`estoque_itens\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`categoria\` varchar(32) NOT NULL,
  \`nome\` varchar(256) NOT NULL,
  \`quantidadeTotal\` float NOT NULL DEFAULT 0,
  \`unidadeTipo\` varchar(16) NOT NULL DEFAULT 'unidade',
  \`usoPorEvento\` float NOT NULL DEFAULT 0,
  \`frequenciaDias\` float NOT NULL DEFAULT 1,
  \`prazoEntregaDias\` int NOT NULL DEFAULT 7,
  \`diasMargemCompra\` int NOT NULL DEFAULT 7,
  \`nivelMinimo\` float,
  \`precoUnitario\` float,
  \`fornecedor\` varchar(256),
  \`observacoes\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`estoque_itens_id\` PRIMARY KEY(\`id\`)
)`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /ER_TABLE_EXISTS_ERROR/i.test(msg)) {
      /* tabela já existia sem projetoId — tenta adicionar coluna */
    } else {
      console.error("[Database] ensureEstoqueItensTable:", err);
      return;
    }
  }
  try {
    await db.execute(sql.raw("ALTER TABLE `estoque_itens` ADD COLUMN `projetoId` int NOT NULL DEFAULT 1"));
  } catch (err: unknown) {
    if (isMysqlDuplicateColumnError(err)) return;
  }
}

/** Garante tabelas de visão computacional (migração 0022) — bases sem `pnpm db:migrate`. */
export async function ensureVisionCultivoTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`vision_cultivo_analyses\` (
  \`id\` INT AUTO_INCREMENT NOT NULL,
  \`projetoId\` INT NOT NULL,
  \`createdByUserId\` INT NOT NULL,
  \`torreSlug\` VARCHAR(64),
  \`variedadeNome\` VARCHAR(256),
  \`contextoNotas\` VARCHAR(512),
  \`mimeType\` VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
  \`imageSha256\` CHAR(64) NOT NULL,
  \`resultadoJson\` JSON NOT NULL,
  \`modeloVersao\` VARCHAR(32) NOT NULL DEFAULT 'stub-v1',
  \`storageKey\` VARCHAR(512),
  \`imagemArmazenada\` LONGTEXT,
  \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_vc_projeto_created\` (\`projetoId\`, \`createdAt\` DESC),
  INDEX \`idx_vc_sha\` (\`projetoId\`, \`imageSha256\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /ER_TABLE_EXISTS_ERROR/i.test(msg)) {
      /* ok */
    } else {
      console.error("[Database] ensureVisionCultivoTables analyses:", err);
    }
  }
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`vision_training_samples\` (
  \`id\` INT AUTO_INCREMENT NOT NULL,
  \`projetoId\` INT NOT NULL,
  \`analysisId\` INT,
  \`createdByUserId\` INT NOT NULL,
  \`rotuloPrincipal\` VARCHAR(64) NOT NULL,
  \`rotulosExtras\` JSON,
  \`splitTreino\` ENUM('treino','validacao','teste') NOT NULL DEFAULT 'treino',
  \`imagemSha256\` CHAR(64) NOT NULL,
  \`imagemBase64\` LONGTEXT NOT NULL,
  \`mimeType\` VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
  \`confirmadoPorAdmin\` TINYINT(1) NOT NULL DEFAULT 0,
  \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_vts_projeto\` (\`projetoId\`, \`splitTreino\`),
  INDEX \`idx_vts_rotulo\` (\`projetoId\`, \`rotuloPrincipal\`),
  CONSTRAINT \`fk_vts_analysis\` FOREIGN KEY (\`analysisId\`) REFERENCES \`vision_cultivo_analyses\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /ER_TABLE_EXISTS_ERROR/i.test(msg)) {
      /* ok */
    } else {
      console.error("[Database] ensureVisionCultivoTables samples:", err);
    }
  }
}

/**
 * Converte quantidades armazenadas em g/ml para kg/L (migração 0025). Idempotente: só altera linhas com `unidadeTipo` 'g' ou 'ml'.
 */
export async function ensureEstoqueUnidadesKgLFromLegacyGramMl(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn || !(await tableExists(dbConn, "estoque_itens"))) return;
  try {
    await dbConn.execute(sql.raw(`UPDATE \`estoque_itens\` SET
  \`quantidadeTotal\` = \`quantidadeTotal\` / 1000,
  \`usoPorEvento\` = \`usoPorEvento\` / 1000,
  \`nivelMinimo\` = CASE WHEN \`nivelMinimo\` IS NOT NULL THEN \`nivelMinimo\` / 1000 ELSE NULL END,
  \`unidadeTipo\` = 'kg'
WHERE \`unidadeTipo\` = 'g'`));
    await dbConn.execute(sql.raw(`UPDATE \`estoque_itens\` SET
  \`quantidadeTotal\` = \`quantidadeTotal\` / 1000,
  \`usoPorEvento\` = \`usoPorEvento\` / 1000,
  \`nivelMinimo\` = CASE WHEN \`nivelMinimo\` IS NOT NULL THEN \`nivelMinimo\` / 1000 ELSE NULL END,
  \`unidadeTipo\` = 'l'
WHERE \`unidadeTipo\` = 'ml'`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/doesn't exist/i.test(msg) && !/ER_NO_SUCH_TABLE/i.test(msg)) {
      console.error("[Database] ensureEstoqueUnidadesKgLFromLegacyGramMl:", err);
    }
  }
}

/**
 * N.º operacional da torre + override JSON (migração 0026). Idempotente; requer `torres.projetoId` preenchido (multi-projeto).
 */
export async function ensureTorresNumeroEstruturaColumns(): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn || !(await tableExists(dbConn, "torres"))) return;

  const ignoreIdx = (err: unknown) => {
    const chain = err instanceof Error ? err.message : String(err);
    if (isMysqlDuplicateColumnError(err)) return true;
    if (/Duplicate key name/i.test(chain)) return true;
    if (/Can't DROP/i.test(chain)) return true;
    const errno = (err as { errno?: number }).errno;
    return errno === 1061 || errno === 1091;
  };

  const run = async (stmt: string) => {
    try {
      await dbConn.execute(sql.raw(stmt));
    } catch (err: unknown) {
      if (ignoreIdx(err)) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (/doesn't exist/i.test(msg) || /ER_NO_SUCH_TABLE/i.test(msg)) return;
      console.error("[Database] ensureTorresNumeroEstruturaColumns:", err);
    }
  };

  if (!(await columnExists(dbConn, "torres", "numeroTorre"))) {
    await run("ALTER TABLE `torres` ADD COLUMN `numeroTorre` int NULL");
  }
  if (!(await columnExists(dbConn, "torres", "estruturaOverrideJson"))) {
    await run("ALTER TABLE `torres` ADD COLUMN `estruturaOverrideJson` text NULL");
  }

  try {
    await dbConn.execute(sql.raw(`UPDATE \`torres\` t
INNER JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY \`projetoId\` ORDER BY \`id\`) AS rn
  FROM \`torres\`
) x ON t.\`id\` = x.\`id\`
SET t.\`numeroTorre\` = x.rn
WHERE t.\`numeroTorre\` IS NULL`));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/window/i.test(msg) && !/syntax/i.test(msg)) {
      console.warn("[Database] ensureTorresNumeroEstruturaColumns backfill numeroTorre:", msg.slice(0, 160));
    }
  }

  await run("ALTER TABLE `torres` MODIFY `numeroTorre` int NOT NULL DEFAULT 1");
  await run(
    "CREATE UNIQUE INDEX `torres_projeto_numero` ON `torres` (`projetoId`, `numeroTorre`)",
  );

  const ovJson =
    '{"vegetativa":{"perfis":12,"furosPorPerfil":6},"maturacao":{"perfis":12,"furosPorPerfil":6}}';
  try {
    await dbConn.execute(
      sql.raw(
        `UPDATE \`torres\` SET \`estruturaOverrideJson\` = '${ovJson.replace(/'/g, "''")}' WHERE \`numeroTorre\` IN (13, 14) AND (\`estruturaOverrideJson\` IS NULL OR \`estruturaOverrideJson\` = '')`,
      ),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/doesn't exist/i.test(msg) && !/ER_NO_SUCH_TABLE/i.test(msg)) {
      console.warn("[Database] ensureTorresNumeroEstruturaColumns override 12x6:", msg.slice(0, 120));
    }
  }
}

// ============================================================
// Reset all data (for re-seed)
// ============================================================

/**
 * Remove torres do projeto e toda a hierarquia (andares, perfis, furos, aplicações).
 * Apaga primeiro por `torreId`/`andarId` para apanhar linhas legadas com `projetoId` NULL ou errado.
 */
async function deleteFvTowerHierarchyForProjetoDb(dbConn: DbConn, projetoId: number): Promise<void> {
  await dbConn.delete(manutencoes).where(eq(manutencoes.projetoId, projetoId));

  const towerRows = await dbConn.select({ id: torres.id }).from(torres).where(eq(torres.projetoId, projetoId));
  const torreIds = towerRows.map((r) => r.id);

  if (torreIds.length > 0) {
    const andarRows = await dbConn
      .select({ id: andares.id })
      .from(andares)
      .where(inArray(andares.torreId, torreIds));
    const andarIds = andarRows.map((r) => r.id);
    if (andarIds.length > 0) {
      await dbConn.delete(aplicacoesAndar).where(inArray(aplicacoesAndar.andarId, andarIds));
      await dbConn.delete(furos).where(inArray(furos.andarId, andarIds));
      await dbConn.delete(perfis).where(inArray(perfis.andarId, andarIds));
    }
    await dbConn.delete(andares).where(inArray(andares.torreId, torreIds));
  }

  await dbConn.delete(aplicacoesAndar).where(eq(aplicacoesAndar.projetoId, projetoId));
  await dbConn.delete(furos).where(eq(furos.projetoId, projetoId));
  await dbConn.delete(perfis).where(eq(perfis.projetoId, projetoId));
  await dbConn.delete(andares).where(eq(andares.projetoId, projetoId));
  await dbConn.delete(torres).where(eq(torres.projetoId, projetoId));
}

/** Zera cultivo na grade (perfis/furos/andares) e aplicações por andar; mantém torres e estrutura física no BD. */
async function clearFvCultivoKeepStructureDb(dbConn: DbConn, projetoId: number): Promise<void> {
  const towerRows = await dbConn.select({ id: torres.id }).from(torres).where(eq(torres.projetoId, projetoId));
  const torreIds = towerRows.map((r) => r.id);
  if (torreIds.length === 0) return;

  const andarRows = await dbConn
    .select({ id: andares.id })
    .from(andares)
    .where(inArray(andares.torreId, torreIds));
  const andarIds = andarRows.map((r) => r.id);
  if (andarIds.length === 0) return;

  await dbConn.delete(aplicacoesAndar).where(inArray(aplicacoesAndar.andarId, andarIds));
  await dbConn.delete(aplicacoesAndar).where(eq(aplicacoesAndar.projetoId, projetoId));

  await dbConn
    .update(andares)
    .set({ dataEntrada: null, dataColheitaTotal: null, lavado: true })
    .where(inArray(andares.id, andarIds));

  await dbConn
    .update(perfis)
    .set({
      variedadeId: null,
      receitaId: null,
      ativo: false,
      dataEntrada: null,
      cultivoStatus: null,
    })
    .where(inArray(perfis.andarId, andarIds));

  await dbConn
    .update(furos)
    .set({ status: "vazio", variedadeId: null })
    .where(inArray(furos.andarId, andarIds));
}

/**
 * Se o projeto for FV e não tiver torres, recria o mesmo esqueleto do seed admin (torres + caixas + grelha vazia).
 * Não apaga variedades/receitas. Útil após limpeza errada que removeu infraestrutura (recuperação sem backup).
 */
export async function ensureFvDefaultInfrastructure(projetoId: number): Promise<{ created: boolean; message: string }> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const proj = await getProjetoRow(projetoId);
  if (!proj || proj.tipo !== "fazenda_vertical") {
    return {
      created: false,
      message: "Só disponível para projeto tipo fazenda vertical.",
    };
  }

  const [ct] = await dbConn.select({ n: count() }).from(torres).where(eq(torres.projetoId, projetoId));
  if (Number(ct?.n ?? 0) > 0) {
    return {
      created: false,
      message: "Já existem torres neste projeto; nada foi alterado.",
    };
  }

  await createTorreComEstrutura({
    projetoId,
    slug: "t-mudas-1",
    nome: "Torre Mudas 1",
    fase: "mudas",
    numAndares: 12,
    numeroTorre: 1,
  });

  for (let t = 1; t <= 3; t++) {
    await createTorreComEstrutura({
      projetoId,
      slug: `t-veg-${t}`,
      nome: `Torre Vegetativa ${t}`,
      fase: "vegetativa",
      numAndares: 12,
      numeroTorre: 1 + t,
    });
  }

  for (let t = 1; t <= 10; t++) {
    await createTorreComEstrutura({
      projetoId,
      slug: `t-mat-${t}`,
      nome: `Torre Maturação ${t}`,
      fase: "maturacao",
      numAndares: 9,
      numeroTorre: 4 + t,
      estruturaOverrideJson: t >= 9 ? JSON.stringify(ESTRUTURA_OVERRIDE_FV_12x6) : null,
    });
  }

  return {
    created: true,
    message:
      "Estrutura padrão recriada: 1 torre mudas, 3 vegetativas, 10 maturação (últimas duas 12×6), cada uma com caixa associada. Cadastre nomes/slugs em Configuração se precisar alinhar ao anterior.",
  };
}

export async function resetAllData(projetoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(visionTrainingSamples).where(eq(visionTrainingSamples.projetoId, projetoId));
    await db.delete(visionCultivoAnalyses).where(eq(visionCultivoAnalyses.projetoId, projetoId));
  } catch {
    /* tabelas visão podem não existir em bases sem migração */
  }

  await db.delete(alertEvents).where(eq(alertEvents.projetoId, projetoId));
  await db.delete(intelligentAlerts).where(eq(intelligentAlerts.projetoId, projetoId));
  await db.delete(recommendationRules).where(eq(recommendationRules.projetoId, projetoId));

  await deleteFvTowerHierarchyForProjetoDb(db, projetoId);
  await db.delete(aplicacoesCaixa).where(eq(aplicacoesCaixa.projetoId, projetoId));
  await db.delete(medicoesCaixa).where(eq(medicoesCaixa.projetoId, projetoId));
  await db.delete(caixasAgua).where(eq(caixasAgua.projetoId, projetoId));
  await db.delete(germinacao).where(eq(germinacao.projetoId, projetoId));
  await db.delete(transplantios).where(eq(transplantios.projetoId, projetoId));
  await db.delete(ciclos).where(eq(ciclos.projetoId, projetoId));
  await db.delete(planosPlantio).where(eq(planosPlantio.projetoId, projetoId));
  await db.delete(registrosColheita).where(eq(registrosColheita.projetoId, projetoId));
  await db.delete(tarefas).where(eq(tarefas.projetoId, projetoId));
  await db.delete(receitasCrescimento).where(eq(receitasCrescimento.projetoId, projetoId));
  await db.delete(variedades).where(eq(variedades.projetoId, projetoId));
  await db.delete(fasesConfig).where(eq(fasesConfig.projetoId, projetoId));
  await db.delete(estoqueItens).where(eq(estoqueItens.projetoId, projetoId));

  try {
    await db.delete(aplicacoesBancada).where(eq(aplicacoesBancada.projetoId, projetoId));
    await db.delete(medicoesBancada).where(eq(medicoesBancada.projetoId, projetoId));
    await db.delete(caixasBancada).where(eq(caixasBancada.projetoId, projetoId));
    await db.delete(bancadas).where(eq(bancadas.projetoId, projetoId));
  } catch {
    /* tabelas hidroponia podem não existir em bases antigas */
  }
}

/**
 * Limpeza operacional granular por projeto. Mantém variedades, receitas, ciclos, fases_config e utilizadores.
 * Quando `torresGrade` está ativo, manutenções ligadas a torres são removidas antes das torres (integridade).
 */
export async function resetOperationalDataByClusters(projetoId: number, clusters: OperationalResetClusters) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  if (clusters.visao) {
    try {
      await dbConn.delete(visionTrainingSamples).where(eq(visionTrainingSamples.projetoId, projetoId));
      await dbConn.delete(visionCultivoAnalyses).where(eq(visionCultivoAnalyses.projetoId, projetoId));
    } catch {
      /* tabelas visão podem não existir */
    }
  }

  if (clusters.inteligenciaAlertas) {
    await dbConn.delete(alertEvents).where(eq(alertEvents.projetoId, projetoId));
    await dbConn.delete(intelligentAlerts).where(eq(intelligentAlerts.projetoId, projetoId));
    await dbConn.delete(recommendationRules).where(eq(recommendationRules.projetoId, projetoId));
  }

  if (clusters.torresGrade) {
    await deleteFvTowerHierarchyForProjetoDb(dbConn, projetoId);
  } else if (clusters.limparCultivoGrade) {
    await clearFvCultivoKeepStructureDb(dbConn, projetoId);
  }

  if (clusters.removerCadastroCaixasAgua) {
    await dbConn.delete(medicoesCaixa).where(eq(medicoesCaixa.projetoId, projetoId));
    await dbConn.delete(aplicacoesCaixa).where(eq(aplicacoesCaixa.projetoId, projetoId));
    if (!clusters.torresGrade) {
      await dbConn.update(torres).set({ caixaAguaId: null }).where(eq(torres.projetoId, projetoId));
    }
    await dbConn.delete(caixasAgua).where(eq(caixasAgua.projetoId, projetoId));
  } else if (clusters.historicoSolucaoCaixa) {
    await dbConn.delete(medicoesCaixa).where(eq(medicoesCaixa.projetoId, projetoId));
    await dbConn.delete(aplicacoesCaixa).where(eq(aplicacoesCaixa.projetoId, projetoId));
  }

  if (clusters.germinacao) {
    await dbConn.delete(germinacao).where(eq(germinacao.projetoId, projetoId));
  }
  if (clusters.transplantios) {
    await dbConn.delete(transplantios).where(eq(transplantios.projetoId, projetoId));
  }

  if (clusters.manutencoes && !clusters.torresGrade) {
    await dbConn.delete(manutencoes).where(eq(manutencoes.projetoId, projetoId));
  }

  if (clusters.planosPlantio) {
    await dbConn.delete(planosPlantio).where(eq(planosPlantio.projetoId, projetoId));
  }
  if (clusters.registrosColheita) {
    await dbConn.delete(registrosColheita).where(eq(registrosColheita.projetoId, projetoId));
  }
  if (clusters.tarefas) {
    await dbConn.delete(tarefas).where(eq(tarefas.projetoId, projetoId));
  }
  if (clusters.estoque) {
    await dbConn.delete(estoqueItens).where(eq(estoqueItens.projetoId, projetoId));
  }

  if (clusters.bancadasHidroponia) {
    try {
      await dbConn.delete(aplicacoesBancada).where(eq(aplicacoesBancada.projetoId, projetoId));
      await dbConn.delete(medicoesBancada).where(eq(medicoesBancada.projetoId, projetoId));
      await dbConn.delete(caixasBancada).where(eq(caixasBancada.projetoId, projetoId));
      await dbConn.delete(bancadas).where(eq(bancadas.projetoId, projetoId));
    } catch {
      /* hidroponia pode não existir */
    }
  }
}

/**
 * Remove o projeto e vínculos após limpar dados operacionais.
 * Não apaga se for o único projeto na base (evita instalação sem projeto).
 */
export async function deleteProjetoPermanente(projetoId: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const [cnt] = await dbConn.select({ n: count() }).from(projetos);
  const total = Number(cnt?.n ?? 0);
  if (total <= 1) {
    throw new Error("Não é possível eliminar o único projeto da base.");
  }

  await resetAllData(projetoId);

  try {
    await dbConn.delete(projetoModulos).where(eq(projetoModulos.projetoId, projetoId));
  } catch (e) {
    if (mysqlErrnoChain(e) !== 1146) throw e;
  }
  await dbConn.delete(projetoUsuarios).where(eq(projetoUsuarios.projetoId, projetoId));
  await dbConn.delete(projetos).where(eq(projetos.id, projetoId));
}

// ============================================================
// Bulk operations for seeding
// ============================================================

export async function bulkInsertVariedades(data: InsertVariedade[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(variedades).values(data);
}

export async function bulkInsertFasesConfig(data: InsertFaseConfig[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  for (const fc of data) {
    await upsertFaseConfig(fc);
  }
}

// ============================================================
// User management (admin)
// ============================================================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const norm = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(sql`LOWER(TRIM(${users.email})) = ${norm}`)
    .orderBy(desc(users.id));
  if (rows.length === 0) return undefined;
  /** Várias linhas com o mesmo email são possíveis (schema antigo); login deve usar uma com senha válida. */
  const withHash = rows.find((r) => {
    const h = r.passwordHash;
    return h != null && String(h).trim().length > 0;
  });
  return withHash ?? rows[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin" | "platform_admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: 'password',
    role: data.role,
    lastSignedIn: new Date(),
  });
  return { id: result[0].insertId, openId };
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

export async function updateUserEmail(id: number, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const canon = email.trim().toLowerCase();
  await db.update(users).set({ email: canon }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users);
}

export async function updateUserRole(id: number, role: "user" | "admin" | "platform_admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ============================================================
// Receitas de Crescimento
// ============================================================

export async function getAllReceitas(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureReceitasCrescimentoNovasColunas();
  return db.select().from(receitasCrescimento).where(eq(receitasCrescimento.projetoId, projetoId));
}

export async function getReceitaById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  await ensureReceitasCrescimentoNovasColunas();
  const result = await db
    .select()
    .from(receitasCrescimento)
    .where(and(eq(receitasCrescimento.projetoId, projetoId), eq(receitasCrescimento.id, id)))
    .limit(1);
  return result[0];
}

export async function getReceitasByVariedadeId(projetoId: number, variedadeId: number) {
  const db = await getDb();
  if (!db) return [];
  await ensureReceitasCrescimentoNovasColunas();
  return db
    .select()
    .from(receitasCrescimento)
    .where(and(eq(receitasCrescimento.projetoId, projetoId), eq(receitasCrescimento.variedadeId, variedadeId)));
}

/**
 * Alinha `perfis.receitaId` à receita priorizada da variedade (útil após editar dias na receita —
 * ex. vegetativa 14→10: torre passa a contar a receita certa no BD também).
 */
export async function syncPerfisReceitaIdParaVariedade(projetoId: number, variedadeId: number) {
  const dbConn = await getDb();
  if (!dbConn) return;
  await ensurePerfisReceitaIdColumn();
  const lista = await getAllReceitas(projetoId);
  const win = receitaCicloPrioritariaParaVariedade(lista, variedadeId);
  await dbConn
    .update(perfis)
    .set({ receitaId: win?.id ?? null })
    .where(and(eq(perfis.projetoId, projetoId), eq(perfis.variedadeId, variedadeId)));
}

/**
 * Copia os dias de ciclo da receita priorizada para a linha `variedades` (cadastro).
 * Garante que `fazenda.loadAll` e qualquer cliente que use só `variedades` ficam alinhados ao catálogo de receitas.
 */
export async function syncVariedadeDiasFromReceitaPrioritaria(projetoId: number, variedadeId: number) {
  const dbConn = await getDb();
  if (!dbConn) return;
  const lista = await getAllReceitas(projetoId);
  const r = receitaCicloPrioritariaParaVariedade(lista, variedadeId);
  if (!r) return;
  await dbConn
    .update(variedades)
    .set({
      diasMudas: Number(r.diasMudas ?? 14),
      diasVegetativa: Number(r.diasVegetativa ?? 21),
      diasMaturacao: Number(r.diasMaturacao ?? 28),
    })
    .where(and(eq(variedades.projetoId, projetoId), eq(variedades.id, variedadeId)));
}

export async function createReceita(data: InsertReceitaCrescimento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureReceitasCrescimentoNovasColunas();
  const result = await db.insert(receitasCrescimento).values(data);
  return { id: result[0].insertId };
}

export async function updateReceita(projetoId: number, id: number, data: Partial<InsertReceitaCrescimento>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureReceitasCrescimentoNovasColunas();
  await db
    .update(receitasCrescimento)
    .set(data)
    .where(and(eq(receitasCrescimento.projetoId, projetoId), eq(receitasCrescimento.id, id)));
}

export async function deleteReceita(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(receitasCrescimento).where(and(eq(receitasCrescimento.projetoId, projetoId), eq(receitasCrescimento.id, id)));
}

// ============================================================
// Tarefas Operacionais
// ============================================================

export async function getAllTarefas(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tarefas).where(eq(tarefas.projetoId, projetoId));
}

export async function getTarefaById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tarefas)
    .where(and(eq(tarefas.projetoId, projetoId), eq(tarefas.id, id)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTarefasByDate(projetoId: number, _date: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tarefas).where(eq(tarefas.projetoId, projetoId));
}

export async function createTarefa(data: InsertTarefa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tarefas).values(data);
  return { id: result[0].insertId };
}

export async function updateTarefa(projetoId: number, id: number, data: Partial<InsertTarefa>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tarefas).set(data).where(and(eq(tarefas.projetoId, projetoId), eq(tarefas.id, id)));
}

export async function deleteTarefa(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tarefas).where(and(eq(tarefas.projetoId, projetoId), eq(tarefas.id, id)));
}

export async function concluirTarefa(projetoId: number, id: number, userId: number, userName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(tarefas)
    .set({
      status: "concluida",
      concluidoPorId: userId,
      concluidoPorNome: userName,
      concluidoEm: new Date(),
    })
    .where(and(eq(tarefas.projetoId, projetoId), eq(tarefas.id, id)));
}

// ============================================================
// Registros de Colheita
// ============================================================

export async function getAllRegistrosColheita(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrosColheita).where(eq(registrosColheita.projetoId, projetoId));
}

export async function getRegistrosColheitaByAndarId(projetoId: number, andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(registrosColheita)
    .where(and(eq(registrosColheita.projetoId, projetoId), eq(registrosColheita.andarId, andarId)));
}

export async function createRegistroColheita(data: InsertRegistroColheita) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(registrosColheita).values(data);
  return { id: result[0].insertId };
}

export async function deleteRegistroColheita(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(registrosColheita).where(and(eq(registrosColheita.projetoId, projetoId), eq(registrosColheita.id, id)));
}

// ============================================================
// Planos de Plantio
// ============================================================

/** Garante colunas de germinação (migração 0009) se o banco ainda não tiver — evita falha ao criar plano. */
export async function ensurePlanosPlantioGerminacaoColumns(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Sem conexão — não foi possível verificar colunas de planos_plantio.");
    return;
  }

  const statements = [
    "ALTER TABLE `planos_plantio` ADD COLUMN `germinadas` int NOT NULL DEFAULT 0",
    "ALTER TABLE `planos_plantio` ADD COLUMN `naoGerminadas` int NOT NULL DEFAULT 0",
    "ALTER TABLE `planos_plantio` ADD COLUMN `transplantadasGerminacao` int NOT NULL DEFAULT 0",
    "ALTER TABLE `planos_plantio` ADD COLUMN `germinacaoFase` varchar(32) NOT NULL DEFAULT 'pendente'",
  ];

  let added = 0;
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      added++;
    } catch (err: unknown) {
      if (isMysqlDuplicateColumnError(err)) continue;
      console.error("[Database] ensurePlanosPlantioGerminacaoColumns:", err);
    }
  }

  if (added > 0) {
    try {
      await db.execute(sql.raw(
        "UPDATE `planos_plantio` SET `naoGerminadas` = `quantidadePlantas` WHERE `germinadas` = 0 AND (`naoGerminadas` = 0 OR `naoGerminadas` IS NULL)"
      ));
    } catch {
      /* ignore backfill errors */
    }
    console.log(`[Database] planos_plantio: ${added} coluna(s) de germinação conferida(s)/adicionada(s).`);
  }
}

export async function getAllPlanosPlantio(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planosPlantio).where(eq(planosPlantio.projetoId, projetoId));
}

export async function getPlanoPlantioById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(planosPlantio)
    .where(and(eq(planosPlantio.projetoId, projetoId), eq(planosPlantio.id, id)))
    .limit(1);
  return rows[0];
}

export async function createPlanoPlantio(data: InsertPlanoPlantio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(planosPlantio).values(data);
  return { id: result[0].insertId };
}

export async function updatePlanoPlantio(projetoId: number, id: number, data: Partial<InsertPlanoPlantio>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(planosPlantio)
    .set(data)
    .where(and(eq(planosPlantio.projetoId, projetoId), eq(planosPlantio.id, id)));
}

export async function deletePlanoPlantio(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(planosPlantio).where(and(eq(planosPlantio.projetoId, projetoId), eq(planosPlantio.id, id)));
}

/** Remove todos os planos de plantio do projeto (uso administrativo — reinício do calendário). */
export async function deleteAllPlanosPlantio(projetoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(planosPlantio).where(eq(planosPlantio.projetoId, projetoId));
}

// ============================================================
// Alertas Inteligentes
// ============================================================

export async function getAllAlerts(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(intelligentAlerts).where(eq(intelligentAlerts.projetoId, projetoId));
}

export async function getAlertById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(intelligentAlerts)
    .where(and(eq(intelligentAlerts.projetoId, projetoId), eq(intelligentAlerts.id, id)))
    .limit(1);
  return result[0];
}

export async function getAlertByHash(projetoId: number, hash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(intelligentAlerts)
    .where(and(eq(intelligentAlerts.projetoId, projetoId), eq(intelligentAlerts.hashUnico, hash)))
    .limit(1);
  return result[0];
}

export async function createAlert(data: InsertIntelligentAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(intelligentAlerts).values(data);
  return { id: result[0].insertId };
}

export async function updateAlert(projetoId: number, id: number, data: Partial<InsertIntelligentAlert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(intelligentAlerts)
    .set(data)
    .where(and(eq(intelligentAlerts.projetoId, projetoId), eq(intelligentAlerts.id, id)));
}

export async function deleteAlert(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(intelligentAlerts).where(and(eq(intelligentAlerts.projetoId, projetoId), eq(intelligentAlerts.id, id)));
}

export async function deleteResolvedAlerts(projetoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(intelligentAlerts).where(
    and(eq(intelligentAlerts.projetoId, projetoId), inArray(intelligentAlerts.status, ["resolvido", "ignorado"])),
  );
}

// ============================================================
// Regras de Recomendação
// ============================================================

export async function getAllRules(projetoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recommendationRules).where(eq(recommendationRules.projetoId, projetoId));
}

export async function getRuleById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(recommendationRules)
    .where(and(eq(recommendationRules.projetoId, projetoId), eq(recommendationRules.id, id)))
    .limit(1);
  return result[0];
}

export async function createRule(data: InsertRecommendationRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(recommendationRules).values(data);
  return { id: result[0].insertId };
}

export async function updateRule(projetoId: number, id: number, data: Partial<InsertRecommendationRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(recommendationRules)
    .set(data)
    .where(and(eq(recommendationRules.projetoId, projetoId), eq(recommendationRules.id, id)));
}

export async function deleteRule(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(recommendationRules).where(and(eq(recommendationRules.projetoId, projetoId), eq(recommendationRules.id, id)));
}

// ============================================================
// Eventos de Alerta (Histórico/Auditoria)
// ============================================================

export async function getEventsByAlertId(projetoId: number, alertaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(alertEvents)
    .where(and(eq(alertEvents.projetoId, projetoId), eq(alertEvents.alertaId, alertaId)));
}

export async function createAlertEvent(data: InsertAlertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alertEvents).values(data);
  return { id: result[0].insertId };
}

// ============================================================
// Visão computacional (análises + amostras de treino)
// ============================================================

export async function insertVisionAnalysis(data: InsertVisionCultivoAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(visionCultivoAnalyses).values(data);
  return { id: result[0].insertId };
}

export async function listVisionAnalyses(projetoId: number, limit = 40) {
  const db = await getDb();
  if (!db) return [];
  const lim = Math.min(Math.max(limit, 1), 200);
  return db
    .select({
      id: visionCultivoAnalyses.id,
      projetoId: visionCultivoAnalyses.projetoId,
      createdByUserId: visionCultivoAnalyses.createdByUserId,
      torreSlug: visionCultivoAnalyses.torreSlug,
      variedadeNome: visionCultivoAnalyses.variedadeNome,
      contextoNotas: visionCultivoAnalyses.contextoNotas,
      mimeType: visionCultivoAnalyses.mimeType,
      imageSha256: visionCultivoAnalyses.imageSha256,
      resultadoJson: visionCultivoAnalyses.resultadoJson,
      modeloVersao: visionCultivoAnalyses.modeloVersao,
      storageKey: visionCultivoAnalyses.storageKey,
      createdAt: visionCultivoAnalyses.createdAt,
    })
    .from(visionCultivoAnalyses)
    .where(eq(visionCultivoAnalyses.projetoId, projetoId))
    .orderBy(desc(visionCultivoAnalyses.createdAt))
    .limit(lim);
}

export async function getVisionAnalysisById(projetoId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(visionCultivoAnalyses)
    .where(and(eq(visionCultivoAnalyses.projetoId, projetoId), eq(visionCultivoAnalyses.id, id)))
    .limit(1);
  return rows[0];
}

export async function insertVisionTrainingSample(data: InsertVisionTrainingSample) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(visionTrainingSamples).values(data);
  return { id: result[0].insertId };
}

/** Lista amostras sem o campo pesado `imagemBase64`. */
export async function listVisionTrainingSamplesMeta(projetoId: number, limit = 80) {
  const db = await getDb();
  if (!db) return [];
  const lim = Math.min(Math.max(limit, 1), 300);
  return db
    .select({
      id: visionTrainingSamples.id,
      projetoId: visionTrainingSamples.projetoId,
      analysisId: visionTrainingSamples.analysisId,
      createdByUserId: visionTrainingSamples.createdByUserId,
      rotuloPrincipal: visionTrainingSamples.rotuloPrincipal,
      rotulosExtras: visionTrainingSamples.rotulosExtras,
      splitTreino: visionTrainingSamples.splitTreino,
      imagemSha256: visionTrainingSamples.imagemSha256,
      mimeType: visionTrainingSamples.mimeType,
      confirmadoPorAdmin: visionTrainingSamples.confirmadoPorAdmin,
      createdAt: visionTrainingSamples.createdAt,
    })
    .from(visionTrainingSamples)
    .where(eq(visionTrainingSamples.projetoId, projetoId))
    .orderBy(desc(visionTrainingSamples.createdAt))
    .limit(lim);
}

export async function exportVisionTrainingSamplesFull(projetoId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  const lim = Math.min(Math.max(limit, 1), 500);
  return db
    .select()
    .from(visionTrainingSamples)
    .where(eq(visionTrainingSamples.projetoId, projetoId))
    .orderBy(desc(visionTrainingSamples.createdAt))
    .limit(lim);
}

export async function setVisionTrainingSampleConfirmacao(
  projetoId: number,
  id: number,
  confirmadoPorAdmin: boolean,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(visionTrainingSamples)
    .set({ confirmadoPorAdmin })
    .where(and(eq(visionTrainingSamples.projetoId, projetoId), eq(visionTrainingSamples.id, id)));
}
