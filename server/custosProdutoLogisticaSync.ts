import {
  deduplicarEtapasLogistica,
  etapaEquivaleLogistica,
  LABEL_ETAPA_PROCESSO,
  type TipoEtapaProcesso,
} from "@shared/custosProduto";
import {
  garantirEtapaLogistica,
  LOGISTICA_PERCENTUAL_PADRAO,
  type EtapaProcessoPadrao,
} from "@shared/custosProdutoProcessoPadrao";
import type { RegimeMoEtapa } from "@shared/custosMoEquipe";
import type {
  CustoProdutoComponenteRow,
  CustoProdutoEtapaRow,
  InsertCustoProdutoComponente,
  InsertCustoProdutoEtapa,
} from "../drizzle/schema";
import * as custosProdutoDb from "./custosProdutoDb";
import { getProcessoConfig } from "./custosProdutoProcessoDb";
import { getDb } from "./db";
import { custosProdutosFichas } from "../drizzle/schema";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

type EtapaPersist = Omit<InsertCustoProdutoEtapa, "fichaId">;

function etapaSignature(etapas: EtapaPersist[]): string {
  return JSON.stringify(
    etapas.map((e) => ({
      t: e.tipo,
      n: e.nome,
      u: e.custoPorUnidade,
      kg: e.custoPorKgProcessado,
      p: e.custoPercentual,
      m: e.minutosPorUnidade,
      r: e.regimeMo,
    })),
  );
}

function rowToEtapaPadrao(e: CustoProdutoEtapaRow): EtapaProcessoPadrao {
  return {
    tipo: e.tipo as TipoEtapaProcesso,
    nome: e.nome,
    custoPorUnidade: num(e.custoPorUnidade) ?? 0,
    custoPorKgProcessado: num(e.custoPorKgProcessado),
    custoPercentual: num(e.custoPercentual),
    minutosPorUnidade: num(e.minutosPorUnidade),
    regimeMo: (e.regimeMo ?? "qualquer") as RegimeMoEtapa,
    ativo: true,
  };
}

function etapaPadraoToPersist(e: EtapaProcessoPadrao, ordem: number): EtapaPersist {
  return {
    tipo: e.tipo,
    nome: e.nome,
    custoPorUnidade: String(e.custoPorUnidade),
    custoPorKgProcessado: e.custoPorKgProcessado != null ? String(e.custoPorKgProcessado) : null,
    custoPercentual: e.custoPercentual != null ? String(e.custoPercentual) : null,
    minutosPorUnidade: e.minutosPorUnidade != null ? String(e.minutosPorUnidade) : null,
    regimeMo: e.regimeMo,
    ordem,
  };
}

function rowsToPersist(etapas: CustoProdutoEtapaRow[]): EtapaPersist[] {
  return [...etapas]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map((e, i) => ({
      tipo: e.tipo as TipoEtapaProcesso,
      nome: e.nome,
      custoPorUnidade: e.custoPorUnidade,
      custoPorKgProcessado: e.custoPorKgProcessado,
      custoPercentual: e.custoPercentual,
      minutosPorUnidade: e.minutosPorUnidade,
      regimeMo: (e.regimeMo ?? "qualquer") as RegimeMoEtapa,
      ordem: i,
    }));
}

function componenteToInsert(c: CustoProdutoComponenteRow): Omit<InsertCustoProdutoComponente, "fichaId"> {
  return {
    tipo: c.tipo,
    variedadeId: c.variedadeId,
    estoqueItemId: c.estoqueItemId,
    produtoComercialId: c.produtoComercialId,
    componenteFichaId: c.componenteFichaId,
    nomeManual: c.nomeManual,
    quantidadePorUnidade: c.quantidadePorUnidade,
    unidadeComponente: c.unidadeComponente,
    custoUnitarioManual: c.custoUnitarioManual,
    ordem: c.ordem,
  };
}

/** Normaliza etapas: deduplica logística, converte equivalentes e garante % padrão se ausente. */
export function normalizarEtapasLogisticaPersist(
  etapas: CustoProdutoEtapaRow[],
  logisticaPct: number = LOGISTICA_PERCENTUAL_PADRAO,
): { etapas: EtapaPersist[]; changed: boolean; deduplicada: boolean } {
  const antes = rowsToPersist(etapas);
  const padroes = [...etapas]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map(rowToEtapaPadrao);
  const deduplicada = padroes.filter((e) => etapaEquivaleLogistica(e)).length > 1;
  const deduped = deduplicarEtapasLogistica(padroes);
  const tipadas = deduped.map((e) =>
    etapaEquivaleLogistica(e) && e.tipo !== "logistica"
      ? {
          ...e,
          tipo: "logistica" as TipoEtapaProcesso,
          nome: LABEL_ETAPA_PROCESSO.logistica,
        }
      : e,
  );
  const finalPadroes = garantirEtapaLogistica(tipadas, logisticaPct);
  const depois = finalPadroes.map((e, i) => etapaPadraoToPersist(e, i));
  return {
    etapas: depois,
    changed: etapaSignature(antes) !== etapaSignature(depois),
    deduplicada,
  };
}

async function listDistinctProjetoIdsWithFichas(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ projetoId: custosProdutosFichas.projetoId })
    .from(custosProdutosFichas);
  return rows.map((r) => r.projetoId);
}

export type SyncLogisticaFichasResult = {
  total: number;
  atualizadas: number;
  deduplicadas: number;
};

export async function sincronizarLogisticaFichasProjeto(
  projetoId: number,
): Promise<SyncLogisticaFichasResult> {
  await custosProdutoDb.ensureCustosProdutosTables();
  const config = await getProcessoConfig(projetoId);
  const pct = config.logisticaPercentualPadrao ?? LOGISTICA_PERCENTUAL_PADRAO;
  const fichas = await custosProdutoDb.listCustosProdutoFichas(projetoId);
  if (fichas.length === 0) return { total: 0, atualizadas: 0, deduplicadas: 0 };

  const ids = fichas.map((f) => f.id);
  const [allComp, allEtapas] = await Promise.all([
    custosProdutoDb.listComponentesByFichaIds(ids),
    custosProdutoDb.listEtapasByFichaIds(ids),
  ]);
  const compByFicha = new Map<number, CustoProdutoComponenteRow[]>();
  const etapByFicha = new Map<number, CustoProdutoEtapaRow[]>();
  for (const c of allComp) {
    const list = compByFicha.get(c.fichaId) ?? [];
    list.push(c);
    compByFicha.set(c.fichaId, list);
  }
  for (const e of allEtapas) {
    const list = etapByFicha.get(e.fichaId) ?? [];
    list.push(e);
    etapByFicha.set(e.fichaId, list);
  }

  let atualizadas = 0;
  let deduplicadas = 0;
  for (const ficha of fichas) {
    const etapas = etapByFicha.get(ficha.id) ?? [];
    const { etapas: normalized, changed, deduplicada } = normalizarEtapasLogisticaPersist(
      etapas,
      pct,
    );
    if (!changed) continue;
    if (deduplicada) deduplicadas += 1;
    const componentes = (compByFicha.get(ficha.id) ?? []).map(componenteToInsert);
    await custosProdutoDb.replaceComponentesEtapas(ficha.id, componentes, normalized);
    atualizadas += 1;
  }

  return { total: fichas.length, atualizadas, deduplicadas };
}

export type SyncLogisticaTodasFichasResult = SyncLogisticaFichasResult & {
  projetos: number;
};

export async function sincronizarLogisticaTodasFichas(): Promise<SyncLogisticaTodasFichasResult> {
  await custosProdutoDb.ensureCustosProdutosTables();
  const projetoIds = await listDistinctProjetoIdsWithFichas();
  let total = 0;
  let atualizadas = 0;
  let deduplicadas = 0;
  for (const projetoId of projetoIds) {
    const r = await sincronizarLogisticaFichasProjeto(projetoId);
    total += r.total;
    atualizadas += r.atualizadas;
    deduplicadas += r.deduplicadas;
  }
  return { projetos: projetoIds.length, total, atualizadas, deduplicadas };
}
