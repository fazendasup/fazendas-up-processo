/**
 * Comparativo projeção × realizado por rúbrica (desembolso)
 * e totais de receita Conta Azul (sem listar lançamentos).
 */
import {
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
  | "nao_programada";

export type ComparativoDesembolsoRubrica = {
  rubrica: string;
  projetado: number;
  /** Já pago no Conta Azul no mês. */
  pago: number;
  /** Projetado − pago (mín. 0). */
  naoPago: number;
  /** Pago − projetado (mín. 0). */
  pagoAMais: number;
  /** pago − projetado. */
  desvio: number;
  desvioPct: number | null;
  status: StatusRubricaComparativo;
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
    desvio: number;
    desvioPct: number | null;
    pctPagoDoProjetado: number | null;
  };
};

export type ComparativoReceitaMes = {
  mesYm: string;
  labelMes: string;
  fonte: "conta_azul";
  /** Títulos com vencimento no mês (Conta Azul). */
  previsto: number;
  /** Baixas com pagamento no mês. */
  recebido: number;
  /** Em aberto com vencimento no mês. */
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

function statusRubrica(
  projetado: number,
  pago: number,
): StatusRubricaComparativo {
  if (projetado <= 0 && pago > 0) return "nao_programada";
  if (pago > projetado + 0.009) return "pago_a_mais";
  if (pago < projetado - 0.009) return "faltando";
  return "em_dia";
}

/**
 * Agrega projeção marcada e pagamentos Conta Azul por rúbrica.
 */
export function montarComparativoDesembolsoMes(input: {
  mesYm: string;
  linhasProjecao: LinhaProjecao[];
  parcelasPagarMes: ParcelaBaseProjecao[];
}): ComparativoDesembolsoMes {
  const { mesYm, linhasProjecao, parcelasPagarMes } = input;
  const projetadoPor = new Map<string, number>();
  const pagoPor = new Map<string, number>();

  for (const lin of linhasProjecao) {
    const cel = lin.celulas.find(c => c.mesYm === mesYm);
    if (!cel?.ativo || !Number.isFinite(cel.valorEfetivo) || cel.valorEfetivo <= 0) {
      continue;
    }
    const rub = labelRubrica(lin.rubrica);
    projetadoPor.set(rub, round2((projetadoPor.get(rub) ?? 0) + cel.valorEfetivo));
  }

  for (const p of parcelasPagarMes) {
    const pago = valorPagoParcela(p);
    if (pago <= 0) continue;
    if (mesPagamentoParcela(p) !== mesYm) continue;
    const rub = labelRubrica(p.rubrica);
    pagoPor.set(rub, round2((pagoPor.get(rub) ?? 0) + pago));
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
    const desvio = round2(pago - projetado);
    rubricas.push({
      rubrica: rub,
      projetado,
      pago,
      naoPago: round2(Math.max(0, projetado - pago)),
      pagoAMais: round2(Math.max(0, pago - projetado)),
      desvio,
      desvioPct: desvioPct(desvio, projetado),
      status: statusRubrica(projetado, pago),
    });
  }

  rubricas.sort((a, b) => {
    const rank = (s: StatusRubricaComparativo) =>
      s === "nao_programada"
        ? 0
        : s === "pago_a_mais"
          ? 1
          : s === "faltando"
            ? 2
            : 3;
    const dr = rank(a.status) - rank(b.status);
    if (dr !== 0) return dr;
    return Math.abs(b.desvio) - Math.abs(a.desvio);
  });

  const projetado = round2(rubricas.reduce((s, r) => s + r.projetado, 0));
  const pago = round2(rubricas.reduce((s, r) => s + r.pago, 0));
  const desvio = round2(pago - projetado);
  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    rubricas,
    totais: {
      projetado,
      pago,
      naoPago: round2(Math.max(0, projetado - pago)),
      pagoAMais: round2(
        rubricas.reduce((s, r) => s + r.pagoAMais, 0),
      ),
      desvio,
      desvioPct: desvioPct(desvio, projetado),
      pctPagoDoProjetado:
        projetado > 0 ? round2((pago / projetado) * 100) : null,
    },
  };
}

/**
 * Totais Conta Azul (contas a receber) — sem listar títulos.
 */
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
