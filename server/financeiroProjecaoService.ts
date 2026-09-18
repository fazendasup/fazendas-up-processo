import {
  buscarBaixasReceberPorPeriodoPagamento,
  buscarParcelasPagarParaProjecao,
  buscarParcelasReceberParaComparativo,
  fetchCatalogoCategorias,
  idsCategoriasReceitaVendas,
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
  ehReceitaVendasCaixa,
  mesAnteriorProjecao,
  montarProjecaoDesembolso,
  labelMesYm,
  valorPagoParcela,
  type ParcelaBaseProjecao,
} from "@shared/financeiroProjecaoDesembolso";
import {
  montarComparativoDesembolsoMes,
  montarComparativoReceitaMes,
  montarFinanceiroComparativo,
  resumirBaixasPorCategoria,
  somarRecebidoUltimosNDias,
  somarValorPagoParcelas,
} from "@shared/financeiroComparativoProjecao";
import {
  classificarRubricaDashboard,
  montarSerieDashboard3Meses,
  type FinanceiroDashboardPayload,
} from "@shared/financeiroDashboard";
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

function boundsMesYm(ym: string): { inicio: Date; fim: Date } {
  const [y, m] = ym.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const fim = new Date(y, m, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

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

  const [grade, pagarMes, receberMes, baixas1, baixas2, receber1, receber2, vendas] =
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
      `Ainda entra = média das baixas (sem investimento/aporte${idsVendas.length ? `; DRE vendas no catálogo: ${idsVendas.length} cat.` : ""}).`,
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
 * Dashboard principal: série de 3 meses + snapshot do mês selecionado.
 */
export async function carregarFinanceiroDashboard(
  projetoId: number,
  mesYm: string,
  opts?: { forceRefreshCa?: boolean },
) {
  if (!/^\d{4}-\d{2}$/.test(mesYm)) {
    throw new Error("Mês inválido (AAAA-MM).");
  }

  const mes1 = mesAnteriorProjecao(mesYm);
  const mes2 = mesAnteriorProjecao(mes1);
  const hojeIso = diaIsoAmericaSp();
  const hojeYm = mesIsoAmericaSp();
  const diaHoje = Number(hojeIso.slice(8, 10));
  const force = opts?.forceRefreshCa === true;

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
    carregarTotaisVendasCompetencia(mesYm, { hojeYm, diaHoje }),
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
  const dMes = desembolsoDe(mesYm, gradeAtual.linhas, pagarMes);

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
        vendasReal: vMes.total,
        // Projeção alinhada ao “ainda entra” (média caixa vendas, não volume).
        vendasProjetado: vMes.total + mediaCaixaRestante,
        desembolsoProjetado: dMes.totais.projetado,
        desembolsoPago: dMes.totais.pago,
        previsto: rMes.previsto,
        recebido: rMes.recebido,
        aReceber: rMes.aReceber,
      },
    ],
  });

  const mesAtual = serie3Meses[2]!;
  const gapCaixaMes = Math.round(
    (rMes.projecaoVendas.projecaoMesTotal - dMes.totais.projetado) * 100,
  ) / 100;

  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    serie3Meses,
    mesAtual,
    projecaoVendas: rMes.projecaoVendas,
    caixa: {
      saldoRealizado: mesAtual.saldoCaixa,
      gapCaixaMes,
    },
    desembolsoTotais: dMes.totais,
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
    receita: {
      previsto: rMes.previsto,
      recebido: rMes.recebido,
      aReceberNoMes: rMes.aReceberNoMes,
      vencido: rMes.vencido,
      aReceber: rMes.aReceber,
      pctRecebidoDoPrevisto: rMes.pctRecebidoDoPrevisto,
      vendasCompetencia: rMes.vendasCompetencia,
    },
    avisos: [
      `Ainda entra = baixas do período sem investimento/aporte${idsVendas.length ? ` (catálogo DRE vendas: ${idsVendas.length})` : ""}.`,
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
      "Projeção de fechar (caixa) = recebido + em aberto + ainda entra.",
      "Faturado/orçamento = volume de pedidos — não some com recebido.",
    ],
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
  mesYm: string,
  kpi: DashboardKpiId,
): Promise<DashboardKpiDetalhe> {
  if (!/^\d{4}-\d{2}$/.test(mesYm)) {
    throw new Error("Mês inválido (AAAA-MM).");
  }

  const hojeIso = diaIsoAmericaSp();
  const hojeYm = mesIsoAmericaSp();
  const diaHoje = Number(hojeIso.slice(8, 10));
  const labelMes = labelMesYm(mesYm);
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
    kpi === "nao-planejado"
  ) {
    const grade = await carregarProjecaoDesembolso(projetoId, mesYm);
    const pagar = await carregarParcelasBaseMes(projetoId, mesYm);
    const d = montarComparativoDesembolsoMes({
      mesYm,
      linhasProjecao: grade.linhas,
      parcelasPagarMes: pagar,
    });

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
        "Por rúbrica: o que falta sair do plano (projetado − pago, mín. 0).",
        d.totais.naoPago,
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

  if (kpi === "entrou" || kpi === "a-receber" || kpi === "em-atraso") {
    const bounds = boundsMesYmAmericaSp(mesYm);
    const receber = (
      await buscarParcelasReceberParaComparativo(
        bounds.inicio,
        bounds.fim,
        projetoId,
      )
    ).map(toBase);
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
    const desembolsoProj = dash.desembolsoTotais.projetado;
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
        id: "a-receber",
        titulo: "A receber (no prazo)",
        subtitulo: "Em aberto, ainda não venceu",
        valor: dash.receita.aReceberNoMes,
        meta: "+ receita",
        grupo: "Receita caixa",
      },
      {
        id: "em-atraso",
        titulo: "Em atraso",
        subtitulo: "Em aberto, já venceu neste mês",
        valor: dash.receita.vencido,
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
        subtitulo: "Soma das camadas acima",
        valor: receitaProj,
        meta: "subtotal",
        grupo: "Receita caixa",
      },
      {
        id: "desembolso",
        titulo: "Desembolso plano (projetado)",
        subtitulo: "Grade ativa de desembolso",
        valor: -desembolsoProj,
        meta: "− despesa",
        grupo: "Despesa",
      },
    ];
    return linhasDe(
      linhas,
      "Saldo projetado do mês",
      "Receita caixa projetada (recebido + em aberto + ainda entra) − desembolso projetado. Este é o resultado de caixa esperado ao fechar o mês.",
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
        meta: `${mes1} · ${fmtDataBr(p.dataPagamento) ?? ""}`,
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
        meta: `${mes2} · ${fmtDataBr(p.dataPagamento) ?? ""}`,
        grupo: p.rubrica,
      });
    }
    linhas.sort((a, b) => b.valor - a.valor);
    const media =
      t1 > 0 && t2 > 0
        ? Math.round(((t1 + t2) / 2) * 100) / 100
        : Math.round((t1 || t2) * 100) / 100;
    return {
      ...base,
      titulo: "Projetado de vendas (caixa)",
      descricao: `Baixas "Receitas de Vendas" nos últimos ${n} dias de ${labelMesYm(mes2)} e ${labelMesYm(mes1)}. Total mostra a média usada no KPI.`,
      total: media,
      linhas,
    };
  }

  // faturado | orcamentos
  const vendas = await carregarTotaisVendasCompetencia(mesYm, {
    hojeYm,
    diaHoje,
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
    if (alvo === "orcamento") {
      const dia = Number(dataIso.slice(8, 10));
      if (dia > vendas.diaLimiteOrcamento) continue;
    }
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
      : `Orçamentos no mês até o dia ${vendas.diaLimiteOrcamento} (pipeline).`,
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
