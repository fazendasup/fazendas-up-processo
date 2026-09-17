import {
  buscarParcelasPagarParaProjecao,
  buscarParcelasReceberParaComparativo,
} from "./financeiroContaAzulFluxo";
import {
  addProjecaoColuna,
  insertProjecaoLinhaManual,
  listProjecaoCelulaOverrides,
  listProjecaoColunas,
  listProjecaoLinhasManuais,
  removeProjecaoColuna,
  softDeleteProjecaoLinhaManual,
  upsertProjecaoCelula,
} from "./financeiroProjecaoDb";
import {
  mesAnteriorProjecao,
  montarProjecaoDesembolso,
  type ParcelaBaseProjecao,
} from "@shared/financeiroProjecaoDesembolso";
import { montarFinanceiroComparativo } from "@shared/financeiroComparativoProjecao";
import type { ParcelaFinanceiraNorm } from "@shared/financeiroCfoInsights";

function boundsMesYm(ym: string): { inicio: Date; fim: Date } {
  const [y, m] = ym.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const fim = new Date(y, m, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

function toBase(p: ParcelaFinanceiraNorm): ParcelaBaseProjecao {
  const original = p.categoriaOriginal?.trim() || null;
  const atual = p.categoria?.trim() || null;
  return {
    id: p.id,
    descricao: p.descricao,
    fornecedor: p.contraparte,
    rubrica: atual,
    rubricaOriginal: original,
    rubricaEditadaLocal:
      !!original &&
      !!atual &&
      original.toLowerCase() !== atual.toLowerCase(),
    valor: p.valor,
    valorPago: p.valorPago,
    valorEmAberto: p.valorEmAberto,
    status: p.status,
    dataVencimento: p.dataVencimento,
    dataPagamento: p.dataPagamento,
  };
}

type CacheEntry = {
  at: number;
  parcelas: ParcelaBaseProjecao[];
};

/** Cache curto das parcelas CA da projeção — evita refetch de ~10s a cada checkbox. */
const CACHE_TTL_MS = 5 * 60_000;
const parcelasCache = new Map<string, CacheEntry>();

function cacheKey(projetoId: number, mesYm: string): string {
  return `${projetoId}:${mesYm}`;
}

async function carregarParcelasBaseMes(
  projetoId: number,
  mesYm: string,
  forceRefresh = false,
): Promise<ParcelaBaseProjecao[]> {
  const key = cacheKey(projetoId, mesYm);
  const hit = parcelasCache.get(key);
  if (!forceRefresh && hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.parcelas;
  }
  const { inicio, fim } = boundsMesYm(mesYm);
  const raw = await buscarParcelasPagarParaProjecao(inicio, fim, projetoId);
  const parcelas = raw.map(toBase);
  parcelasCache.set(key, { at: Date.now(), parcelas });
  return parcelas;
}

export function invalidarCacheProjecaoParcelas(
  projetoId?: number,
  mesYm?: string,
): void {
  if (projetoId == null) {
    parcelasCache.clear();
    return;
  }
  if (mesYm) {
    parcelasCache.delete(cacheKey(projetoId, mesYm));
    return;
  }
  const prefix = `${projetoId}:`;
  for (const k of Array.from(parcelasCache.keys())) {
    if (k.startsWith(prefix)) parcelasCache.delete(k);
  }
}

export async function carregarProjecaoDesembolso(
  projetoId: number,
  mesInicioYm: string,
  opts?: { forceRefreshCa?: boolean },
) {
  if (!/^\d{4}-\d{2}$/.test(mesInicioYm)) {
    throw new Error("Mês inicial inválido (AAAA-MM).");
  }

  const mesContextoYm = mesAnteriorProjecao(mesInicioYm);

  const [colunasDb, linhasDb, celulasDb, parcelasContexto] = await Promise.all([
    listProjecaoColunas(projetoId),
    listProjecaoLinhasManuais(projetoId),
    listProjecaoCelulaOverrides(projetoId),
    carregarParcelasBaseMes(
      projetoId,
      mesContextoYm,
      opts?.forceRefreshCa === true,
    ),
  ]);

  const colunasExtraYm = colunasDb.map(c => c.mesYm);

  const grade = montarProjecaoDesembolso({
    mesInicioYm,
    colunasExtraYm,
    parcelas: parcelasContexto,
    historico: [],
    linhasManuais: linhasDb.map(l => ({
      id: l.id,
      descricao: l.descricao,
      fornecedor: l.fornecedor,
      rubrica: l.rubrica,
      natureza: l.natureza,
    })),
    overrides: celulasDb.map(c => ({
      linhaId: c.linhaId,
      mesYm: c.mesYm,
      valorOverride:
        c.valorOverride == null ? null : Number(c.valorOverride),
      ativo: c.ativo,
    })),
  });

  return {
    mesInicioYm,
    ...grade,
    avisos: [
      "Base = somente o que foi PAGO no mês anterior (sem previsão aberta do Conta Azul).",
      "Essenciais (energia, aluguel, salário, insumos, lanches, embalagens, tarifas bancárias, combustível, hortifruti…) já entram como projetado recorrente.",
      "Demais itens: valor sugerido — marque o checkbox se vai continuar.",
      "Total da projeção = só os 3 meses à frente (mês anterior não entra).",
      "Mês anterior = contexto executado (somente leitura).",
    ],
  };
}

/**
 * Compara a projeção marcada no mês com o desembolsado Conta Azul,
 * e a receita (previsto / recebido / a receber) direto do Conta Azul.
 */
export async function carregarComparativoProjecao(
  projetoId: number,
  mesYm: string,
  opts?: { forceRefreshCa?: boolean },
) {
  if (!/^\d{4}-\d{2}$/.test(mesYm)) {
    throw new Error("Mês inválido (AAAA-MM).");
  }

  const { inicio: iniMes, fim: fimMes } = boundsMesYm(mesYm);

  const [grade, pagarMes, receberMes] = await Promise.all([
    carregarProjecaoDesembolso(projetoId, mesYm, {
      forceRefreshCa: opts?.forceRefreshCa,
    }),
    carregarParcelasBaseMes(projetoId, mesYm, opts?.forceRefreshCa === true),
    buscarParcelasReceberParaComparativo(iniMes, fimMes, projetoId).then(r =>
      r.map(toBase),
    ),
  ]);

  const comparativo = montarFinanceiroComparativo({
    mesYm,
    linhasProjecao: grade.linhas,
    parcelasPagarMes: pagarMes,
    parcelasReceberMes: receberMes,
  });

  return {
    ...comparativo,
    avisos: [
      "Desembolso: comparativo por rúbrica (projeção × pago Conta Azul).",
      "Descontos obtidos e transferências entre contas não entram (não são despesa).",
      "Pago em atraso = recorrente essencial pago no mês sem projeção (ex. competência do mês anterior).",
      "Receita: somente totais Conta Azul.",
    ],
  };
}

export {
  addProjecaoColuna,
  insertProjecaoLinhaManual,
  removeProjecaoColuna,
  softDeleteProjecaoLinhaManual,
  upsertProjecaoCelula,
};
