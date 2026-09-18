/**
 * Projeção de vendas no restante do mês.
 * Restante = média do que foi vendido nos últimos N dias dos 2 meses anteriores
 * (N = dias que faltam no mês atual).
 * Orçamentos: entram no mês se data ≤ diaLimite (default 15); após isso não contam
 * até virar venda. Opcionalmente filtrados por cliente.
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function diasNoMesYm(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export type StatusPedidoVendaOrcamento = "venda" | "orcamento";

export const DIA_LIMITE_ORCAMENTO_PADRAO = 15;

export type FiltroOrcamentoCompetencia = {
  /** Dia máximo do mês em que orçamento entra (1–31). Default 15. */
  diaLimiteOrcamento?: number;
  /**
   * Se informado e não vazio: só orçamentos desses clientes.
   * Vazio/omitido = todos os clientes.
   */
  clienteIdsOrcamento?: string[] | null;
};

function diaLimiteEfetivo(opts?: FiltroOrcamentoCompetencia): number {
  const d = opts?.diaLimiteOrcamento ?? DIA_LIMITE_ORCAMENTO_PADRAO;
  if (!Number.isFinite(d)) return DIA_LIMITE_ORCAMENTO_PADRAO;
  return Math.min(31, Math.max(1, Math.floor(d)));
}

/**
 * Mês de competência para o comparativo de vendas.
 * - venda: mês civil de `dataPedido`
 * - orçamento: dia ≤ limite → mesmo mês; dia > limite → não entra (null)
 */
export function mesCompetenciaVendaOrcamento(
  dataPedidoIso: string,
  status: StatusPedidoVendaOrcamento,
  opts?: FiltroOrcamentoCompetencia,
): string | null {
  const ym = dataPedidoIso.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  if (status === "venda") return ym;
  const day = Number(dataPedidoIso.slice(8, 10));
  const limite = diaLimiteEfetivo(opts);
  if (!Number.isFinite(day) || day > limite) return null;
  return ym;
}

/**
 * Dia dentro do mês de competência (p/ séries “até o dia” / “últimos N dias”).
 */
export function diaNoMesCompetencia(
  dataPedidoIso: string,
  status: StatusPedidoVendaOrcamento,
  opts?: FiltroOrcamentoCompetencia,
): { mesYm: string; dia: number } | null {
  const mesYm = mesCompetenciaVendaOrcamento(dataPedidoIso, status, opts);
  if (!mesYm) return null;
  const day = Number(dataPedidoIso.slice(8, 10));
  if (!Number.isFinite(day) || day < 1) return { mesYm, dia: 1 };
  return { mesYm, dia: Math.min(31, Math.floor(day)) };
}

export type PedidoCompetenciaInput = {
  dataPedidoIso: string;
  status: StatusPedidoVendaOrcamento;
  valorLiquido: number;
  clienteId?: string | null;
  clienteNome?: string | null;
};

export type TotaisCompetenciaMes = {
  vendas: number;
  /** Orçamentos com data no mês e dia ≤ limite (e filtro de cliente). */
  orcamentos: number;
  total: number;
};

function emptyTotais(): TotaisCompetenciaMes {
  return { vendas: 0, orcamentos: 0, total: 0 };
}

function orcamentoClientePermitido(
  p: PedidoCompetenciaInput,
  opts?: FiltroOrcamentoCompetencia,
): boolean {
  const ids = opts?.clienteIdsOrcamento;
  if (ids == null || ids.length === 0) return true;
  const id = (p.clienteId ?? "").trim();
  if (!id) return false;
  return ids.includes(id);
}

/** Soma valor líquido por mês de competência, separando venda e orçamento. */
export function agregarVendasPorCompetenciaDetalhe(
  pedidos: PedidoCompetenciaInput[],
  opts?: FiltroOrcamentoCompetencia,
): Map<string, TotaisCompetenciaMes> {
  const map = new Map<string, TotaisCompetenciaMes>();
  for (const p of pedidos) {
    if (!Number.isFinite(p.valorLiquido) || p.valorLiquido === 0) continue;
    if (p.status === "orcamento" && !orcamentoClientePermitido(p, opts)) {
      continue;
    }
    const mes = mesCompetenciaVendaOrcamento(p.dataPedidoIso, p.status, opts);
    if (!mes) continue;
    const acc = map.get(mes) ?? emptyTotais();
    if (p.status === "venda") acc.vendas = round2(acc.vendas + p.valorLiquido);
    else acc.orcamentos = round2(acc.orcamentos + p.valorLiquido);
    acc.total = round2(acc.vendas + acc.orcamentos);
    map.set(mes, acc);
  }
  return map;
}

/** Soma total por competência (venda + orçamento filtrado). */
export function agregarVendasPorCompetencia(
  pedidos: PedidoCompetenciaInput[],
  opts?: FiltroOrcamentoCompetencia,
): Map<string, number> {
  const detalhe = agregarVendasPorCompetenciaDetalhe(pedidos, opts);
  const map = new Map<string, number>();
  for (const [mes, t] of Array.from(detalhe.entries())) {
    map.set(mes, t.total);
  }
  return map;
}

/** Mapa mês → (dia → total líquido). */
export function agregarVendasPorDiaCompetencia(
  pedidos: PedidoCompetenciaInput[],
  opts?: FiltroOrcamentoCompetencia,
): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>();
  for (const p of pedidos) {
    if (!Number.isFinite(p.valorLiquido) || p.valorLiquido === 0) continue;
    if (p.status === "orcamento" && !orcamentoClientePermitido(p, opts)) {
      continue;
    }
    const ref = diaNoMesCompetencia(p.dataPedidoIso, p.status, opts);
    if (!ref) continue;
    let porDia = map.get(ref.mesYm);
    if (!porDia) {
      porDia = new Map();
      map.set(ref.mesYm, porDia);
    }
    porDia.set(ref.dia, round2((porDia.get(ref.dia) ?? 0) + p.valorLiquido));
  }
  return map;
}

/** Soma do dia 1 até `diaAte` (inclusive) no mês. */
export function somarVendasAteDia(
  porDia: Map<number, number> | undefined,
  diaAte: number,
): number {
  if (!porDia || diaAte < 1) return 0;
  let s = 0;
  const limite = Math.floor(diaAte);
  for (let d = 1; d <= limite; d++) s += porDia.get(d) ?? 0;
  return round2(s);
}

/**
 * Soma dos últimos `nDias` dias do mês (ex.: n=13 num mês de 31 → dias 19–31).
 */
export function somarVendasUltimosNDias(
  porDia: Map<number, number> | undefined,
  diasNoMes: number,
  nDias: number,
): number {
  if (!porDia || nDias <= 0 || diasNoMes <= 0) return 0;
  const n = Math.min(Math.floor(nDias), diasNoMes);
  const inicio = diasNoMes - n + 1;
  let s = 0;
  for (let d = inicio; d <= diasNoMes; d++) s += porDia.get(d) ?? 0;
  return round2(s);
}

export type ProjecaoVendasRestanteMes = {
  mesesMedia2m: [string, string];
  diasNoMes: number;
  diasPassados: number;
  diasRestantes: number;
  /** Vendas+orçamentos já na competência do mês. */
  vendasJaNoMes: number;
  /** Média do que entrou até o mesmo dia nos 2 meses anteriores. */
  mediaAteMesmoDia2m: number;
  vendasAteDiaMesAnterior1: number;
  vendasAteDiaMesAnterior2: number;
  /**
   * Média do que **entrou em caixa** (baixas Conta Azul) nos últimos
   * `diasRestantes` dias dos 2 meses anteriores — não é volume faturado.
   */
  mediaRestante2m: number;
  vendasRestanteMesAnterior1: number;
  vendasRestanteMesAnterior2: number;
  aindaEntraProjetado: number;
  /**
   * No fluxo de caixa: recebido + aindaEntraProjetado
   * (sem somar a receber — evita redundância com o padrão de baixas).
   * (Preenchido em montarComparativoReceitaMes; aqui só vendasJaNoMes + aindaEntra.)
   */
  projecaoMesTotal: number;
};

function mediaDeDois(a: number, b: number): number {
  const temA = a > 0;
  const temB = b > 0;
  const n = (temA ? 1 : 0) + (temB ? 1 : 0);
  if (n === 0) return 0;
  return round2(((temA ? a : 0) + (temB ? b : 0)) / n);
}

/**
 * Projeta o restante do mês pela média do que **entrou em caixa**
 * (baixas) nos últimos N dias dos 2 meses anteriores
 * (N = dias restantes no mês de referência).
 * Os campos `vendasRestante*` recebem esses totais de caixa.
 */
export function montarProjecaoVendasRestanteMes(input: {
  mesYm: string;
  hojeYm: string;
  diaHoje: number;
  vendasMesAtual: number;
  vendasAteDiaMesAnterior1: number;
  vendasAteDiaMesAnterior2: number;
  vendasRestanteMesAnterior1: number;
  vendasRestanteMesAnterior2: number;
  mesAnterior1Ym: string;
  mesAnterior2Ym: string;
}): ProjecaoVendasRestanteMes {
  const diasNoMes = diasNoMesYm(input.mesYm);
  let diasPassados: number;
  let diasRestantes: number;
  let vendasJaNoMes = round2(input.vendasMesAtual);

  if (input.mesYm < input.hojeYm) {
    diasPassados = diasNoMes;
    diasRestantes = 0;
  } else if (input.mesYm > input.hojeYm) {
    diasPassados = 0;
    diasRestantes = diasNoMes;
    vendasJaNoMes = 0;
  } else {
    const dia = Math.min(Math.max(1, Math.floor(input.diaHoje)), diasNoMes);
    diasPassados = dia;
    diasRestantes = Math.max(0, diasNoMes - dia);
  }

  const vendasAteDiaMesAnterior1 = round2(input.vendasAteDiaMesAnterior1);
  const vendasAteDiaMesAnterior2 = round2(input.vendasAteDiaMesAnterior2);
  const vendasRestanteMesAnterior1 = round2(input.vendasRestanteMesAnterior1);
  const vendasRestanteMesAnterior2 = round2(input.vendasRestanteMesAnterior2);

  const mediaAteMesmoDia2m = mediaDeDois(
    vendasAteDiaMesAnterior1,
    vendasAteDiaMesAnterior2,
  );
  const mediaRestante2m =
    diasRestantes > 0
      ? mediaDeDois(vendasRestanteMesAnterior1, vendasRestanteMesAnterior2)
      : 0;
  const aindaEntraProjetado = mediaRestante2m;
  const projecaoMesTotal = round2(vendasJaNoMes + aindaEntraProjetado);

  return {
    mesesMedia2m: [input.mesAnterior2Ym, input.mesAnterior1Ym],
    diasNoMes,
    diasPassados,
    diasRestantes,
    vendasJaNoMes,
    mediaAteMesmoDia2m,
    vendasAteDiaMesAnterior1,
    vendasAteDiaMesAnterior2,
    mediaRestante2m,
    vendasRestanteMesAnterior1,
    vendasRestanteMesAnterior2,
    aindaEntraProjetado,
    projecaoMesTotal,
  };
}
