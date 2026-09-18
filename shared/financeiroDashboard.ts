/**
 * Dashboard financeiro — série de 3 meses (mes−2, mes−1, mês)
 * com projeção × real (vendas e desembolso) e caixa.
 */
import { labelMesYm, mesAnteriorProjecao } from "./financeiroProjecaoDesembolso";
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

export type FinanceiroDashboardPayload = {
  mesYm: string;
  labelMes: string;
  serie3Meses: FinanceiroDashboardSerieMes[];
  /** Totais do mês selecionado (atalho para KPIs). */
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
  /** Composição do plano por rúbrica (para gráfico do dashboard). */
  desembolsoPorRubrica: Array<{
    rubrica: string;
    projetado: number;
    pago: number;
  }>;
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
