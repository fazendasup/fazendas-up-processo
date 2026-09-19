import {
  buscarBaixasReceberPorPeriodoPagamento,
  buscarParcelasPagarParaProjecao,
  buscarParcelasReceberParaComparativo,
  fetchCatalogoCategorias,
  idsCategoriasReceitaVendas,
} from "./financeiroContaAzulFluxo";
import { buscarSaldosBancarios } from "./financeiroSaldosBancarios";
import {
  addProjecaoColuna,
  insertProjecaoLinhaManual,
  listProjecaoCelulaOverrides,
  listProjecaoColunas,
  listProjecaoLinhasManuais,
  listRubricasMesConcluidas,
  removeProjecaoColuna,
  softDeleteProjecaoLinhaManual,
  upsertProjecaoCelula,
  upsertRubricaMesConcluida,
} from "./financeiroProjecaoDb";
import {
  ehReceitaVendasCaixa,
  ehTransferenciaEntreContas,
  mesAnteriorProjecao,
  montarProjecaoDesembolso,
  labelMesYm,
  valorPagoParcela,
  agregarImpostosEncargosAtrasados,
  type ParcelaBaseProjecao,
} from "@shared/financeiroProjecaoDesembolso";
import {
  agregarReceitaCaixaPeriodo,
  aplicarRubricasConcluidas,
  montarComparativoDesembolsoMes,
  montarComparativoReceitaMes,
  montarFinanceiroComparativo,
  resumirBaixasPorCategoria,
  somarDesembolsoPagoPeriodo,
  somarRecebidoUltimosNDias,
  somarValorPagoParcelas,
} from "@shared/financeiroComparativoProjecao";
import {
  classificarRubricaDashboard,
  montarSerieDashboard3Meses,
  type FinanceiroDashboardPayload,
} from "@shared/financeiroDashboard";
import {
  resolverPeriodoDashboard,
  type DashboardGranularidade,
  type PeriodoDashboardResolvido,
} from "@shared/financeiroPeriodoDashboard";
import type {
  DashboardKpiDetalhe,
  DashboardKpiId,
  DashboardKpiLinha,
} from "@shared/financeiroDashboardKpi";
import {
  agregarVendasPorCompetenciaDetalhe,
  agregarVendasPorDiaCompetencia,
  DIA_LIMITE_ORCAMENTO_PADRAO,
  diasNoMesYm,
  somarVendasAteDia,
  somarVendasUltimosNDias,
  type FiltroOrcamentoCompetencia,
  type PedidoCompetenciaInput,
} from "@shared/financeiroProjecaoVendas";
import {
  diaIsoAmericaSp,
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
  mesIsoAmericaSp,
} from "@shared/comercial/periodo-america-sp";
import type { ParcelaFinanceiraNorm } from "@shared/financeiroCfoInsights";
import { OrigemPedido } from "./comercial/generated/prisma/index.js";
import { getComercialPrisma } from "./comercial/db";
import { composicaoDoPedidoParaDashboard } from "./comercial/lib/composicao-valor.js";
import { classificarStatusPedido } from "./comercial/lib/pedido-status.js";

/** Limites do mês no calendário America/Sao_Paulo (alinhado ao Conta Azul). */
function boundsMesYmAmericaSp(ym: string): { inicio: Date; fim: Date } {
  const [y, m] = ym.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  return {
    inicio: inicioDiaAmericaSp(`${ym}-01`),
    fim: fimDiaAmericaSp(
      `${ym}-${String(ultimoDia).padStart(2, "0")}`,
    ),
  };
}

/** Últimos N dias civis do mês (America/SP). */
function boundsUltimosNDiasMesYm(
  mesYm: string,
  nDias: number,
): { inicio: Date; fim: Date } {
  const [y, m] = mesYm.split("-").map(Number);
  const diasNoMes = new Date(y, m, 0).getDate();
  const n = Math.min(Math.max(0, Math.floor(nDias)), diasNoMes);
  if (n <= 0) {
    const vazio = inicioDiaAmericaSp(`${mesYm}-01`);
    return { inicio: vazio, fim: vazio };
  }
  const diaInicio = diasNoMes - n + 1;
  return {
    inicio: inicioDiaAmericaSp(
      `${mesYm}-${String(diaInicio).padStart(2, "0")}`,
    ),
    fim: fimDiaAmericaSp(`${mesYm}-${String(diasNoMes).padStart(2, "0")}`),
  };
}

function mediaDeDoisPositivos(a: number, b: number): number {
  const temA = a > 0;
  const temB = b > 0;
  const n = (temA ? 1 : 0) + (temB ? 1 : 0);
  if (n === 0) return 0;
  return Math.round((((temA ? a : 0) + (temB ? b : 0)) / n) * 100) / 100;
}

function toBase(p: ParcelaFinanceiraNorm): ParcelaBaseProjecao {
  const original = p.categoriaOriginal?.trim() || null;
  const atual = p.categoria?.trim() || null;
  const categorias = Array.from(
    new Set(
      [
        ...(p.categorias ?? []),
        atual,
        original,
      ]
        .map(s => (s ?? "").trim())
        .filter(Boolean),
    ),
  );
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
    categorias: categorias.length ? categorias : undefined,
    entradaDre: p.entradaDre?.trim() || null,
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
  const { inicio, fim } = boundsMesYmAmericaSp(mesYm);
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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Média de faturamento dos 3 meses imediatamente anteriores a `mesAtualYm`
 * (não inclui o mês atual). Ex.: 2026-09 → jun, jul, ago.
 *
 * Fonte: pedidos Conta Azul por **mês da venda** (data do pedido),
 * valor líquido = bruto + frete − desconto — mesmo critério do
 * relatório “Total de vendas por mês” do Conta Azul.
 */
async function carregarMediaFaturamento3Meses(
  _projetoId: number,
  mesAtualYm: string,
): Promise<{
  mensal: number;
  meses: Array<{ mesYm: string; vendas: number }>;
}> {
  const m2 = mesAnteriorProjecao(mesAtualYm);
  const m1 = mesAnteriorProjecao(m2);
  const m0 = mesAnteriorProjecao(m1);
  const lista = [m0, m1, m2];
  const porMes = new Map(lista.map(ym => [ym, 0]));

  const { inicio } = boundsMesYmAmericaSp(m0);
  const { fim } = boundsMesYmAmericaSp(m2);

  try {
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

    for (const p of pedidos) {
      if (classificarStatusPedido(p.statusPedido) !== "venda") continue;
      const liquido = composicaoDoPedidoParaDashboard(p).valorLiquido;
      if (!Number.isFinite(liquido) || liquido === 0) continue;
      const ym = diaIsoAmericaSp(p.dataPedido).slice(0, 7);
      if (!porMes.has(ym)) continue;
      porMes.set(ym, (porMes.get(ym) ?? 0) + liquido);
    }
  } catch (err) {
    console.error(
      `[financeiro] mediaFaturamento pedidos:`,
      err instanceof Error ? err.message : err,
    );
  }

  const meses = lista.map(ym => ({
    mesYm: ym,
    vendas: roundMoney(porMes.get(ym) ?? 0),
  }));
  const mensal =
    meses.length > 0
      ? roundMoney(meses.reduce((s, m) => s + m.vendas, 0) / meses.length)
      : 0;

  return { mensal, meses };
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

  // Média dos 3 meses anteriores ao mês de referência da projeção
  // (ex.: set → jun/jul/ago), não o mês contexto nem o mês atual.
  const fat = await carregarMediaFaturamento3Meses(projetoId, mesInicioYm);
  const mesesHorizonte = grade.colunas.filter(c => c.contaNoTotal).length;
  const mediaFaturamentoTotalHorizonte = roundMoney(
    fat.mensal * mesesHorizonte,
  );

  return {
    mesInicioYm,
    ...grade,
    mediaFaturamento: {
      mensal: fat.mensal,
      totalHorizonte: mediaFaturamentoTotalHorizonte,
      meses: fat.meses,
      mesesHorizonte,
    },
    avisos: [
      "Base = somente o que foi PAGO no mês anterior (sem previsão aberta do Conta Azul).",
      "Essenciais (energia, aluguel, salário, insumos, lanches, embalagens, tarifas bancárias, combustível, hortifruti…) já entram como projetado recorrente.",
      "Demais itens: valor sugerido — marque o checkbox se vai continuar.",
      "Total da projeção = só os 3 meses à frente (mês anterior não entra).",
      "Média fat. = vendas Conta Azul (líquido = bruto + frete − desconto) dos 3 meses anteriores ao mês atual, por data do pedido; total = média × meses da projeção.",
      "Mês anterior = contexto executado (somente leitura).",
    ],
  };
}

/**
 * Totais de vendas + orçamentos (dia limite + clientes configuráveis).
 * Também calcula “até o mesmo dia” e “últimos N dias” dos 2 meses anteriores.
 */
async function carregarTotaisVendasCompetencia(
  mesYm: string,
  opts: {
    hojeYm: string;
    diaHoje: number;
    filtroOrcamento?: FiltroOrcamentoCompetencia;
  },
): Promise<{
  vendasFaturadasMes: number;
  orcamentosCompetenciaMes: number;
  vendasMesAtual: number;
  vendasAteDiaMesAnterior1: number;
  vendasAteDiaMesAnterior2: number;
  vendasRestanteMesAnterior1: number;
  vendasRestanteMesAnterior2: number;
  clientesOrcamentoOpcoes: Array<{ id: string; nome: string }>;
  diaLimiteOrcamento: number;
  porMes: Array<{
    mesYm: string;
    vendas: number;
    orcamentos: number;
    total: number;
  }>;
}> {
  const filtro: FiltroOrcamentoCompetencia = {
    diaLimiteOrcamento:
      opts.filtroOrcamento?.diaLimiteOrcamento ?? DIA_LIMITE_ORCAMENTO_PADRAO,
    clienteIdsOrcamento: opts.filtroOrcamento?.clienteIdsOrcamento ?? null,
  };
  const mes1 = mesAnteriorProjecao(mesYm);
  const mes2 = mesAnteriorProjecao(mes1);
  const mes3 = mesAnteriorProjecao(mes2);
  const { inicio } = boundsMesYmAmericaSp(mes3);
  const { fim } = boundsMesYmAmericaSp(mesYm);

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
      clienteId: true,
      cliente: { select: { id: true, nome: true } },
    },
  });

  const items: PedidoCompetenciaInput[] = [];
  const clientesMap = new Map<string, string>();
  for (const p of pedidos) {
    const cls = classificarStatusPedido(p.statusPedido);
    if (cls !== "venda" && cls !== "orcamento") continue;
    const liquido = composicaoDoPedidoParaDashboard(p).valorLiquido;
    if (!Number.isFinite(liquido) || liquido === 0) continue;
    const dataPedidoIso = diaIsoAmericaSp(p.dataPedido);
    // Lista do filtro: só clientes com orçamento no mês selecionado.
    if (
      cls === "orcamento" &&
      p.clienteId &&
      dataPedidoIso.slice(0, 7) === mesYm
    ) {
      clientesMap.set(
        p.clienteId,
        p.cliente?.nome?.trim() || p.clienteId,
      );
    }
    items.push({
      dataPedidoIso,
      status: cls,
      valorLiquido: liquido,
      clienteId: p.clienteId,
      clienteNome: p.cliente?.nome ?? null,
    });
  }

  const porMes = agregarVendasPorCompetenciaDetalhe(items, filtro);
  const porDia = agregarVendasPorDiaCompetencia(items, filtro);
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

  const clientesOrcamentoOpcoes = Array.from(clientesMap.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

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
    clientesOrcamentoOpcoes,
    diaLimiteOrcamento: filtro.diaLimiteOrcamento ?? DIA_LIMITE_ORCAMENTO_PADRAO,
    porMes: [
      {
        mesYm: mes2,
        vendas: (porMes.get(mes2) ?? { vendas: 0, orcamentos: 0, total: 0 }).vendas,
        orcamentos: (porMes.get(mes2) ?? { vendas: 0, orcamentos: 0, total: 0 })
          .orcamentos,
        total: (porMes.get(mes2) ?? { vendas: 0, orcamentos: 0, total: 0 }).total,
      },
      {
        mesYm: mes1,
        vendas: (porMes.get(mes1) ?? { vendas: 0, orcamentos: 0, total: 0 }).vendas,
        orcamentos: (porMes.get(mes1) ?? { vendas: 0, orcamentos: 0, total: 0 })
          .orcamentos,
        total: (porMes.get(mes1) ?? { vendas: 0, orcamentos: 0, total: 0 }).total,
      },
      {
        mesYm,
        vendas: atual.vendas,
        orcamentos: atual.orcamentos,
        total: atual.total,
      },
    ],
  };
}

/**
 * Compara a projeção marcada no mês com o desembolsado Conta Azul,
 * e a receita (previsto / recebido / a receber + vencido) do Conta Azul.
 */
export async function carregarComparativoProjecao(
  projetoId: number,
  mesYm: string,
  opts?: {
    forceRefreshCa?: boolean;
    diaLimiteOrcamento?: number;
    clienteIdsOrcamento?: string[];
  },
) {
  if (!/^\d{4}-\d{2}$/.test(mesYm)) {
    throw new Error("Mês inválido (AAAA-MM).");
  }

  const { inicio: iniMes, fim: fimMes } = boundsMesYmAmericaSp(mesYm);

  const hojeIso = diaIsoAmericaSp();
  const hojeYm = mesIsoAmericaSp();
  const diaHoje = Number(hojeIso.slice(8, 10));
  const mes1 = mesAnteriorProjecao(mesYm);
  const mes2 = mesAnteriorProjecao(mes1);
  const diasNoMesRef = diasNoMesYm(mesYm);
  let diasRestantes: number;
  if (mesYm < hojeYm) diasRestantes = 0;
  else if (mesYm > hojeYm) diasRestantes = diasNoMesRef;
  else {
    const diaCorte = Math.min(Math.max(1, diaHoje), diasNoMesRef);
    diasRestantes = Math.max(0, diasNoMesRef - diaCorte);
  }
  const filtroOrcamento: FiltroOrcamentoCompetencia = {
    diaLimiteOrcamento:
      opts?.diaLimiteOrcamento ?? DIA_LIMITE_ORCAMENTO_PADRAO,
    clienteIdsOrcamento: opts?.clienteIdsOrcamento?.length
      ? opts.clienteIdsOrcamento
      : null,
  };

  const catalogo = await fetchCatalogoCategorias();
  const idsVendas = idsCategoriasReceitaVendas(catalogo);
  // Sempre busca todas as baixas do período; filtro de vendas/investimento no cliente.

  const [grade, pagarMes, receberMes, baixas1, baixas2, receber1, receber2, vendas, rubricasConcluidas] =
    await Promise.all([
      carregarProjecaoDesembolso(projetoId, mesYm, {
        forceRefreshCa: opts?.forceRefreshCa,
      }),
      carregarParcelasBaseMes(projetoId, mesYm, opts?.forceRefreshCa === true),
      buscarParcelasReceberParaComparativo(iniMes, fimMes, projetoId).then(r =>
        r.map(toBase),
      ),
      diasRestantes > 0
        ? buscarBaixasReceberPorPeriodoPagamento(
            boundsUltimosNDiasMesYm(mes1, diasRestantes).inicio,
            boundsUltimosNDiasMesYm(mes1, diasRestantes).fim,
            projetoId,
          ).then(r => r.map(toBase))
        : Promise.resolve([] as ParcelaBaseProjecao[]),
      diasRestantes > 0
        ? buscarBaixasReceberPorPeriodoPagamento(
            boundsUltimosNDiasMesYm(mes2, diasRestantes).inicio,
            boundsUltimosNDiasMesYm(mes2, diasRestantes).fim,
            projetoId,
          ).then(r => r.map(toBase))
        : Promise.resolve([] as ParcelaBaseProjecao[]),
      buscarParcelasReceberParaComparativo(
        boundsMesYmAmericaSp(mes1).inicio,
        boundsMesYmAmericaSp(mes1).fim,
        projetoId,
      ).then(r => r.map(toBase)),
      buscarParcelasReceberParaComparativo(
        boundsMesYmAmericaSp(mes2).inicio,
        boundsMesYmAmericaSp(mes2).fim,
        projetoId,
      ).then(r => r.map(toBase)),
      carregarTotaisVendasCompetencia(mesYm, {
        hojeYm,
        diaHoje,
        filtroOrcamento,
      }),
      listRubricasMesConcluidas(projetoId, mesYm),
    ]);

  // Preferência: baixas no período (API). Fallback: média do recebido do mês × N/dias.
  const recebidoRestante1 = (() => {
    const viaApi = somarValorPagoParcelas(baixas1);
    if (viaApi > 0) return viaApi;
    return somarRecebidoUltimosNDias(receber1, mes1, diasRestantes);
  })();
  const recebidoRestante2 = (() => {
    const viaApi = somarValorPagoParcelas(baixas2);
    if (viaApi > 0) return viaApi;
    return somarRecebidoUltimosNDias(receber2, mes2, diasRestantes);
  })();

  const catsBaixas = resumirBaixasPorCategoria([...baixas1, ...baixas2], {
    top: 6,
  });
  const avisoCats =
    catsBaixas.length > 0
      ? "Categorias nas baixas jul/ago (últimos N dias): " +
        catsBaixas
          .map(
            c =>
              `${c.rubrica} R$ ${c.total.toLocaleString("pt-BR")}${c.incluido ? "" : " [excluída]"}`,
          )
          .join(" · ")
      : "Sem baixas no período dos 2 meses anteriores.";

  const comparativo = montarFinanceiroComparativo({
    mesYm,
    linhasProjecao: grade.linhas,
    parcelasPagarMes: pagarMes,
    parcelasReceberMes: receberMes,
    vendasFaturadasMes: vendas.vendasFaturadasMes,
    orcamentosCompetenciaMes: vendas.orcamentosCompetenciaMes,
    vendasMesAtual: vendas.vendasMesAtual,
    vendasAteDiaMesAnterior1: vendas.vendasAteDiaMesAnterior1,
    vendasAteDiaMesAnterior2: vendas.vendasAteDiaMesAnterior2,
    vendasRestanteMesAnterior1: recebidoRestante1,
    vendasRestanteMesAnterior2: recebidoRestante2,
    hojeYm,
    diaHoje,
    rubricasConcluidas,
  });

  return {
    ...comparativo,
    orcamentoFiltros: {
      diaLimiteOrcamento: vendas.diaLimiteOrcamento,
      clienteIdsOrcamento: filtroOrcamento.clienteIdsOrcamento ?? [],
      clientesOpcoes: vendas.clientesOrcamentoOpcoes,
    },
    avisos: [
      "Caixa (já recebido / a receber / vencido) = Conta Azul ao vivo por vencimento e pagamento.",
      `Ainda entra = média das baixas (vendas + frete, sem investimento/aporte${idsVendas.length ? `; DRE vendas no catálogo: ${idsVendas.length} cat.` : ""}).`,
      avisoCats,
      "Já faturado = pedidos sincronizados (status venda). Orçamento ainda não é caixa.",
      `Orçamentos: até o dia ${vendas.diaLimiteOrcamento}` +
        (filtroOrcamento.clienteIdsOrcamento?.length
          ? ` · ${filtroOrcamento.clienteIdsOrcamento.length} cliente(s) selecionado(s)`
          : " · todos os clientes"),
    ],
  };
}

/**
 * Dashboard principal: série 3 meses (âncora) + snapshot do período.
 */
export type CarregarFinanceiroDashboardInput = {
  granularidade?: DashboardGranularidade;
  /** dia/semana: YYYY-MM-DD · mes: YYYY-MM · ano: YYYY */
  ref?: string;
  /** Alias legado de ref quando granularidade=mes. */
  mesYm?: string;
  forceRefreshCa?: boolean;
};

export async function carregarFinanceiroDashboard(
  projetoId: number,
  mesYmOuInput: string | CarregarFinanceiroDashboardInput,
  optsLegacy?: { forceRefreshCa?: boolean },
) {
  const input: CarregarFinanceiroDashboardInput =
    typeof mesYmOuInput === "string"
      ? {
          granularidade: "mes",
          ref: mesYmOuInput,
          forceRefreshCa: optsLegacy?.forceRefreshCa,
        }
      : mesYmOuInput;

  const granularidade = input.granularidade ?? "mes";
  const refBruta = input.ref ?? input.mesYm;
  if (!refBruta) throw new Error("Informe ref ou mesYm.");

  const periodo: PeriodoDashboardResolvido = resolverPeriodoDashboard(
    granularidade,
    refBruta,
  );
  const mesYm = periodo.mesYmAncora;
  if (!/^\d{4}-\d{2}$/.test(mesYm)) {
    throw new Error("Mês âncora inválido (AAAA-MM).");
  }

  const mes1 = mesAnteriorProjecao(mesYm);
  const mes2 = mesAnteriorProjecao(mes1);
  const hojeIso = diaIsoAmericaSp();
  const hojeYm = mesIsoAmericaSp();
  const diaHoje = Number(hojeIso.slice(8, 10));
  const force = input.forceRefreshCa === true;

  const bounds = (ym: string) => boundsMesYmAmericaSp(ym);

  const catalogo = await fetchCatalogoCategorias();
  const idsVendas = idsCategoriasReceitaVendas(catalogo);

  const [
    gradeSerie,
    gradeAtual,
    pagar2,
    pagar1,
    pagarMes,
    receber2,
    receber1,
    receberMes,
    baixasRest1,
    baixasRest2,
    vendas,
    pagarPeriodo,
    receberPeriodo,
    rubricasConcluidas,
    saldoCa,
  ] = await Promise.all([
    carregarProjecaoDesembolso(projetoId, mes2, { forceRefreshCa: force }),
    carregarProjecaoDesembolso(projetoId, mesYm, { forceRefreshCa: force }),
    carregarParcelasBaseMes(projetoId, mes2, force),
    carregarParcelasBaseMes(projetoId, mes1, force),
    carregarParcelasBaseMes(projetoId, mesYm, force),
    buscarParcelasReceberParaComparativo(
      bounds(mes2).inicio,
      bounds(mes2).fim,
      projetoId,
    ).then(r => r.map(toBase)),
    buscarParcelasReceberParaComparativo(
      bounds(mes1).inicio,
      bounds(mes1).fim,
      projetoId,
    ).then(r => r.map(toBase)),
    buscarParcelasReceberParaComparativo(
      bounds(mesYm).inicio,
      bounds(mesYm).fim,
      projetoId,
    ).then(r => r.map(toBase)),
    (async () => {
      const diasNoMesRef = diasNoMesYm(mesYm);
      let n = 0;
      if (mesYm < hojeYm) n = 0;
      else if (mesYm > hojeYm) n = diasNoMesRef;
      else {
        const diaCorte = Math.min(Math.max(1, diaHoje), diasNoMesRef);
        n = Math.max(0, diasNoMesRef - diaCorte);
      }
      if (n <= 0) return [] as ParcelaBaseProjecao[];
      const b = boundsUltimosNDiasMesYm(mes1, n);
      return (
        await buscarBaixasReceberPorPeriodoPagamento(b.inicio, b.fim, projetoId)
      ).map(toBase);
    })(),
    (async () => {
      const diasNoMesRef = diasNoMesYm(mesYm);
      let n = 0;
      if (mesYm < hojeYm) n = 0;
      else if (mesYm > hojeYm) n = diasNoMesRef;
      else {
        const diaCorte = Math.min(Math.max(1, diaHoje), diasNoMesRef);
        n = Math.max(0, diasNoMesRef - diaCorte);
      }
      if (n <= 0) return [] as ParcelaBaseProjecao[];
      const b = boundsUltimosNDiasMesYm(mes2, n);
      return (
        await buscarBaixasReceberPorPeriodoPagamento(b.inicio, b.fim, projetoId)
      ).map(toBase);
    })(),
    carregarTotaisVendasCompetencia(mesYm, {
      hojeYm,
      diaHoje,
      // Dashboard: orçamento do mês inteiro (sem corte no dia 15).
      filtroOrcamento: { diaLimiteOrcamento: 31 },
    }),
    periodo.planoAlinhadoAoPeriodo
      ? Promise.resolve([] as ParcelaBaseProjecao[])
      : buscarParcelasPagarParaProjecao(
          periodo.inicio,
          periodo.fim,
          projetoId,
        ).then(r => r.map(toBase)),
    periodo.planoAlinhadoAoPeriodo
      ? Promise.resolve([] as ParcelaBaseProjecao[])
      : buscarParcelasReceberParaComparativo(
          periodo.inicio,
          periodo.fim,
          projetoId,
        ).then(r => r.map(toBase)),
    listRubricasMesConcluidas(projetoId, mesYm),
    buscarSaldosBancarios(projetoId).catch(() => ({
      saldoBancario: null as number | null,
      saldoContaAzul: null as number | null,
      saldoBradesco: null as number | null,
      saldoBradescoFonte: null as "manual_mais_movimentos" | null,
      movimentos: null as { recebido: number; pago: number } | null,
      contas: [] as Array<{
        id: string;
        nome: string;
        saldo: number | null;
        grupo: "conta_azul" | "bradesco" | "outro";
        tipo: string | null;
        banco: string | null;
      }>,
      bradescoConfig: {
        saldoInicial: null as number | null,
        saldoInicialData: null as string | null,
        contaId: null as string | null,
      },
      aviso: "Falha ao consultar saldos bancários.",
    })),
  ]);

  const desembolsoDe = (
    ym: string,
    linhas: typeof gradeSerie.linhas,
    pagar: typeof pagarMes,
  ) =>
    montarComparativoDesembolsoMes({
      mesYm: ym,
      linhasProjecao: linhas,
      parcelasPagarMes: pagar,
    });

  const receitaDe = (ym: string, receber: typeof receberMes) =>
    montarComparativoReceitaMes({
      mesYm: ym,
      parcelasReceberMes: receber,
      hojeYm,
      diaHoje,
    });

  // Grade série (início em mes−2) tem células dos 3 meses; mês atual
  // usa a grade “oficial” do comparativo para o projetado do mês.
  const d2 = desembolsoDe(mes2, gradeSerie.linhas, pagar2);
  const d1 = desembolsoDe(mes1, gradeSerie.linhas, pagar1);
  const dMes = aplicarRubricasConcluidas(
    desembolsoDe(mesYm, gradeAtual.linhas, pagarMes),
    rubricasConcluidas,
  );

  const diasNoMesRef = diasNoMesYm(mesYm);
  let diasRestantes: number;
  if (mesYm < hojeYm) diasRestantes = 0;
  else if (mesYm > hojeYm) diasRestantes = diasNoMesRef;
  else {
    const diaCorte = Math.min(Math.max(1, diaHoje), diasNoMesRef);
    diasRestantes = Math.max(0, diasNoMesRef - diaCorte);
  }
  const recebidoRestante1 = (() => {
    const viaApi = somarValorPagoParcelas(baixasRest1);
    if (viaApi > 0) return viaApi;
    return somarRecebidoUltimosNDias(receber1, mes1, diasRestantes);
  })();
  const recebidoRestante2 = (() => {
    const viaApi = somarValorPagoParcelas(baixasRest2);
    if (viaApi > 0) return viaApi;
    return somarRecebidoUltimosNDias(receber2, mes2, diasRestantes);
  })();
  const mediaCaixaRestante =
    diasRestantes > 0
      ? mediaDeDoisPositivos(recebidoRestante1, recebidoRestante2)
      : 0;

  const r2 = receitaDe(mes2, receber2);
  const r1 = receitaDe(mes1, receber1);
  const rMes = montarComparativoReceitaMes({
    mesYm,
    parcelasReceberMes: receberMes,
    vendasFaturadasMes: vendas.vendasFaturadasMes,
    orcamentosCompetenciaMes: vendas.orcamentosCompetenciaMes,
    vendasMesAtual: vendas.vendasMesAtual,
    vendasAteDiaMesAnterior1: vendas.vendasAteDiaMesAnterior1,
    vendasAteDiaMesAnterior2: vendas.vendasAteDiaMesAnterior2,
    vendasRestanteMesAnterior1: recebidoRestante1,
    vendasRestanteMesAnterior2: recebidoRestante2,
    hojeYm,
    diaHoje,
  });

  const vPor = new Map(vendas.porMes.map(v => [v.mesYm, v]));
  const v2 = vPor.get(mes2) ?? { vendas: 0, orcamentos: 0, total: 0 };
  const v1 = vPor.get(mes1) ?? { vendas: 0, orcamentos: 0, total: 0 };
  const vMes = vPor.get(mesYm) ?? {
    vendas: vendas.vendasFaturadasMes,
    orcamentos: vendas.orcamentosCompetenciaMes,
    total: vendas.vendasMesAtual,
  };

  const serie3Meses = montarSerieDashboard3Meses({
    mesYm,
    meses: [
      {
        mesYm: mes2,
        vendasFaturadas: v2.vendas,
        orcamentos: v2.orcamentos,
        vendasReal: v2.total,
        desembolsoProjetado: d2.totais.projetado,
        desembolsoPago: d2.totais.pago,
        previsto: r2.previsto,
        recebido: r2.recebido,
        aReceber: r2.aReceber,
      },
      {
        mesYm: mes1,
        vendasFaturadas: v1.vendas,
        orcamentos: v1.orcamentos,
        vendasReal: v1.total,
        desembolsoProjetado: d1.totais.projetado,
        desembolsoPago: d1.totais.pago,
        previsto: r1.previsto,
        recebido: r1.recebido,
        aReceber: r1.aReceber,
      },
      {
        mesYm,
        vendasFaturadas: vMes.vendas,
        orcamentos: vMes.orcamentos,
        vendasReal: vMes.vendas,
        // Projetado = faturado + ainda entra (caixa). Orçamento não entra.
        vendasProjetado: vMes.vendas + mediaCaixaRestante,
        desembolsoProjetado: dMes.totais.projetadoEfetivo,
        desembolsoPago: dMes.totais.pago,
        previsto: rMes.previsto,
        recebido: rMes.recebido,
        aReceber: rMes.aReceber,
      },
    ],
  });

  const mesAtual = serie3Meses[2]!;
  const naoPlanejadoDash = Math.round(
    ((dMes.totais.pagoEmAtraso ?? 0) + (dMes.totais.pagoAMais ?? 0)) * 100,
  ) / 100;
  const gapCaixaMes = Math.round(
    (rMes.projecaoVendas.projecaoMesTotal -
      dMes.totais.projetadoEfetivo -
      naoPlanejadoDash) *
      100,
  ) / 100;

  const periodoMeta = {
    granularidade: periodo.granularidade,
    ref: periodo.ref,
    inicioIso: periodo.inicioIso,
    fimIso: periodo.fimIso,
    label: periodo.label,
    mesYmAncora: periodo.mesYmAncora,
    planoAlinhadoAoPeriodo: periodo.planoAlinhadoAoPeriodo,
  };

  let receitaOut = {
    previsto: rMes.previsto,
    recebido: rMes.recebido,
    aReceberNoMes: rMes.aReceberNoMes,
    vencido: rMes.vencido,
    aReceber: rMes.aReceber,
    pctRecebidoDoPrevisto: rMes.pctRecebidoDoPrevisto,
    vendasCompetencia: rMes.vendasCompetencia,
  };
  let desembolsoTotaisOut = { ...dMes.totais };
  let saldoRealizado = mesAtual.saldoCaixa;
  const avisos: string[] = [
      `Ainda entra = baixas do período (só venda, ou venda+frete; sem aporte)${idsVendas.length ? ` (catálogo DRE vendas: ${idsVendas.length})` : ""}.`,
    (() => {
      const cats = resumirBaixasPorCategoria(
        [...baixasRest1, ...baixasRest2],
        { top: 6 },
      );
      if (!cats.length) return "Sem baixas nos últimos N dias de jul/ago.";
      return (
        "Categorias nas baixas: " +
        cats
          .map(
            c =>
              `${c.rubrica} R$ ${c.total.toLocaleString("pt-BR")}${c.incluido ? "" : " [excluída]"}`,
          )
          .join(" · ")
      );
    })(),
    "Projeção de fechar (caixa) = recebido + ainda entra (sem a receber).",
    "Faturado/orçamento = volume de pedidos — não some com recebido.",
  ];
  if (saldoCa.aviso) avisos.push(saldoCa.aviso);

  // Dia/semana/ano: KPIs de caixa no intervalo; plano/mapa ficam no mês âncora.
  if (!periodo.planoAlinhadoAoPeriodo) {
    const caixaPeriodo = agregarReceitaCaixaPeriodo({
      parcelasReceber: receberPeriodo,
      inicioIso: periodo.inicioIso,
      fimIso: periodo.fimIso,
      hojeIso,
    });
    const pagoPeriodo = somarDesembolsoPagoPeriodo(
      pagarPeriodo,
      periodo.inicioIso,
      periodo.fimIso,
    );
    receitaOut = {
      ...receitaOut,
      previsto: caixaPeriodo.previsto,
      recebido: caixaPeriodo.recebido,
      aReceberNoMes: caixaPeriodo.aReceberNoMes,
      vencido: caixaPeriodo.vencido,
      aReceber: caixaPeriodo.aReceber,
      pctRecebidoDoPrevisto: caixaPeriodo.pctRecebidoDoPrevisto,
    };
    desembolsoTotaisOut = {
      ...desembolsoTotaisOut,
      pago: pagoPeriodo,
      desvio: Math.round((pagoPeriodo - desembolsoTotaisOut.projetado) * 100) / 100,
      desvioPct:
        desembolsoTotaisOut.projetado > 0
          ? Math.round(
              ((pagoPeriodo - desembolsoTotaisOut.projetado) /
                desembolsoTotaisOut.projetado) *
                10_000,
            ) / 100
          : null,
      pctPagoDoProjetado:
        desembolsoTotaisOut.projetado > 0
          ? Math.round((pagoPeriodo / desembolsoTotaisOut.projetado) * 10_000) /
            100
          : null,
    };
    saldoRealizado =
      Math.round((caixaPeriodo.recebido - pagoPeriodo) * 100) / 100;
    avisos.unshift(
      `Caixa filtrado: ${periodo.label}. Plano / mapa / saldo projetado = mês ${labelMesYm(mesYm)}.`,
    );
  }

  const impostosEncargosAtrasados = agregarImpostosEncargosAtrasados(
    [...pagar2, ...pagar1, ...pagarMes, ...pagarPeriodo],
    hojeIso,
  );

  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    periodo: periodoMeta,
    serie3Meses,
    mesAtual,
    projecaoVendas: rMes.projecaoVendas,
    caixa: {
      saldoRealizado,
      gapCaixaMes,
    },
    saldoContaAzul: saldoCa.saldoBancario ?? saldoCa.saldoContaAzul,
    saldoBancario: saldoCa.saldoBancario ?? saldoCa.saldoContaAzul,
    saldoBradesco: null,
    saldoBradescoFonte: saldoCa.saldoBradescoFonte,
    movimentosSaldo: saldoCa.movimentos,
    bradescoConfig: saldoCa.bradescoConfig,
    contasContaAzul: [],
    desembolsoTotais: desembolsoTotaisOut,
    desembolsoPorRubrica: dMes.rubricas
      .map(r =>
        classificarRubricaDashboard({
          rubrica: r.rubrica,
          projetado: r.projetado,
          pago: r.pago,
          naoPago: r.naoPago,
          pagoAMais: r.pagoAMais,
          status: r.status,
        }),
      )
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => b.valorAcao - a.valorAcao),
    receita: receitaOut,
    impostosEncargosAtrasados: {
      total: impostosEncargosAtrasados.total,
      qtd: impostosEncargosAtrasados.qtd,
    },
    avisos,
  } satisfies FinanceiroDashboardPayload;
}

function fmtDataBr(iso: string | null | undefined): string | null {
  const s = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Linhas por trás de cada KPI do dashboard (auditoria do número).
 */
export async function carregarDashboardKpiDetalhe(
  projetoId: number,
  mesYmOuInput:
    | string
    | {
        granularidade?: DashboardGranularidade;
        ref?: string;
        mesYm?: string;
      },
  kpi: DashboardKpiId,
): Promise<DashboardKpiDetalhe> {
  const raw =
    typeof mesYmOuInput === "string"
      ? { granularidade: "mes" as const, ref: mesYmOuInput }
      : mesYmOuInput;
  const granularidade = raw.granularidade ?? "mes";
  const refBruta = raw.ref ?? raw.mesYm;
  if (!refBruta) throw new Error("Informe ref ou mesYm.");
  const periodo = resolverPeriodoDashboard(granularidade, refBruta);
  const mesYm = periodo.mesYmAncora;
  if (!/^\d{4}-\d{2}$/.test(mesYm)) {
    throw new Error("Mês inválido (AAAA-MM).");
  }

  const hojeIso = diaIsoAmericaSp();
  const hojeYm = mesIsoAmericaSp();
  const diaHoje = Number(hojeIso.slice(8, 10));
  const labelMes = periodo.planoAlinhadoAoPeriodo
    ? labelMesYm(mesYm)
    : periodo.label;
  const base = {
    kpi,
    mesYm,
    labelMes,
  };

  const linhasDe = (
    rows: DashboardKpiLinha[],
    titulo: string,
    descricao: string,
    total?: number,
  ): DashboardKpiDetalhe => ({
    ...base,
    titulo,
    descricao,
    total:
      total ??
      Math.round(rows.reduce((s, r) => s + r.valor, 0) * 100) / 100,
    linhas: rows,
  });

  if (
    kpi === "plano" ||
    kpi === "executado" ||
    kpi === "ainda-cabe" ||
    kpi === "nao-planejado" ||
    kpi === "saldo-liberado"
  ) {
    const grade = await carregarProjecaoDesembolso(projetoId, mesYm);
    const pagar = await carregarParcelasBaseMes(projetoId, mesYm);
    const dBase = montarComparativoDesembolsoMes({
      mesYm,
      linhasProjecao: grade.linhas,
      parcelasPagarMes: pagar,
    });
    const concluidas =
      kpi === "saldo-liberado" || kpi === "ainda-cabe"
        ? await listRubricasMesConcluidas(projetoId, mesYm)
        : [];
    const d =
      concluidas.length > 0
        ? aplicarRubricasConcluidas(dBase, concluidas)
        : dBase;

    if (kpi === "plano") {
      const linhas: DashboardKpiLinha[] = [];
      for (const rub of d.rubricas) {
        for (const det of rub.detalhes.filter(x => x.origem === "projetado")) {
          linhas.push({
            id: det.id,
            titulo: det.label,
            subtitulo: det.fornecedor,
            valor: det.valor,
            meta: null,
            grupo: rub.rubrica,
          });
        }
      }
      linhas.sort((a, b) => b.valor - a.valor);
      return linhasDe(
        linhas,
        "Plano (projetado)",
        "Linhas ativas da grade de desembolso neste mês.",
        d.totais.projetado,
      );
    }

    if (kpi === "executado") {
      const linhas: DashboardKpiLinha[] = [];
      for (const rub of d.rubricas) {
        for (const det of rub.detalhes.filter(x => x.origem === "pago")) {
          linhas.push({
            id: det.id,
            titulo: det.label,
            subtitulo: det.fornecedor,
            valor: det.valor,
            meta: fmtDataBr(det.dataPagamento),
            grupo: rub.rubrica,
          });
        }
      }
      linhas.sort((a, b) => b.valor - a.valor);
      return linhasDe(
        linhas,
        "Executado (pago)",
        "Baixas a pagar Conta Azul neste mês.",
        d.totais.pago,
      );
    }

    if (kpi === "ainda-cabe") {
      const naoPlanejado =
        (d.totais.pagoEmAtraso ?? 0) + (d.totais.pagoAMais ?? 0);
      const saldoLib = d.totais.abateConcluidas ?? 0;
      const aindaCabeAjustado = Math.round(
        (d.totais.naoPago - naoPlanejado + saldoLib) * 100,
      ) / 100;
      const linhas: DashboardKpiLinha[] = d.rubricas
        .filter(r => r.naoPago > 0.009)
        .map(r => ({
          id: `cabe:${r.rubrica}`,
          titulo: r.rubrica,
          subtitulo: `Projetado ${r.projetado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · pago ${r.pago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
          valor: r.naoPago,
          meta: r.status,
          grupo: r.rubrica,
        }))
        .sort((a, b) => b.valor - a.valor);
      return linhasDe(
        linhas,
        "Quanto ainda cabe",
        "Restante do plano − não planejado + saldo liberado. Linhas = o que ainda falta por rúbrica (antes do ajuste).",
        aindaCabeAjustado,
      );
    }

    if (kpi === "saldo-liberado") {
      const linhas: DashboardKpiLinha[] = d.rubricas
        .filter(r => (r.saldoLiberado ?? 0) > 0.009)
        .map(r => ({
          id: `saldo:${r.rubrica}`,
          titulo: r.rubrica,
          subtitulo: `Projetado ${r.projetado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · pago ${r.pago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
          valor: r.saldoLiberado ?? 0,
          meta: "concluida",
          grupo: r.rubrica,
        }))
        .sort((a, b) => b.valor - a.valor);
      return linhasDe(
        linhas,
        "Saldo liberado",
        "Rúbricas marcadas como concluídas em que o pagamento ficou abaixo do plano — o restante vira saldo e abate o desembolso projetado.",
        d.totais.abateConcluidas ?? 0,
      );
    }

    // nao-planejado
    const linhas: DashboardKpiLinha[] = [];
    for (const rub of d.rubricas) {
      if (
        rub.status !== "pago_em_atraso" &&
        rub.status !== "pago_a_mais" &&
        rub.status !== "nao_programada"
      ) {
        continue;
      }
      for (const det of rub.detalhes.filter(x => x.origem === "pago")) {
        if (rub.status === "pago_a_mais" && rub.projetado > 0.009) {
          // Só o excedente como linha sintética no fim — lista pagamentos da rúbrica
        }
        linhas.push({
          id: det.id,
          titulo: det.label,
          subtitulo: det.fornecedor,
          valor: det.valor,
          meta: rub.status,
          grupo: rub.rubrica,
        });
      }
    }
    linhas.sort((a, b) => b.valor - a.valor);
    return linhasDe(
      linhas,
      "Não planejado",
      "Pagamentos fora da grade (atraso de recorrente, além do plano ou sem programação).",
      Math.round(((d.totais.pagoEmAtraso ?? 0) + (d.totais.pagoAMais ?? 0)) * 100) /
        100,
    );
  }

  if (kpi === "saldo-conta-azul") {
    const saldos = await buscarSaldosBancarios(projetoId);
    const linhas: DashboardKpiLinha[] = [];
    if (saldos.bradescoConfig.saldoInicial != null) {
      linhas.push({
        id: "saldo-inicial",
        titulo: "Saldo inicial informado",
        subtitulo: saldos.bradescoConfig.saldoInicialData
          ? `Âncora ${fmtDataBr(saldos.bradescoConfig.saldoInicialData)}`
          : null,
        valor: saldos.bradescoConfig.saldoInicial,
        meta: null,
        grupo: null,
      });
    }
    if (saldos.movimentos) {
      linhas.push({
        id: "mov-recebido",
        titulo: "Recebido (todas as contas)",
        subtitulo: "Baixas a receber desde a âncora",
        valor: saldos.movimentos.recebido,
        meta: null,
        grupo: null,
      });
      linhas.push({
        id: "mov-pago",
        titulo: "Pago (todas as contas)",
        subtitulo: "Baixas a pagar desde a âncora",
        valor: -saldos.movimentos.pago,
        meta: null,
        grupo: null,
      });
    }
    if (saldos.saldoBancario != null) {
      linhas.push({
        id: "saldo-calculado",
        titulo: "Saldo atual calculado",
        subtitulo: "Inicial + recebido − pago",
        valor: saldos.saldoBancario,
        meta: null,
        grupo: null,
      });
    }
    return linhasDe(
      linhas,
      "Saldo disponível",
      "Saldo bancário consolidado (todas as contas): valor manual na data âncora + movimentações Conta Azul.",
      saldos.saldoBancario ?? 0,
    );
  }

  if (kpi === "entrou" || kpi === "a-receber" || kpi === "em-atraso") {
    const bounds = periodo.planoAlinhadoAoPeriodo
      ? boundsMesYmAmericaSp(mesYm)
      : { inicio: periodo.inicio, fim: periodo.fim };
    const receber = (
      await buscarParcelasReceberParaComparativo(
        bounds.inicio,
        bounds.fim,
        projetoId,
      )
    ).map(toBase);

    if (!periodo.planoAlinhadoAoPeriodo) {
      const caixa = agregarReceitaCaixaPeriodo({
        parcelasReceber: receber,
        inicioIso: periodo.inicioIso,
        fimIso: periodo.fimIso,
        hojeIso,
      });
      if (kpi === "entrou") {
        const linhas: DashboardKpiLinha[] = receber
          .filter(p => {
            const dp = (p.dataPagamento ?? p.dataVencimento ?? "").slice(0, 10);
            return (
              valorPagoParcela(p) > 0.009 &&
              dp >= periodo.inicioIso &&
              dp <= periodo.fimIso
            );
          })
          .map(p => ({
            id: p.id,
            titulo: p.descricao,
            subtitulo: p.fornecedor,
            valor: valorPagoParcela(p),
            meta: (p.dataPagamento ?? p.dataVencimento ?? "").slice(0, 10),
            grupo: p.rubrica ?? undefined,
          }))
          .sort((a, b) => b.valor - a.valor);
        return linhasDe(
          linhas,
          "Entrou (recebido)",
          `Baixas Conta Azul em ${periodo.label}.`,
          caixa.recebido,
        );
      }
      if (kpi === "em-atraso") {
        return linhasDe(
          [],
          "Em atraso",
          `Vencidos em aberto no período ${periodo.label}.`,
          caixa.vencido,
        );
      }
      return linhasDe(
        [],
        "A receber no período",
        `Em aberto com vencimento em ${periodo.label}.`,
        caixa.aReceberNoMes,
      );
    }

    const r = montarComparativoReceitaMes({
      mesYm,
      parcelasReceberMes: receber,
      hojeYm,
      diaHoje,
    });

    if (kpi === "entrou") {
      return linhasDe(
        r.recebidosDetalhe.map(t => ({
          id: t.id,
          titulo: t.descricao,
          subtitulo: t.fornecedor,
          valor: t.valor,
          meta: fmtDataBr(t.dataPagamento) ?? fmtDataBr(t.dataVencimento),
          grupo: t.rubrica ?? null,
        })),
        "Entrou (recebido)",
        "Baixas Conta Azul com pagamento neste mês.",
        r.recebido,
      );
    }
    if (kpi === "a-receber") {
      return linhasDe(
        r.aReceberDetalhe.map(t => ({
          id: t.id,
          titulo: t.descricao,
          subtitulo: t.fornecedor,
          valor: t.valor,
          meta: fmtDataBr(t.dataVencimento),
          grupo: t.rubrica ?? null,
        })),
        "A receber (no prazo)",
        "Em aberto, vencimento neste mês, data ainda não passou.",
        r.aReceberNoMes,
      );
    }
    return linhasDe(
      r.vencidosDetalhe.map(t => ({
        id: t.id,
        titulo: t.descricao,
        subtitulo: t.fornecedor,
        valor: t.valor,
        meta: fmtDataBr(t.dataVencimento),
        grupo: t.rubrica ?? null,
      })),
      "Em atraso",
      "Em aberto, venceu neste mês e a data já passou.",
      r.vencido,
    );
  }

  if (kpi === "saldo-projetado") {
    const dash = await carregarFinanceiroDashboard(projetoId, mesYm);
    const receitaProj = dash.projecaoVendas.projecaoMesTotal;
    const desembolsoPlano = dash.desembolsoTotais.projetado;
    const saldoLib = dash.desembolsoTotais.abateConcluidas ?? 0;
    const naoPlanejado = Math.round(
      ((dash.desembolsoTotais.pagoEmAtraso ?? 0) +
        (dash.desembolsoTotais.pagoAMais ?? 0)) *
        100,
    ) / 100;
    const desembolsoEfetivo =
      dash.desembolsoTotais.projetadoEfetivo ??
      Math.round((desembolsoPlano - saldoLib) * 100) / 100;
    const gap = dash.caixa.gapCaixaMes;
    const linhas: DashboardKpiLinha[] = [
      {
        id: "entrou",
        titulo: "Entrou (recebido)",
        subtitulo: "Baixas Conta Azul no mês",
        valor: dash.receita.recebido,
        meta: "+ receita",
        grupo: "Receita caixa",
      },
      {
        id: "ainda-entra",
        titulo: "Ainda entra (proj. vendas)",
        subtitulo:
          dash.projecaoVendas.diasRestantes > 0
            ? `Média Receitas de Vendas · últimos ${dash.projecaoVendas.diasRestantes} dias`
            : "Sem dias restantes",
        valor: dash.projecaoVendas.aindaEntraProjetado,
        meta: "+ receita",
        grupo: "Receita caixa",
      },
      {
        id: "receita-total",
        titulo: "Receita caixa projetada",
        subtitulo: "Recebido + ainda entra (não soma a receber)",
        valor: receitaProj,
        meta: "subtotal",
        grupo: "Receita caixa",
      },
      {
        id: "desembolso-plano",
        titulo: "Desembolso plano",
        subtitulo: "Grade ativa de desembolso",
        valor: -desembolsoPlano,
        meta: "− despesa",
        grupo: "Despesa",
      },
      ...(saldoLib > 0.009
        ? [
            {
              id: "saldo-liberado",
              titulo: "Saldo liberado (rúbricas concluídas)",
              subtitulo: "Abate do plano — pagou a menos e marcou Concluir",
              valor: saldoLib,
              meta: "+ abate",
              grupo: "Despesa",
            } satisfies DashboardKpiLinha,
          ]
        : []),
      {
        id: "desembolso-efetivo",
        titulo: "Desembolso efetivo",
        subtitulo: "Plano − saldo liberado",
        valor: -desembolsoEfetivo,
        meta: "subtotal",
        grupo: "Despesa",
      },
      ...(naoPlanejado > 0.009
        ? [
            {
              id: "nao-planejado",
              titulo: "Não planejado",
              subtitulo: "Fora do plano + pago a mais (já saiu da conta)",
              valor: -naoPlanejado,
              meta: "− despesa",
              grupo: "Despesa",
            } satisfies DashboardKpiLinha,
          ]
        : []),
    ];
    return linhasDe(
      linhas,
      "Saldo projetado do mês",
      "Receita caixa − desembolso efetivo (plano − saldo liberado) − não planejado. Resultado de caixa esperado ao fechar o mês.",
      gap,
    );
  }

  if (kpi === "proj-vendas") {
    const mes1 = mesAnteriorProjecao(mesYm);
    const mes2 = mesAnteriorProjecao(mes1);
    const diasNoMesRef = diasNoMesYm(mesYm);
    let n = 0;
    if (mesYm < hojeYm) n = 0;
    else if (mesYm > hojeYm) n = diasNoMesRef;
    else {
      const diaCorte = Math.min(Math.max(1, diaHoje), diasNoMesRef);
      n = Math.max(0, diasNoMesRef - diaCorte);
    }
    if (n <= 0) {
      return linhasDe(
        [],
        "Projetado de vendas (caixa)",
        "Sem dias restantes neste mês — média zerada.",
        0,
      );
    }
    const [b1, b2] = await Promise.all([
      buscarBaixasReceberPorPeriodoPagamento(
        boundsUltimosNDiasMesYm(mes1, n).inicio,
        boundsUltimosNDiasMesYm(mes1, n).fim,
        projetoId,
      ).then(r => r.map(toBase)),
      buscarBaixasReceberPorPeriodoPagamento(
        boundsUltimosNDiasMesYm(mes2, n).inicio,
        boundsUltimosNDiasMesYm(mes2, n).fim,
        projetoId,
      ).then(r => r.map(toBase)),
    ]);
    const linhas: DashboardKpiLinha[] = [];
    let t1 = 0;
    let t2 = 0;
    const janela1 = boundsUltimosNDiasMesYm(mes1, n);
    const janela2 = boundsUltimosNDiasMesYm(mes2, n);
    const fmtIso = (d: Date) => diaIsoAmericaSp(d);
    const labelJanela = (ini: Date, fim: Date) =>
      `${fmtDataBr(fmtIso(ini))}–${fmtDataBr(fmtIso(fim))}`;

    for (const p of b1) {
      if (!ehReceitaVendasCaixa(p)) continue;
      const pago = valorPagoParcela(p);
      if (pago <= 0) continue;
      t1 += pago;
      linhas.push({
        id: `${mes1}:${p.id}`,
        titulo: p.descricao,
        subtitulo: p.fornecedor,
        valor: pago,
        meta: `${labelMesYm(mes1)} · pag. ${fmtDataBr(p.dataPagamento) ?? "?"}`,
        grupo: p.rubrica,
      });
    }
    for (const p of b2) {
      if (!ehReceitaVendasCaixa(p)) continue;
      const pago = valorPagoParcela(p);
      if (pago <= 0) continue;
      t2 += pago;
      linhas.push({
        id: `${mes2}:${p.id}`,
        titulo: p.descricao,
        subtitulo: p.fornecedor,
        valor: pago,
        meta: `${labelMesYm(mes2)} · pag. ${fmtDataBr(p.dataPagamento) ?? "?"}`,
        grupo: p.rubrica,
      });
    }
    linhas.sort((a, b) => b.valor - a.valor);
    const media =
      t1 > 0 && t2 > 0
        ? Math.round(((t1 + t2) / 2) * 100) / 100
        : Math.round((t1 || t2) * 100) / 100;

    // Resumo no topo: janelas exatas para reproduzir no Conta Azul
    linhas.unshift(
      {
        id: `resumo:${mes2}`,
        titulo: `${labelMesYm(mes2)} · pagamento ${labelJanela(janela2.inicio, janela2.fim)}`,
        subtitulo: "Filtro Conta Azul: data de pagamento (não vencimento) · venda e/ou frete",
        valor: Math.round(t2 * 100) / 100,
        meta: "base da média",
        grupo: "Resumo",
      },
      {
        id: `resumo:${mes1}`,
        titulo: `${labelMesYm(mes1)} · pagamento ${labelJanela(janela1.inicio, janela1.fim)}`,
        subtitulo: "Filtro Conta Azul: data de pagamento (não vencimento) · venda e/ou frete",
        valor: Math.round(t1 * 100) / 100,
        meta: "base da média",
        grupo: "Resumo",
      },
    );

    return {
      ...base,
      titulo: "Projetado de vendas (caixa)",
      descricao: `Média das baixas com data de pagamento nos últimos ${n} dias de ${labelMesYm(mes2)} (${labelJanela(janela2.inicio, janela2.fim)}) e ${labelMesYm(mes1)} (${labelJanela(janela1.inicio, janela1.fim)}). Só venda e/ou frete. Total = média.`,
      total: media,
      linhas,
    };
  }

  if (kpi === "impostos-atrasados") {
    const mes1 = mesAnteriorProjecao(mesYm);
    const mes2 = mesAnteriorProjecao(mes1);
    const [pagar2, pagar1, pagarMes] = await Promise.all([
      carregarParcelasBaseMes(projetoId, mes2),
      carregarParcelasBaseMes(projetoId, mes1),
      carregarParcelasBaseMes(projetoId, mesYm),
    ]);
    const agg = agregarImpostosEncargosAtrasados(
      [...pagar2, ...pagar1, ...pagarMes],
      hojeIso,
    );
    return linhasDe(
      agg.detalhes.map(t => ({
        id: t.id,
        titulo: t.descricao,
        subtitulo: [t.fornecedor, t.rubrica].filter(Boolean).join(" · ") || null,
        valor: t.valor,
        meta: fmtDataBr(t.dataVencimento),
        grupo: t.rubrica,
      })),
      "Impostos e encargos atrasados",
      "Contas a pagar em aberto, com vencimento já passado, classificadas como imposto/tributo/encargo (DAS, FGTS, INSS, etc.). Janela: mês atual + 2 anteriores.",
      agg.total,
    );
  }

  // faturado | orcamentos
  if (kpi !== "faturado" && kpi !== "orcamentos") {
    throw new Error(`KPI sem detalhe: ${kpi}`);
  }
  const vendas = await carregarTotaisVendasCompetencia(mesYm, {
    hojeYm,
    diaHoje,
    filtroOrcamento: { diaLimiteOrcamento: 31 },
  });
  const prisma = getComercialPrisma();
  const { inicio, fim } = boundsMesYmAmericaSp(mesYm);
  const pedidos = await prisma.pedido.findMany({
    where: {
      origemPedido: OrigemPedido.CONTA_AZUL,
      dataPedido: { gte: inicio, lte: fim },
    },
    select: {
      id: true,
      dataPedido: true,
      statusPedido: true,
      valorTotal: true,
      valorBruto: true,
      valorFrete: true,
      valorDesconto: true,
      valorLiquido: true,
      composicaoDetalhada: true,
      cliente: { select: { nome: true } },
    },
    orderBy: { dataPedido: "desc" },
    take: 500,
  });
  const alvo = kpi === "faturado" ? "venda" : "orcamento";
  const linhas: DashboardKpiLinha[] = [];
  for (const p of pedidos) {
    const cls = classificarStatusPedido(p.statusPedido);
    if (cls !== alvo) continue;
    const liquido = composicaoDoPedidoParaDashboard(p).valorLiquido;
    if (!Number.isFinite(liquido) || liquido === 0) continue;
    const dataIso = diaIsoAmericaSp(p.dataPedido);
    if (dataIso.slice(0, 7) !== mesYm) continue;
    linhas.push({
      id: p.id,
      titulo: p.cliente?.nome?.trim() || "Cliente",
      subtitulo: p.statusPedido,
      valor: liquido,
      meta: fmtDataBr(dataIso),
      grupo: alvo,
    });
  }
  return linhasDe(
    linhas,
    kpi === "faturado" ? "Vendas já faturadas" : "Orçamentos no mês",
    kpi === "faturado"
      ? "Pedidos com status venda neste mês (volume, não caixa)."
      : "Todos os orçamentos com data de pedido neste mês (pipeline).",
    kpi === "faturado"
      ? vendas.vendasFaturadasMes
      : vendas.orcamentosCompetenciaMes,
  );
}

export {
  addProjecaoColuna,
  insertProjecaoLinhaManual,
  removeProjecaoColuna,
  softDeleteProjecaoLinhaManual,
  upsertProjecaoCelula,
};
