/**
 * Dashboard financeiro — série de 3 meses (mes−2, mes−1, mês)
 * com projeção × real (vendas e desembolso) e caixa.
 */
import {
  ehDespesaEssencialRecorrente,
  labelMesYm,
  mesAnteriorProjecao,
} from "./financeiroProjecaoDesembolso";
import type { StatusRubricaComparativo } from "./financeiroComparativoProjecao";
import type { ProjecaoVendasRestanteMes } from "./financeiroProjecaoVendas";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function desvioPct(desvio: number, base: number): number | null {
  if (base > 0) return round2((desvio / base) * 100);
  if (base === 0 && desvio !== 0) return desvio > 0 ? 100 : -100;
  return null;
}

export type FinanceiroDashboardSerieMes = {
  mesYm: string;
  labelMes: string;
  /** true = mês selecionado ainda em aberto (projeção ativa). */
  aberto: boolean;
  vendasFaturadas: number;
  orcamentos: number;
  /** Realizado de volume no mês (faturado + orçamentos). */
  vendasReal: number;
  /**
   * Mês aberto: projeção de fechar o mês.
   * Meses fechados: igual ao real (sem desvio artificial).
   */
  vendasProjetado: number;
  desvioVendas: number;
  desvioVendasPct: number | null;
  desembolsoProjetado: number;
  desembolsoPago: number;
  desvioDesembolso: number;
  desvioDesembolsoPct: number | null;
  previsto: number;
  recebido: number;
  aReceber: number;
  /** recebido − desembolso pago. */
  saldoCaixa: number;
};

export type FinanceiroDashboardMesInput = {
  mesYm: string;
  vendasFaturadas: number;
  orcamentos: number;
  vendasReal: number;
  /** Só informado no mês aberto (projeção de fechar). */
  vendasProjetado?: number | null;
  desembolsoProjetado: number;
  desembolsoPago: number;
  previsto: number;
  recebido: number;
  aReceber: number;
};

/** Ação sugerida no mapa essencial × cortável. */
export type AcaoDesembolsoDashboard =
  | "pagar"
  | "revisar"
  | "negociar"
  | "cortar";

export type DesembolsoRubricaDashboard = {
  rubrica: string;
  projetado: number;
  pago: number;
  naoPago: number;
  pagoAMais: number;
  status: StatusRubricaComparativo;
  /** Heurística: folha, utilidades, insumos operacionais, etc. */
  essencial: boolean;
  /**
   * pagar = essencial em aberto · revisar = essencial acima do plano ·
   * negociar = não essencial em aberto (pode segurar) ·
   * cortar = não essencial com volume/estouro (reduzir).
   */
  acao: AcaoDesembolsoDashboard;
  /** Valor em R$ da ação (falta, excesso ou volume cortável). */
  valorAcao: number;
};

export type FinanceiroDashboardPayload = {
  mesYm: string;
  labelMes: string;
  /** Recorte ativo do filtro de data (dia/semana/mês/ano). */
  periodo: {
    granularidade: "dia" | "semana" | "mes" | "ano";
    ref: string;
    inicioIso: string;
    fimIso: string;
    label: string;
    mesYmAncora: string;
    /** false = plano/mapa ainda são do mês âncora; caixa é do período. */
    planoAlinhadoAoPeriodo: boolean;
  };
  serie3Meses: FinanceiroDashboardSerieMes[];
  /** Totais do mês âncora (série / plano). */
  mesAtual: FinanceiroDashboardSerieMes;
  projecaoVendas: ProjecaoVendasRestanteMes;
  caixa: {
    saldoRealizado: number;
    gapCaixaMes: number;
  };
  desembolsoTotais: {
    projetado: number;
    pago: number;
    naoPago: number;
    pagoAMais: number;
    pagoEmAtraso: number;
    desvio: number;
    desvioPct: number | null;
    pctPagoDoProjetado: number | null;
  };
  /**
   * Rúbricas do mês com criticidade e gaps — base do mapa
   * “proteger × reduzir”.
   */
  desembolsoPorRubrica: DesembolsoRubricaDashboard[];
  receita: {
    previsto: number;
    recebido: number;
    aReceberNoMes: number;
    vencido: number;
    aReceber: number;
    pctRecebidoDoPrevisto: number | null;
    vendasCompetencia: {
      vendasFaturadas: number;
      orcamentos: number;
      total: number;
    };
  };
  avisos: string[];
};

/**
 * Monta a série mes−2 → mês a partir dos totais já agregados.
 * `mesYm` é o mês de referência (selecionado / aberto).
 */
export function montarSerieDashboard3Meses(input: {
  mesYm: string;
  meses: FinanceiroDashboardMesInput[];
}): FinanceiroDashboardSerieMes[] {
  const mes1 = mesAnteriorProjecao(input.mesYm);
  const mes2 = mesAnteriorProjecao(mes1);
  const ordem = [mes2, mes1, input.mesYm];
  const porYm = new Map(input.meses.map(m => [m.mesYm, m]));

  return ordem.map(ym => {
    const m = porYm.get(ym) ?? {
      mesYm: ym,
      vendasFaturadas: 0,
      orcamentos: 0,
      vendasReal: 0,
      desembolsoProjetado: 0,
      desembolsoPago: 0,
      previsto: 0,
      recebido: 0,
      aReceber: 0,
    };
    const aberto = ym === input.mesYm;
    const vendasProjetado =
      aberto &&
      m.vendasProjetado != null &&
      Number.isFinite(m.vendasProjetado)
        ? round2(m.vendasProjetado)
        : round2(m.vendasReal);
    const desvioVendas = round2(m.vendasReal - vendasProjetado);
    const desvioDesembolso = round2(m.desembolsoPago - m.desembolsoProjetado);
    return {
      mesYm: ym,
      labelMes: labelMesYm(ym),
      aberto,
      vendasFaturadas: round2(m.vendasFaturadas),
      orcamentos: round2(m.orcamentos),
      vendasReal: round2(m.vendasReal),
      vendasProjetado,
      desvioVendas,
      desvioVendasPct: desvioPct(desvioVendas, vendasProjetado),
      desembolsoProjetado: round2(m.desembolsoProjetado),
      desembolsoPago: round2(m.desembolsoPago),
      desvioDesembolso,
      desvioDesembolsoPct: desvioPct(desvioDesembolso, m.desembolsoProjetado),
      previsto: round2(m.previsto),
      recebido: round2(m.recebido),
      aReceber: round2(m.aReceber),
      saldoCaixa: round2(m.recebido - m.desembolsoPago),
    };
  });
}

const MIN_ACAO = 0.5;

/**
 * Classifica rúbrica do comparativo para o mapa de ação do dashboard.
 * Essencial usa a mesma heurística da projeção de desembolso.
 * Retorna null só se não houver volume (nem plano nem pago).
 */
export function classificarRubricaDashboard(input: {
  rubrica: string;
  projetado: number;
  pago: number;
  naoPago: number;
  pagoAMais: number;
  status: StatusRubricaComparativo;
}): DesembolsoRubricaDashboard | null {
  const volume = Math.max(input.projetado, input.pago);
  if (volume <= MIN_ACAO) return null;

  const essencial = ehDespesaEssencialRecorrente(input.rubrica, input.rubrica);
  const falta = Math.max(0, input.naoPago);
  const excesso = Math.max(0, input.pagoAMais);

  let acao: AcaoDesembolsoDashboard = essencial ? "revisar" : "cortar";
  let valorAcao = round2(Math.max(input.pago, input.projetado));

  if (essencial) {
    if (falta > MIN_ACAO) {
      acao = "pagar";
      valorAcao = falta;
    } else if (excesso > MIN_ACAO) {
      acao = "revisar";
      valorAcao = excesso;
    } else {
      // Em dia — não entra no mapa de urgência (filtrado depois).
      acao = "revisar";
      valorAcao = 0;
    }
  } else if (falta > MIN_ACAO && falta >= excesso) {
    acao = "negociar";
    valorAcao = falta;
  } else if (excesso > MIN_ACAO) {
    acao = "cortar";
    valorAcao = excesso;
  } else {
    acao = "cortar";
    valorAcao = round2(Math.max(input.pago, input.projetado));
  }

  return {
    rubrica: input.rubrica,
    projetado: round2(input.projetado),
    pago: round2(input.pago),
    naoPago: round2(falta),
    pagoAMais: round2(excesso),
    status: input.status,
    essencial,
    acao,
    valorAcao: round2(valorAcao),
  };
}

/** Painéis do mapa: proteger (essencial) × reduzir (não essencial). */
export function montarMapaAcaoDesembolso(
  rubricas: DesembolsoRubricaDashboard[],
  top = 6,
): {
  proteger: DesembolsoRubricaDashboard[];
  reduzir: DesembolsoRubricaDashboard[];
  totalProteger: number;
  totalReduzir: number;
} {
  const urgente = (r: DesembolsoRubricaDashboard) => r.valorAcao > MIN_ACAO;

  const proteger = rubricas
    .filter(
      r =>
        urgente(r) &&
        r.essencial &&
        (r.acao === "pagar" || (r.acao === "revisar" && r.pagoAMais > MIN_ACAO)),
    )
    .sort((a, b) => {
      const rank = (x: DesembolsoRubricaDashboard) =>
        x.acao === "pagar" ? 2 : 1;
      return rank(b) - rank(a) || b.valorAcao - a.valorAcao;
    })
    .slice(0, top);

  const reduzir = rubricas
    .filter(
      r =>
        urgente(r) &&
        !r.essencial &&
        (r.acao === "negociar" || r.acao === "cortar"),
    )
    .sort((a, b) => {
      const rank = (x: DesembolsoRubricaDashboard) =>
        x.acao === "negociar" ? 2 : 1;
      return rank(b) - rank(a) || b.valorAcao - a.valorAcao;
    })
    .slice(0, top);

  return {
    proteger,
    reduzir,
    totalProteger: round2(proteger.reduce((s, r) => s + r.valorAcao, 0)),
    totalReduzir: round2(reduzir.reduce((s, r) => s + r.valorAcao, 0)),
  };
}
