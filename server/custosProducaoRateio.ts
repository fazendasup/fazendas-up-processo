import type { CustoProducaoItemRow } from "../drizzle/schema";
import {
  type DadosVariedadeRateio,
  type ModoCustoProducao,
  type RateioMetodoCustos,
  alocarValorPorPesos,
  custoPorPlantaLinha,
  pesosRateioPorVariedade,
} from "@shared/custosProducao";
import * as db from "./db";

function toRateioMetodo(v: string | null | undefined): RateioMetodoCustos {
  if (v === "capacidade" || v === "colheita_kg" || v === "colheita_plantas" || v === "igual") return v;
  return "igual";
}

export async function mapaDadosRateio(
  projetoId: number,
  variedadeIds: number[],
  diasColheita: number,
): Promise<Map<number, DadosVariedadeRateio>> {
  const d = Math.min(730, Math.max(1, Math.floor(diasColheita)));
  const [plantasPorVar, colh] = await Promise.all([
    db.getPlantasOcupadasPorVariedadeFromFuros(projetoId),
    db.getColheitaAggPorVariedade(projetoId, d),
  ]);
  const m = new Map<number, DadosVariedadeRateio>();
  for (const id of variedadeIds) {
    const c = colh.get(id) ?? { kg: 0, plantas: 0 };
    m.set(id, {
      plantasOcupadas: plantasPorVar.get(id) ?? 0,
      kgColheitaPeriodo: c.kg,
      plantasColhidasPeriodo: c.plantas,
    });
  }
  return m;
}

/** Valor mensal alocado à variedade por cada linha `rateio_projeto`. */
export async function alocacaoRateioPorVariedade(
  projetoId: number,
  variedadeIds: number[],
  itensCompartilhados: CustoProducaoItemRow[],
): Promise<Map<number, number>> {
  const totais = new Map<number, number>();
  for (const id of variedadeIds) totais.set(id, 0);

  for (const raw of itensCompartilhados) {
    if (raw.modo !== "rateio_projeto" || !raw.ativo) continue;
    const vMes = Number(raw.valorMensal ?? 0);
    if (!(vMes > 0)) continue;
    const dias = raw.rateioDiasColheita ?? 30;
    const metodo = toRateioMetodo(raw.rateioMetodo);
    const dados = await mapaDadosRateio(projetoId, variedadeIds, dias);
    const pesos = pesosRateioPorVariedade(metodo, variedadeIds, dados);
    const aloc = alocarValorPorPesos(vMes, pesos);
    for (const id of variedadeIds) {
      totais.set(id, (totais.get(id) ?? 0) + (aloc.get(id) ?? 0));
    }
  }
  return totais;
}

export function custoDiretoPorPlantaPorVariedade(
  itens: CustoProducaoItemRow[],
  variedadeIds: number[],
): Map<number, { total: number; incompletas: number; linhas: number }> {
  const m = new Map<number, { total: number; incompletas: number; linhas: number }>();
  for (const id of variedadeIds) m.set(id, { total: 0, incompletas: 0, linhas: 0 });
  for (const raw of itens) {
    if (raw.variedadeId == null) continue;
    const meta = m.get(raw.variedadeId);
    if (!meta) continue;
    meta.linhas += 1;
    const { valor } = custoPorPlantaLinha({
      modo: raw.modo as ModoCustoProducao,
      precoReferencia: raw.precoReferencia,
      quantidadePorPlanta: raw.quantidadePorPlanta,
      valorPorPlanta: raw.valorPorPlanta,
      valorPorCiclo: raw.valorPorCiclo,
      plantasPorCicloEstimado: raw.plantasPorCicloEstimado,
      valorMensal: raw.valorMensal,
      plantasMesEstimativa: raw.plantasMesEstimativa,
      ativo: raw.ativo,
    });
    if (raw.ativo && valor != null) meta.total += valor;
    else if (raw.ativo) meta.incompletas += 1;
  }
  return m;
}

function rPorPlantaParcela(parcela: number, d: DadosVariedadeRateio): number | null {
  if (parcela <= 0) return null;
  if (d.plantasOcupadas > 0) return parcela / d.plantasOcupadas;
  if (d.plantasColhidasPeriodo > 0) return parcela / d.plantasColhidasPeriodo;
  return null;
}

/** Parcelas de rateio exibidas no detalhe de uma variedade. */
export async function parcelasRateioParaVariedade(
  projetoId: number,
  variedadeId: number,
  todasVariedadesIds: number[],
  itensCompartilhados: CustoProducaoItemRow[],
): Promise<
  Array<{
    fonteItemId: number;
    rubrica: string;
    grupo: string;
    metodo: RateioMetodoCustos;
    diasColheita: number;
    valorMensalTotal: number;
    parcelaReais: number;
    rPorPlanta: number | null;
    detalhe: string;
  }>
> {
  const out: Array<{
    fonteItemId: number;
    rubrica: string;
    grupo: string;
    metodo: RateioMetodoCustos;
    diasColheita: number;
    valorMensalTotal: number;
    parcelaReais: number;
    rPorPlanta: number | null;
    detalhe: string;
  }> = [];

  for (const raw of itensCompartilhados) {
    if (raw.modo !== "rateio_projeto" || !raw.ativo) continue;
    const vMes = Number(raw.valorMensal ?? 0);
    if (!(vMes > 0)) continue;
    const dias = raw.rateioDiasColheita ?? 30;
    const metodo = toRateioMetodo(raw.rateioMetodo);
    const dadosMap = await mapaDadosRateio(projetoId, todasVariedadesIds, dias);
    const pesos = pesosRateioPorVariedade(metodo, todasVariedadesIds, dadosMap);
    const aloc = alocarValorPorPesos(vMes, pesos);
    const parcela = aloc.get(variedadeId) ?? 0;
    const dVar = dadosMap.get(variedadeId) ?? {
      plantasOcupadas: 0,
      kgColheitaPeriodo: 0,
      plantasColhidasPeriodo: 0,
    };
    const rPorPlanta = rPorPlantaParcela(parcela, dVar);
    const pctPeso = ((pesos.get(variedadeId) ?? 0) / Array.from(pesos.values()).reduce((a, b) => a + b, 0)) * 100;
    out.push({
      fonteItemId: raw.id,
      rubrica: raw.rubrica,
      grupo: raw.grupo,
      metodo,
      diasColheita: dias,
      valorMensalTotal: vMes,
      parcelaReais: parcela,
      rPorPlanta,
      detalhe:
        `Rateio ${metodo} (${dias}d). Peso≈${pctPeso.toFixed(1)}% do total.` +
        (metodo === "colheita_kg"
          ? ` Denominador: ${dVar.kgColheitaPeriodo > 0 ? `${dVar.kgColheitaPeriodo.toFixed(3)} t` : "sem kg na janela — usa plantas ocupadas"}.`
          : metodo === "colheita_plantas"
            ? ` Denominador: ${dVar.plantasColhidasPeriodo} plantas colhidas.`
            : ` Denominador: ${dVar.plantasOcupadas} plantas ocupadas.`),
    });
  }
  return out;
}
