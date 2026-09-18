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
  const filtroOrcamento: FiltroOrcamentoCompetencia = {
    diaLimiteOrcamento:
      opts?.diaLimiteOrcamento ?? DIA_LIMITE_ORCAMENTO_PADRAO,
    clienteIdsOrcamento: opts?.clienteIdsOrcamento?.length
      ? opts.clienteIdsOrcamento
      : null,
  };

  const [grade, pagarMes, receberMes, vendas] = await Promise.all([
    carregarProjecaoDesembolso(projetoId, mesYm, {
      forceRefreshCa: opts?.forceRefreshCa,
    }),
    carregarParcelasBaseMes(projetoId, mesYm, opts?.forceRefreshCa === true),
    buscarParcelasReceberParaComparativo(iniMes, fimMes, projetoId).then(r =>
      r.map(toBase),
    ),
    carregarTotaisVendasCompetencia(mesYm, {
      hojeYm,
      diaHoje,
      filtroOrcamento,
    }),
  ]);

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
    vendasRestanteMesAnterior1: vendas.vendasRestanteMesAnterior1,
    vendasRestanteMesAnterior2: vendas.vendasRestanteMesAnterior2,
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
      "Já faturado = pedidos sincronizados da Conta Azul (status venda). Se divergir, rode sync comercial.",
      `Orçamentos: até o dia ${vendas.diaLimiteOrcamento}` +
        (filtroOrcamento.clienteIdsOrcamento?.length
          ? ` · ${filtroOrcamento.clienteIdsOrcamento.length} cliente(s) selecionado(s)`
          : " · todos os clientes"),
      "Desembolso: exclusões locais de rúbrica continuam valendo só no lado pagar.",
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
