/**
 * Comparativo projeção × realizado por rúbrica (desembolso)
 * e totais de receita Conta Azul (sem listar lançamentos).
 */
import {
  ehNaoDesembolsoCusto,
  ehRubricaTipicaDeAtrasoMensal,
  labelMesYm,
  mesAnteriorProjecao,
  mesPagamentoParcela,
  valorPagoParcela,
  type LinhaProjecao,
  type ParcelaBaseProjecao,
} from "./financeiroProjecaoDesembolso";
import {
  montarProjecaoVendasRestanteMes,
  type ProjecaoVendasRestanteMes,
} from "./financeiroProjecaoVendas";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const RUBRICA_SEM = "(Sem rúbrica)";

export type StatusRubricaComparativo =
  | "em_dia"
  | "faltando"
  | "pago_a_mais"
  /** Essencial/recorrente pago no mês sem projeção (ex.: atraso do mês anterior). */
  | "pago_em_atraso"
  | "nao_programada";

export type ComparativoDesembolsoDetalhe = {
  id: string;
  /** Projetado na grade ou pago no Conta Azul. */
  origem: "projetado" | "pago";
  label: string;
  fornecedor: string | null;
  valor: number;
  /** Data de pagamento (só origem pago). */
  dataPagamento: string | null;
  /** Categoria no Conta Azul (antes de edição local). */
  rubricaContaAzul: string | null;
  /** Rúbrica usada no comparativo (pode ser override nosso). */
  rubricaUsada: string | null;
  /** true se divergiu da categoria original do CA. */
  rubricaEditadaLocal: boolean;
};

export type ComparativoDesembolsoRubrica = {
  rubrica: string;
  projetado: number;
  /** Já pago no Conta Azul no mês. */
  pago: number;
  /** Projetado − pago (mín. 0). */
  naoPago: number;
  /** Pago − projetado (mín. 0); 0 se for atraso de recorrente. */
  pagoAMais: number;
  /** pago − projetado. */
  desvio: number;
  desvioPct: number | null;
  status: StatusRubricaComparativo;
  /** Linhas da grade + títulos pagos (para expandir na UI). */
  detalhes: ComparativoDesembolsoDetalhe[];
};

export type ComparativoDesembolsoMes = {
  mesYm: string;
  labelMes: string;
  rubricas: ComparativoDesembolsoRubrica[];
  totais: {
    projetado: number;
    pago: number;
    naoPago: number;
    pagoAMais: number;
    /** Pagamentos de recorrentes sem projeção no mês (atraso). */
    pagoEmAtraso: number;
    desvio: number;
    desvioPct: number | null;
    pctPagoDoProjetado: number | null;
  };
};

export type ComparativoReceitaDetalheVencido = {
  id: string;
  descricao: string;
  fornecedor: string | null;
  valorEmAberto: number;
  dataVencimento: string | null;
};

export type ComparativoReceitaMes = {
  mesYm: string;
  labelMes: string;
  fonte: "conta_azul";
  previsto: number;
  recebido: number;
  /** Em aberto com vencimento no mês e ainda não vencido (data ≥ hoje). */
  aReceberNoMes: number;
  /** Em aberto com vencimento no mês e data já passou (atraso dentro do mês). */
  vencido: number;
  /** Lista dos títulos que somam `vencido` (Conta Azul). */
  vencidosDetalhe: ComparativoReceitaDetalheVencido[];
  /** aReceberNoMes + vencido (só competência do mês). */
  aReceber: number;
  /** recebido + aReceberNoMes + vencido. */
  pipelineMes: number;
  /** Alias de pipelineMes (sem atrasados de outros meses). */
  pipelineComVencido: number;
  gapRecebimento: number;
  gapRecebimentoPct: number | null;
  /** previsto − pipelineMes. */
  gapFinal: number;
  pctRecebidoDoPrevisto: number | null;
  /** Quebra do “já no mês”: vendas faturadas × orçamentos ≤15 (sem spill). */
  vendasCompetencia: {
    vendasFaturadas: number;
    /** Só orçamentos com data neste mês até o dia 15. */
    orcamentos: number;
    total: number;
  };
  /** Projeção de vendas (últimos N dias dos 2 meses anteriores). */
  projecaoVendas: ProjecaoVendasRestanteMes;
  /** projecaoMesTotal − pipelineMes. */
  gapVsProjecaoVendas: number;
};

export type FinanceiroComparativoPayload = {
  mesYm: string;
  desembolso: ComparativoDesembolsoMes;
  receita: ComparativoReceitaMes;
  caixa: {
    saldoRealizado: number;
    gapCaixaMes: number;
  };
};

function desvioPct(desvio: number, base: number): number | null {
  if (base > 0) return round2((desvio / base) * 100);
  if (base === 0 && desvio !== 0) return desvio > 0 ? 100 : -100;
  return null;
}

function mesVencimentoParcela(p: ParcelaBaseProjecao): string | null {
  const ref = p.dataVencimento;
  if (!ref || !/^\d{4}-\d{2}/.test(ref)) return null;
  return ref.slice(0, 7);
}

function labelRubrica(rubrica: string | null | undefined): string {
  const t = (rubrica ?? "").trim();
  return t || RUBRICA_SEM;
}

function ehRecorrenteEsperada(rubrica: string): boolean {
  if (rubrica === RUBRICA_SEM) return false;
  return ehRubricaTipicaDeAtrasoMensal("", rubrica);
}

function statusRubrica(
  projetado: number,
  pago: number,
  rubrica: string,
): StatusRubricaComparativo {
  if (projetado <= 0 && pago > 0) {
    return ehRecorrenteEsperada(rubrica) ? "pago_em_atraso" : "nao_programada";
  }
  if (pago > projetado + 0.009) return "pago_a_mais";
  if (pago < projetado - 0.009) return "faltando";
  return "em_dia";
}

/**
 * Agrega projeção marcada e pagamentos Conta Azul por rúbrica.
 * Ignora créditos/descontos obtidos (não são desembolso).
 */
export function montarComparativoDesembolsoMes(input: {
  mesYm: string;
  linhasProjecao: LinhaProjecao[];
  parcelasPagarMes: ParcelaBaseProjecao[];
}): ComparativoDesembolsoMes {
  const { mesYm, linhasProjecao, parcelasPagarMes } = input;
  const projetadoPor = new Map<string, number>();
  const pagoPor = new Map<string, number>();
  const detalhesPor = new Map<string, ComparativoDesembolsoDetalhe[]>();

  const pushDetalhe = (rub: string, d: ComparativoDesembolsoDetalhe) => {
    const list = detalhesPor.get(rub) ?? [];
    list.push(d);
    detalhesPor.set(rub, list);
  };

  for (const lin of linhasProjecao) {
    if (ehNaoDesembolsoCusto(lin.label, lin.rubrica)) continue;
    const cel = lin.celulas.find(c => c.mesYm === mesYm);
    if (!cel?.ativo || !Number.isFinite(cel.valorEfetivo) || cel.valorEfetivo <= 0) {
      continue;
    }
    const rub = labelRubrica(lin.rubrica);
    const valor = round2(cel.valorEfetivo);
    projetadoPor.set(rub, round2((projetadoPor.get(rub) ?? 0) + valor));
    pushDetalhe(rub, {
      id: `proj:${lin.id}`,
      origem: "projetado",
      label: lin.label,
      fornecedor: lin.fornecedor,
      valor,
      dataPagamento: null,
      rubricaContaAzul: null,
      rubricaUsada: lin.rubrica,
      rubricaEditadaLocal: false,
    });
  }

  for (const p of parcelasPagarMes) {
    if (ehNaoDesembolsoCusto(p.descricao, p.rubrica)) continue;
    const pago = valorPagoParcela(p);
    if (pago <= 0) continue;
    if (mesPagamentoParcela(p) !== mesYm) continue;
    const rub = labelRubrica(p.rubrica);
    pagoPor.set(rub, round2((pagoPor.get(rub) ?? 0) + pago));
    pushDetalhe(rub, {
      id: `pago:${p.id}`,
      origem: "pago",
      label: p.descricao,
      fornecedor: p.fornecedor,
      valor: pago,
      dataPagamento: p.dataPagamento,
      rubricaContaAzul: p.rubricaOriginal?.trim() || p.rubrica,
      rubricaUsada: p.rubrica,
      rubricaEditadaLocal: p.rubricaEditadaLocal === true,
    });
  }

  const chaves = new Set([
    ...Array.from(projetadoPor.keys()),
    ...Array.from(pagoPor.keys()),
  ]);

  const rubricas: ComparativoDesembolsoRubrica[] = [];
  for (const rub of Array.from(chaves)) {
    const projetado = projetadoPor.get(rub) ?? 0;
    const pago = pagoPor.get(rub) ?? 0;
    if (projetado <= 0 && pago <= 0) continue;
    const status = statusRubrica(projetado, pago, rub);
    const desvio = round2(pago - projetado);
    const pagoAMais =
      status === "pago_em_atraso"
        ? 0
        : round2(Math.max(0, pago - projetado));
    const detalhes = [...(detalhesPor.get(rub) ?? [])].sort((a, b) => {
      if (a.origem !== b.origem) return a.origem === "projetado" ? -1 : 1;
      return b.valor - a.valor;
    });
    rubricas.push({
      rubrica: rub,
      projetado,
      pago,
      naoPago: round2(Math.max(0, projetado - pago)),
      pagoAMais,
      desvio: status === "pago_em_atraso" ? 0 : desvio,
      desvioPct:
        status === "pago_em_atraso" ? null : desvioPct(desvio, projetado),
      status,
      detalhes,
    });
  }

  rubricas.sort((a, b) => {
    const rank = (s: StatusRubricaComparativo) =>
      s === "nao_programada"
        ? 0
        : s === "pago_a_mais"
          ? 1
          : s === "pago_em_atraso"
            ? 2
            : s === "faltando"
              ? 3
              : 4;
    const dr = rank(a.status) - rank(b.status);
    if (dr !== 0) return dr;
    return Math.abs(b.pagoAMais || b.desvio) - Math.abs(a.pagoAMais || a.desvio);
  });

  const projetado = round2(rubricas.reduce((s, r) => s + r.projetado, 0));
  const pago = round2(rubricas.reduce((s, r) => s + r.pago, 0));
  const pagoEmAtraso = round2(
    rubricas
      .filter(r => r.status === "pago_em_atraso")
      .reduce((s, r) => s + r.pago, 0),
  );
  const pagoNoPlano = round2(pago - pagoEmAtraso);
  const desvio = round2(pagoNoPlano - projetado);
  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    rubricas,
    totais: {
      projetado,
      pago,
      naoPago: round2(Math.max(0, projetado - pagoNoPlano)),
      pagoAMais: round2(rubricas.reduce((s, r) => s + r.pagoAMais, 0)),
      pagoEmAtraso,
      desvio,
      desvioPct: desvioPct(desvio, projetado),
      pctPagoDoProjetado:
        projetado > 0 ? round2((pagoNoPlano / projetado) * 100) : null,
    },
  };
}

export function montarComparativoReceitaMes(input: {
  mesYm: string;
  parcelasReceberMes: ParcelaBaseProjecao[];
  /** @deprecated Ignorado — vencidos de outros meses não entram mais. */
  parcelasReceberExtras?: ParcelaBaseProjecao[];
  /** Vendas faturadas no mês (competência). */
  vendasFaturadasMes?: number;
  /** Orçamentos com competência no mês (≤15 ou spill do mês anterior). */
  orcamentosCompetenciaMes?: number;
  /** Total competência mês (vendas + orçamentos); se omitido = soma dos dois. */
  vendasMesAtual?: number;
  vendasAteDiaMesAnterior1?: number;
  vendasAteDiaMesAnterior2?: number;
  vendasRestanteMesAnterior1?: number;
  vendasRestanteMesAnterior2?: number;
  /** Calendário America/SP — default: assume mês fechado se omitido. */
  hojeYm?: string;
  diaHoje?: number;
}): ComparativoReceitaMes {
  const { mesYm } = input;
  const mes1 = mesAnteriorProjecao(mesYm);
  const mes2 = mesAnteriorProjecao(mes1);
  const hojeYm = input.hojeYm ?? mesYm;
  const diaHoje = input.diaHoje ?? 31;
  const hojeIso = `${hojeYm}-${String(Math.min(Math.max(1, Math.floor(diaHoje)), 31)).padStart(2, "0")}`;

  const porId = new Map<string, ParcelaBaseProjecao>();
  for (const p of input.parcelasReceberMes) {
    porId.set(p.id, p);
  }

  let previsto = 0;
  let recebido = 0;
  let aReceberNoMes = 0;
  let vencido = 0;
  const vencidosDetalhe: ComparativoReceitaDetalheVencido[] = [];

  for (const p of Array.from(porId.values())) {
    const vencYm = mesVencimentoParcela(p);
    const vencMes = vencYm === mesYm;
    const aberto = p.valorEmAberto > 0.009;
    const vencIso = (p.dataVencimento ?? "").slice(0, 10);
    // Listagem CA costuma omitir data_pagamento: mesPagamentoParcela faz
    // fallback para vencimento quando o título já está quitado.
    const pagMes = mesPagamentoParcela(p) === mesYm;

    if (vencMes) {
      const valorTitulo = round2(
        p.valor > 0 ? p.valor : p.valorPago + p.valorEmAberto,
      );
      if (valorTitulo > 0) previsto += valorTitulo;
      if (aberto) {
        // Vencido do mês: em aberto e data de vencimento já passou (só no mês).
        const jaVenceu =
          mesYm < hojeYm || (mesYm === hojeYm && !!vencIso && vencIso < hojeIso);
        if (jaVenceu) {
          vencido += p.valorEmAberto;
          vencidosDetalhe.push({
            id: p.id,
            descricao: p.descricao,
            fornecedor: p.fornecedor,
            valorEmAberto: round2(p.valorEmAberto),
            dataVencimento: p.dataVencimento,
          });
        } else {
          aReceberNoMes += p.valorEmAberto;
        }
      }
    }

    if (pagMes) {
      const pago = valorPagoParcela(p);
      if (pago > 0) recebido += pago;
    }
  }

  vencidosDetalhe.sort((a, b) => b.valorEmAberto - a.valorEmAberto);

  previsto = round2(previsto);
  recebido = round2(recebido);
  aReceberNoMes = round2(aReceberNoMes);
  vencido = round2(vencido);
  const aReceber = round2(aReceberNoMes + vencido);
  const pipelineMes = round2(recebido + aReceber);
  const pipelineComVencido = pipelineMes;
  const gapRecebimento = round2(previsto - recebido);
  const gapFinal = round2(previsto - pipelineMes);

  const vendasFaturadas = round2(input.vendasFaturadasMes ?? 0);
  const orcamentos = round2(input.orcamentosCompetenciaMes ?? 0);
  const vendasMesAtual = round2(
    input.vendasMesAtual ?? vendasFaturadas + orcamentos,
  );

  const projecaoVendas = montarProjecaoVendasRestanteMes({
    mesYm,
    hojeYm,
    diaHoje,
    vendasMesAtual,
    vendasAteDiaMesAnterior1: input.vendasAteDiaMesAnterior1 ?? 0,
    vendasAteDiaMesAnterior2: input.vendasAteDiaMesAnterior2 ?? 0,
    vendasRestanteMesAnterior1: input.vendasRestanteMesAnterior1 ?? 0,
    vendasRestanteMesAnterior2: input.vendasRestanteMesAnterior2 ?? 0,
    mesAnterior1Ym: mes1,
    mesAnterior2Ym: mes2,
  });
  const gapVsProjecaoVendas = round2(
    projecaoVendas.projecaoMesTotal - pipelineMes,
  );

  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    fonte: "conta_azul",
    previsto,
    recebido,
    aReceberNoMes,
    vencido,
    vencidosDetalhe,
    aReceber,
    pipelineMes,
    pipelineComVencido,
    gapRecebimento,
    gapRecebimentoPct: desvioPct(-gapRecebimento, previsto),
    gapFinal,
    pctRecebidoDoPrevisto:
      previsto > 0 ? round2((recebido / previsto) * 100) : null,
    vendasCompetencia: {
      vendasFaturadas,
      orcamentos,
      total: vendasMesAtual,
    },
    projecaoVendas,
    gapVsProjecaoVendas,
  };
}

/** Soma do recebido (baixa) em um mês a partir das parcelas. */
export function somarRecebidoNoMes(
  parcelas: ParcelaBaseProjecao[],
  mesYm: string,
): number {
  let s = 0;
  for (const p of parcelas) {
    if (mesPagamentoParcela(p) !== mesYm) continue;
    s += valorPagoParcela(p);
  }
  return round2(s);
}

export function montarFinanceiroComparativo(input: {
  mesYm: string;
  linhasProjecao: LinhaProjecao[];
  parcelasPagarMes: ParcelaBaseProjecao[];
  parcelasReceberMes: ParcelaBaseProjecao[];
  parcelasReceberExtras?: ParcelaBaseProjecao[];
  vendasFaturadasMes?: number;
  orcamentosCompetenciaMes?: number;
  vendasMesAtual?: number;
  vendasAteDiaMesAnterior1?: number;
  vendasAteDiaMesAnterior2?: number;
  vendasRestanteMesAnterior1?: number;
  vendasRestanteMesAnterior2?: number;
  hojeYm?: string;
  diaHoje?: number;
}): FinanceiroComparativoPayload {
  const desembolso = montarComparativoDesembolsoMes({
    mesYm: input.mesYm,
    linhasProjecao: input.linhasProjecao,
    parcelasPagarMes: input.parcelasPagarMes,
  });
  const receita = montarComparativoReceitaMes({
    mesYm: input.mesYm,
    parcelasReceberMes: input.parcelasReceberMes,
    parcelasReceberExtras: input.parcelasReceberExtras,
    vendasFaturadasMes: input.vendasFaturadasMes,
    orcamentosCompetenciaMes: input.orcamentosCompetenciaMes,
    vendasMesAtual: input.vendasMesAtual,
    vendasAteDiaMesAnterior1: input.vendasAteDiaMesAnterior1,
    vendasAteDiaMesAnterior2: input.vendasAteDiaMesAnterior2,
    vendasRestanteMesAnterior1: input.vendasRestanteMesAnterior1,
    vendasRestanteMesAnterior2: input.vendasRestanteMesAnterior2,
    hojeYm: input.hojeYm,
    diaHoje: input.diaHoje,
  });
  return {
    mesYm: input.mesYm,
    desembolso,
    receita,
    caixa: {
      saldoRealizado: round2(receita.recebido - desembolso.totais.pago),
      /** Caixa do mês: sem misturar vencido de meses anteriores. */
      gapCaixaMes: round2(
        receita.pipelineMes - desembolso.totais.projetado,
      ),
    },
  };
}
