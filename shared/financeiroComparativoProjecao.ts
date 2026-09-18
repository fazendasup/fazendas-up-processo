/**
 * Comparativo projeção × realizado por rúbrica (desembolso)
 * e totais de receita Conta Azul (sem listar lançamentos).
 */
import {
  ehNaoDesembolsoCusto,
  ehReceitaVendasCaixa,
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

/** Resumo por categoria das baixas (p/ aviso do ainda-entra). */
export function resumirBaixasPorCategoria(
  parcelas: ParcelaBaseProjecao[],
  opts?: { soVendas?: boolean; top?: number },
): Array<{ rubrica: string; total: number; qtd: number; incluido: boolean }> {
  const map = new Map<
    string,
    { total: number; qtd: number; incluido: boolean }
  >();
  for (const p of parcelas) {
    const pago = valorPagoParcela(p);
    if (pago <= 0) continue;
    const incluido = ehReceitaVendasCaixa(p);
    if (opts?.soVendas && !incluido) continue;
    const rubrica = (p.rubrica || RUBRICA_SEM).trim() || RUBRICA_SEM;
    const cur = map.get(rubrica) ?? { total: 0, qtd: 0, incluido };
    cur.total = round2(cur.total + pago);
    cur.qtd += 1;
    cur.incluido = incluido;
    map.set(rubrica, cur);
  }
  return [...map.entries()]
    .map(([rubrica, v]) => ({ rubrica, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, opts?.top ?? 8);
}

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

export type ComparativoReceitaDetalheTitulo = {
  id: string;
  descricao: string;
  fornecedor: string | null;
  valor: number;
  dataVencimento: string | null;
  dataPagamento?: string | null;
  rubrica?: string | null;
};

/** @deprecated Use ComparativoReceitaDetalheTitulo */
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
  vencidosDetalhe: ComparativoReceitaDetalheTitulo[];
  /** Baixas que somam `recebido`. */
  recebidosDetalhe: ComparativoReceitaDetalheTitulo[];
  /** Em aberto no prazo que somam `aReceberNoMes`. */
  aReceberDetalhe: ComparativoReceitaDetalheTitulo[];
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
    /** Projeção de fechar o mês (volume) − desembolso projetado. */
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
  const vencidosDetalhe: ComparativoReceitaDetalheTitulo[] = [];
  const recebidosDetalhe: ComparativoReceitaDetalheTitulo[] = [];
  const aReceberDetalhe: ComparativoReceitaDetalheTitulo[] = [];

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
            valor: round2(p.valorEmAberto),
            dataVencimento: p.dataVencimento,
            rubrica: p.rubrica,
          });
        } else {
          aReceberNoMes += p.valorEmAberto;
          aReceberDetalhe.push({
            id: p.id,
            descricao: p.descricao,
            fornecedor: p.fornecedor,
            valor: round2(p.valorEmAberto),
            dataVencimento: p.dataVencimento,
            rubrica: p.rubrica,
          });
        }
      }
    }

    if (pagMes) {
      const pago = valorPagoParcela(p);
      if (pago > 0) {
        recebido += pago;
        recebidosDetalhe.push({
          id: p.id,
          descricao: p.descricao,
          fornecedor: p.fornecedor,
          valor: round2(pago),
          dataVencimento: p.dataVencimento,
          dataPagamento: p.dataPagamento,
          rubrica: p.rubrica,
        });
      }
    }
  }

  vencidosDetalhe.sort((a, b) => b.valor - a.valor);
  recebidosDetalhe.sort((a, b) => b.valor - a.valor);
  aReceberDetalhe.sort((a, b) => b.valor - a.valor);

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
  // Volume do mês (exibição): faturado + orçamento.
  const vendasMesAtual = round2(
    input.vendasMesAtual ?? vendasFaturadas + orcamentos,
  );

  const projecaoVendasBase = montarProjecaoVendasRestanteMes({
    mesYm,
    hojeYm,
    diaHoje,
    // Projetado de fechar NÃO inclui orçamento — só volume já faturado
    // (a projeção de caixa sobrescreve projecaoMesTotal abaixo).
    vendasMesAtual: vendasFaturadas,
    vendasAteDiaMesAnterior1: input.vendasAteDiaMesAnterior1 ?? 0,
    vendasAteDiaMesAnterior2: input.vendasAteDiaMesAnterior2 ?? 0,
    // Estes dois campos passam a ser baixas Conta Azul (caixa), não volume.
    vendasRestanteMesAnterior1: input.vendasRestanteMesAnterior1 ?? 0,
    vendasRestanteMesAnterior2: input.vendasRestanteMesAnterior2 ?? 0,
    mesAnterior1Ym: mes1,
    mesAnterior2Ym: mes2,
  });
  // Projeção de fechar o mês em caixa: já no pipeline CA + o que ainda entra.
  // Orçamentos ficam só em vendasCompetencia (pipeline comercial).
  const projecaoMesTotal = round2(
    recebido + aReceber + projecaoVendasBase.aindaEntraProjetado,
  );
  const projecaoVendas = { ...projecaoVendasBase, projecaoMesTotal };
  const gapVsProjecaoVendas = round2(projecaoMesTotal - pipelineMes);

  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    fonte: "conta_azul",
    previsto,
    recebido,
    aReceberNoMes,
    vencido,
    vencidosDetalhe,
    recebidosDetalhe,
    aReceberDetalhe,
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

/**
 * Totais de caixa no intervalo [inicioIso, fimIso] (dias America/SP).
 * Recebido = baixas com pagamento no intervalo.
 * Em aberto = vencimento no intervalo (no prazo vs atrasado vs hoje).
 */
export function agregarReceitaCaixaPeriodo(input: {
  parcelasReceber: ParcelaBaseProjecao[];
  inicioIso: string;
  fimIso: string;
  hojeIso: string;
}): {
  recebido: number;
  aReceberNoMes: number;
  vencido: number;
  aReceber: number;
  previsto: number;
} {
  const { inicioIso, fimIso, hojeIso } = input;
  let recebido = 0;
  let aReceberNoMes = 0;
  let vencido = 0;
  let previsto = 0;
  const porId = new Map<string, ParcelaBaseProjecao>();
  for (const p of input.parcelasReceber) {
    if (!porId.has(p.id)) porId.set(p.id, p);
  }

  for (const p of Array.from(porId.values())) {
    const vencIso = (p.dataVencimento ?? "").slice(0, 10);
    const pagIso = (p.dataPagamento ?? "").slice(0, 10);
    const aberto = p.valorEmAberto > 0.009;

    const vencNoPeriodo =
      !!vencIso &&
      /^\d{4}-\d{2}-\d{2}$/.test(vencIso) &&
      vencIso >= inicioIso &&
      vencIso <= fimIso;

    if (vencNoPeriodo) {
      const valorTitulo = round2(
        p.valor > 0 ? p.valor : p.valorPago + p.valorEmAberto,
      );
      if (valorTitulo > 0) previsto += valorTitulo;
      if (aberto) {
        const jaVenceu = !!vencIso && vencIso < hojeIso;
        if (jaVenceu) vencido += p.valorEmAberto;
        else aReceberNoMes += p.valorEmAberto;
      }
    }

    let pagRef = pagIso;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pagRef)) {
      const mesPag = mesPagamentoParcela(p);
      if (mesPag && vencIso && vencIso.startsWith(mesPag)) pagRef = vencIso;
      else if (mesPag) pagRef = `${mesPag}-01`;
    }
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(pagRef) &&
      pagRef >= inicioIso &&
      pagRef <= fimIso
    ) {
      const pago = valorPagoParcela(p);
      if (pago > 0) recebido += pago;
    }
  }

  aReceberNoMes = round2(aReceberNoMes);
  vencido = round2(vencido);
  return {
    recebido: round2(recebido),
    aReceberNoMes,
    vencido,
    aReceber: round2(aReceberNoMes + vencido),
    previsto: round2(previsto),
  };
}

/** Soma valor pago de a-pagar com data de pagamento no intervalo. */
export function somarDesembolsoPagoPeriodo(
  parcelasPagar: ParcelaBaseProjecao[],
  inicioIso: string,
  fimIso: string,
): number {
  let total = 0;
  for (const p of parcelasPagar) {
    if (ehNaoDesembolsoCusto(p)) continue;
    const pago = valorPagoParcela(p);
    if (pago <= 0) continue;
    let pagRef = (p.dataPagamento ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pagRef)) {
      const mesPag = mesPagamentoParcela(p);
      if (!mesPag) continue;
      pagRef = `${mesPag}-15`;
    }
    if (pagRef >= inicioIso && pagRef <= fimIso) total += pago;
  }
  return round2(total);
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

/**
 * Soma das baixas nos últimos `nDias` dias do mês (somente receita de vendas).
 * 1) Se houver data_pagamento nos últimos N dias → soma exata.
 * 2) Senão, estima pela média do recebido do mês × (N / dias do mês).
 */
export function somarRecebidoUltimosNDias(
  parcelas: ParcelaBaseProjecao[],
  mesYm: string,
  nDias: number,
): number {
  if (!/^\d{4}-\d{2}$/.test(mesYm) || nDias <= 0) return 0;
  const [y, m] = mesYm.split("-").map(Number);
  const diasNoMes = new Date(y, m, 0).getDate();
  const n = Math.min(Math.floor(nDias), diasNoMes);
  const diaInicio = diasNoMes - n + 1;

  let comDataNosUltimos = 0;
  let totalMes = 0;

  for (const p of parcelas) {
    if (!ehReceitaVendasCaixa(p)) continue;
    const pago = valorPagoParcela(p);
    if (pago <= 0) continue;
    const dp = (p.dataPagamento ?? "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(dp) && dp.slice(0, 7) === mesYm) {
      totalMes += pago;
      const dia = Number(dp.slice(8, 10));
      if (Number.isFinite(dia) && dia >= diaInicio && dia <= diasNoMes) {
        comDataNosUltimos += pago;
      }
      continue;
    }
    if (mesPagamentoParcela(p) === mesYm) {
      totalMes += pago;
    }
  }

  if (comDataNosUltimos > 0) return round2(comDataNosUltimos);
  if (totalMes <= 0 || diasNoMes <= 0) return 0;
  // Sem granularidade de dia: proporção do recebido do mês (média de caixa).
  return round2((totalMes * n) / diasNoMes);
}

/** Soma valores pagos — só receita de vendas (ainda entra / média de caixa). */
export function somarValorPagoParcelas(parcelas: ParcelaBaseProjecao[]): number {
  let s = 0;
  for (const p of parcelas) {
    if (!ehReceitaVendasCaixa(p)) continue;
    const pago = valorPagoParcela(p);
    if (pago > 0) s += pago;
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
      /** Projeção de volume do mês vs desembolso planejado. */
      gapCaixaMes: round2(
        receita.projecaoVendas.projecaoMesTotal - desembolso.totais.projetado,
      ),
    },
  };
}
