/**
 * Dashboard financeiro — série de 3 meses (mes−2, mes−1, mês)
 * com projeção × real (vendas e desembolso) e caixa.
 */
import {
  labelMesYm,
  mesAnteriorProjecao,
} from "./financeiroProjecaoDesembolso";
import type { StatusRubricaComparativo } from "./financeiroComparativoProjecao";
import type { ProjecaoVendasRestanteMes } from "./financeiroProjecaoVendas";
import {
  comportamentoDaRubrica,
  type ComportamentoCusto,
} from "./financeiroRubricaComportamento";

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

/** Ação sugerida no mapa custo fixo × variável. */
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
  /** Custo fixo × variável (heurística ou override do projeto). */
  comportamentoCusto: ComportamentoCusto;
  /** Alias legado: true quando comportamentoCusto === "fixo". */
  essencial: boolean;
  /**
   * pagar = fixo em aberto · revisar = fixo acima do plano ·
   * negociar = variável em aberto (pode segurar) ·
   * cortar = variável com volume/estouro (reduzir).
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
  /**
   * Saldo bancário consolidado (todas as contas):
   * saldo inicial manual + recebido − pago (baixas CA desde a data âncora).
   */
  saldoContaAzul: number | null;
  /** Mesmo valor de saldoContaAzul (nome explícito). */
  saldoBancario: number | null;
  /** @deprecated Mantido nulo — saldo único consolidado. */
  saldoBradesco: number | null;
  saldoBradescoFonte: "manual_mais_movimentos" | null;
  movimentosSaldo: {
    recebido: number;
    pago: number;
  } | null;
  bradescoConfig: {
    saldoInicial: number | null;
    saldoInicialData: string | null;
    contaId: string | null;
  };
  contasContaAzul?: Array<{
    id: string;
    nome: string;
    saldo: number | null;
    grupo?: "conta_azul" | "bradesco" | "outro";
  }>;
  desembolsoTotais: {
    projetado: number;
    /** Projetado após abate de rúbricas concluídas (pago a menos). */
    projetadoEfetivo?: number;
    abateConcluidas?: number;
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
  /** Totais do mês por custo fixo × variável (plano completo). */
  custosPorComportamento: CustosPorComportamento;
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
  /** Contas a pagar: impostos/encargos em aberto com vencimento já passado. */
  impostosEncargosAtrasados: {
    total: number;
    qtd: number;
  };
  /** Contas a pagar / receber em aberto com vencimento no dia de hoje (America/SP). */
  contasDoDia: {
    dataIso: string;
    aPagar: { total: number; qtd: number };
    aReceber: { total: number; qtd: number };
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
 * Fixo/variável: heurística + overrides do projeto.
 * Retorna null só se não houver volume (nem plano nem pago).
 */
export function classificarRubricaDashboard(input: {
  rubrica: string;
  projetado: number;
  pago: number;
  naoPago: number;
  pagoAMais: number;
  status: StatusRubricaComparativo;
  /** Mapa chave normalizada → override (null = heurística). */
  comportamentoMap?: Map<string, ComportamentoCusto | null> | null;
}): DesembolsoRubricaDashboard | null {
  const volume = Math.max(input.projetado, input.pago);
  if (volume <= MIN_ACAO) return null;

  const comportamentoCusto = comportamentoDaRubrica(
    input.rubrica,
    input.comportamentoMap,
    input.rubrica,
  );
  const essencial = comportamentoCusto === "fixo";
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
    comportamentoCusto,
    essencial,
    acao,
    valorAcao: round2(valorAcao),
  };
}

/** Totais agregados de um lado (fixo ou variável). */
export type CustosComportamentoTotais = {
  projetado: number;
  pago: number;
  naoPago: number;
  qtdRubricas: number;
};

/** Consolidado do mês: custo fixo × variável. */
export type CustosPorComportamento = {
  fixo: CustosComportamentoTotais;
  variavel: CustosComportamentoTotais;
  total: CustosComportamentoTotais;
  /** % do projetado total que é fixo. */
  pctFixoProjetado: number | null;
  /** % do projetado total que é variável. */
  pctVariavelProjetado: number | null;
};

function emptyComportamentoTotais(): CustosComportamentoTotais {
  return { projetado: 0, pago: 0, naoPago: 0, qtdRubricas: 0 };
}

/**
 * Soma projetado/pago/não pago por comportamento (heurística + overrides).
 * Inclui todas as rúbricas com volume, não só as do mapa de urgência.
 */
export function consolidarCustosPorComportamento(
  rows: Array<{
    rubrica: string;
    projetado: number;
    pago: number;
    naoPago: number;
  }>,
  comportamentoMap?: Map<string, ComportamentoCusto | null> | null,
): CustosPorComportamento {
  const fixo = emptyComportamentoTotais();
  const variavel = emptyComportamentoTotais();

  for (const r of rows) {
    const volume = Math.max(r.projetado, r.pago, r.naoPago);
    if (volume <= 0) continue;
    const c = comportamentoDaRubrica(r.rubrica, comportamentoMap);
    const bucket = c === "fixo" ? fixo : variavel;
    bucket.projetado = round2(bucket.projetado + r.projetado);
    bucket.pago = round2(bucket.pago + r.pago);
    bucket.naoPago = round2(bucket.naoPago + r.naoPago);
    bucket.qtdRubricas += 1;
  }

  const total: CustosComportamentoTotais = {
    projetado: round2(fixo.projetado + variavel.projetado),
    pago: round2(fixo.pago + variavel.pago),
    naoPago: round2(fixo.naoPago + variavel.naoPago),
    qtdRubricas: fixo.qtdRubricas + variavel.qtdRubricas,
  };

  const pctFixoProjetado =
    total.projetado > 0
      ? round2((fixo.projetado / total.projetado) * 100)
      : null;
  const pctVariavelProjetado =
    pctFixoProjetado == null ? null : round2(100 - pctFixoProjetado);

  return {
    fixo,
    variavel,
    total,
    pctFixoProjetado,
    pctVariavelProjetado,
  };
}

/** Painéis do mapa: custo fixo × custo variável. */
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
