import {
  buscarParcelasPagarParaProjecao,
  buscarParcelasReceberParaComparativo,
  buscarParcelasReceberPorVencimento,
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
  addMonthsYm,
  mesAnteriorProjecao,
  montarProjecaoDesembolso,
  type ParcelaBaseProjecao,
} from "@shared/financeiroProjecaoDesembolso";
import { montarFinanceiroComparativo } from "@shared/financeiroComparativoProjecao";
import {
  agregarVendasPorCompetenciaDetalhe,
  agregarVendasPorDiaCompetencia,
  diasNoMesYm,
  somarVendasAteDia,
  somarVendasUltimosNDias,
  type PedidoCompetenciaInput,
} from "@shared/financeiroProjecaoVendas";
import {
  diaIsoAmericaSp,
  mesIsoAmericaSp,
} from "@shared/comercial/periodo-america-sp";
import type { ParcelaFinanceiraNorm } from "@shared/financeiroCfoInsights";
import { OrigemPedido } from "./comercial/generated/prisma/index.js";
import { getComercialPrisma } from "./comercial/db";
import { composicaoDoPedidoParaDashboard } from "./comercial/lib/composicao-valor.js";
import { classificarStatusPedido } from "./comercial/lib/pedido-status.js";

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
 * Totais de vendas + orçamentos por competência (orçamento ≤15 no mês; >15 no seguinte).
 * Também calcula “até o mesmo dia” e “últimos N dias” dos 2 meses anteriores.
 */
async function carregarTotaisVendasCompetencia(
  mesYm: string,
  opts: { hojeYm: string; diaHoje: number },
): Promise<{
  vendasFaturadasMes: number;
  orcamentosCompetenciaMes: number;
  vendasMesAtual: number;
  vendasAteDiaMesAnterior1: number;
  vendasAteDiaMesAnterior2: number;
  vendasRestanteMesAnterior1: number;
  vendasRestanteMesAnterior2: number;
}> {
  const mes1 = mesAnteriorProjecao(mesYm);
  const mes2 = mesAnteriorProjecao(mes1);
  const mes3 = mesAnteriorProjecao(mes2);
  const { inicio } = boundsMesYm(mes3);
  const { fim } = boundsMesYm(mesYm);

  const prisma = getComercialPrisma();
  const pedidos = await prisma.pedido.findMany({
    where: {
      origemPedido: OrigemPedido.CONTA_AZUL,
      dataPedido: { gte: inicio, lte: fim },
    },
    select: {
      dataPedido: true,
      statusPedido: true,
      valorTotal: true,
      valorBruto: true,
      valorFrete: true,
      valorDesconto: true,
      valorLiquido: true,
      composicaoDetalhada: true,
    },
  });

  const items: PedidoCompetenciaInput[] = [];
  for (const p of pedidos) {
    const cls = classificarStatusPedido(p.statusPedido);
    if (cls !== "venda" && cls !== "orcamento") continue;
    const liquido = composicaoDoPedidoParaDashboard(p).valorLiquido;
    if (!Number.isFinite(liquido) || liquido === 0) continue;
    items.push({
      dataPedidoIso: diaIsoAmericaSp(p.dataPedido),
      status: cls,
      valorLiquido: liquido,
    });
  }

  const porMes = agregarVendasPorCompetenciaDetalhe(items);
  const porDia = agregarVendasPorDiaCompetencia(items);
  const atual = porMes.get(mesYm) ?? { vendas: 0, orcamentos: 0, total: 0 };

  const diasNoMesRef = diasNoMesYm(mesYm);
  let diasRestantes: number;
  let diaCorte: number;
  if (mesYm < opts.hojeYm) {
    diasRestantes = 0;
    diaCorte = diasNoMesRef;
  } else if (mesYm > opts.hojeYm) {
    diasRestantes = diasNoMesRef;
    diaCorte = 0;
  } else {
    diaCorte = Math.min(Math.max(1, opts.diaHoje), diasNoMesRef);
    diasRestantes = Math.max(0, diasNoMesRef - diaCorte);
  }

  const d1 = diasNoMesYm(mes1);
  const d2 = diasNoMesYm(mes2);
  const ate1 = Math.min(diaCorte, d1);
  const ate2 = Math.min(diaCorte, d2);

  return {
    vendasFaturadasMes: atual.vendas,
    orcamentosCompetenciaMes: atual.orcamentos,
    vendasMesAtual: atual.total,
    vendasAteDiaMesAnterior1: somarVendasAteDia(porDia.get(mes1), ate1),
    vendasAteDiaMesAnterior2: somarVendasAteDia(porDia.get(mes2), ate2),
    vendasRestanteMesAnterior1: somarVendasUltimosNDias(
      porDia.get(mes1),
      d1,
      diasRestantes,
    ),
    vendasRestanteMesAnterior2: somarVendasUltimosNDias(
      porDia.get(mes2),
      d2,
      diasRestantes,
    ),
  };
}

/**
 * Compara a projeção marcada no mês com o desembolsado Conta Azul,
 * e a receita (previsto / recebido / a receber + vencido) do Conta Azul.
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
  // Vencidos: títulos com vencimento nos 24 meses anteriores ao mês atual.
  const { inicio: iniVencidos } = boundsMesYm(addMonthsYm(mesYm, -24));
  const fimVencidos = new Date(iniMes);
  fimVencidos.setDate(fimVencidos.getDate() - 1);
  fimVencidos.setHours(23, 59, 59, 999);

  const hojeIso = diaIsoAmericaSp();
  const hojeYm = mesIsoAmericaSp();
  const diaHoje = Number(hojeIso.slice(8, 10));

  const [grade, pagarMes, receberMes, receberVencidos, vendas] =
    await Promise.all([
      carregarProjecaoDesembolso(projetoId, mesYm, {
        forceRefreshCa: opts?.forceRefreshCa,
      }),
      carregarParcelasBaseMes(projetoId, mesYm, opts?.forceRefreshCa === true),
      buscarParcelasReceberParaComparativo(iniMes, fimMes, projetoId).then(r =>
        r.map(toBase),
      ),
      buscarParcelasReceberPorVencimento(
        iniVencidos,
        fimVencidos,
        projetoId,
      ).then(r => r.map(toBase)),
      carregarTotaisVendasCompetencia(mesYm, { hojeYm, diaHoje }),
    ]);

  const comparativo = montarFinanceiroComparativo({
    mesYm,
    linhasProjecao: grade.linhas,
    parcelasPagarMes: pagarMes,
    parcelasReceberMes: receberMes,
    parcelasReceberExtras: receberVencidos.filter(p => p.valorEmAberto > 0.009),
    vendasFaturadasMes: vendas.vendasFaturadasMes,
    orcamentosCompetenciaMes: vendas.orcamentosCompetenciaMes,
    vendasMesAtual: vendas.vendasMesAtual,
    vendasAteDiaMesAnterior1: vendas.vendasAteDiaMesAnterior1,
    vendasAteDiaMesAnterior2: vendas.vendasAteDiaMesAnterior2,
    vendasRestanteMesAnterior1: vendas.vendasRestanteMesAnterior1,
    vendasRestanteMesAnterior2: vendas.vendasRestanteMesAnterior2,
    hojeYm,
    diaHoje,
  });

  return {
    ...comparativo,
    avisos: [
      "Desembolso: comparativo por rúbrica (projeção × pago Conta Azul).",
      "Descontos obtidos e transferências entre contas não entram (não são despesa).",
      "A receber = só títulos em aberto com vencimento no mês (sem atrasados).",
      "Vencido = títulos em aberto com vencimento em meses anteriores (lista abaixo).",
      "Vendas = pedidos faturados; orçamentos ≤ dia 15 entram no mês; após o dia 15, no mês seguinte.",
      "Ainda entra = média do que foi vendido nos últimos N dias dos 2 meses anteriores (N = dias restantes).",
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
