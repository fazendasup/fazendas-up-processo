/**
 * Comparativo projeção × realizado por rúbrica (desembolso)
 * e totais de receita Conta Azul (sem listar lançamentos).
 */
import {
  ehCreditoOuDescontoObtido,
  ehRubricaTipicaDeAtrasoMensal,
  labelMesYm,
  mesPagamentoParcela,
  valorPagoParcela,
  type LinhaProjecao,
  type ParcelaBaseProjecao,
} from "./financeiroProjecaoDesembolso";

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

export type ComparativoReceitaMes = {
  mesYm: string;
  labelMes: string;
  fonte: "conta_azul";
  previsto: number;
  recebido: number;
  aReceber: number;
  pipelineMes: number;
  gapRecebimento: number;
  gapRecebimentoPct: number | null;
  gapFinal: number;
  pctRecebidoDoPrevisto: number | null;
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
    if (ehCreditoOuDescontoObtido(lin.label, lin.rubrica)) continue;
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
    });
  }

  for (const p of parcelasPagarMes) {
    if (ehCreditoOuDescontoObtido(p.descricao, p.rubrica)) continue;
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
}): ComparativoReceitaMes {
  const { mesYm, parcelasReceberMes } = input;

  let previsto = 0;
  let recebido = 0;
  let aReceber = 0;

  for (const p of parcelasReceberMes) {
    const vencMes = mesVencimentoParcela(p) === mesYm;
    const pagMes = mesPagamentoParcela(p) === mesYm;
    if (!vencMes && !pagMes) continue;

    if (vencMes) {
      const valorTitulo = round2(
        p.valor > 0 ? p.valor : p.valorPago + p.valorEmAberto,
      );
      if (valorTitulo > 0) previsto += valorTitulo;
      if (p.valorEmAberto > 0.009) aReceber += p.valorEmAberto;
    }
    if (pagMes) {
      const pago = valorPagoParcela(p);
      if (pago > 0) recebido += pago;
    }
  }

  previsto = round2(previsto);
  recebido = round2(recebido);
  aReceber = round2(aReceber);
  const pipelineMes = round2(recebido + aReceber);
  const gapRecebimento = round2(previsto - recebido);
  const gapFinal = round2(previsto - pipelineMes);

  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    fonte: "conta_azul",
    previsto,
    recebido,
    aReceber,
    pipelineMes,
    gapRecebimento,
    gapRecebimentoPct: desvioPct(-gapRecebimento, previsto),
    gapFinal,
    pctRecebidoDoPrevisto:
      previsto > 0 ? round2((recebido / previsto) * 100) : null,
  };
}

export function montarFinanceiroComparativo(input: {
  mesYm: string;
  linhasProjecao: LinhaProjecao[];
  parcelasPagarMes: ParcelaBaseProjecao[];
  parcelasReceberMes: ParcelaBaseProjecao[];
}): FinanceiroComparativoPayload {
  const desembolso = montarComparativoDesembolsoMes({
    mesYm: input.mesYm,
    linhasProjecao: input.linhasProjecao,
    parcelasPagarMes: input.parcelasPagarMes,
  });
  const receita = montarComparativoReceitaMes({
    mesYm: input.mesYm,
    parcelasReceberMes: input.parcelasReceberMes,
  });
  return {
    mesYm: input.mesYm,
    desembolso,
    receita,
    caixa: {
      saldoRealizado: round2(receita.recebido - desembolso.totais.pago),
      gapCaixaMes: round2(
        receita.pipelineMes - desembolso.totais.projetado,
      ),
    },
  };
}
