/**
 * Comparativo projeção × realizado (desembolso) e receita Conta Azul.
 */
import {
  chaveSerie,
  hashSerie,
  labelMesYm,
  mesPagamentoParcela,
  valorPagoParcela,
  type LinhaProjecao,
  type NaturezaDesembolso,
  type ParcelaBaseProjecao,
} from "./financeiroProjecaoDesembolso";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type MatchComparativo =
  | "matched"
  | "somente_projecao"
  | "somente_realizado";

export type ComparativoDesembolsoLinha = {
  linhaId: string;
  label: string;
  fornecedor: string | null;
  rubrica: string | null;
  natureza: NaturezaDesembolso;
  projetado: number;
  realizado: number;
  /** Quanto ainda falta para bater a projeção (0 se já estourou). */
  restanteADesembolsar: number;
  /** realizado − projetado (positivo = gastou mais que o plano). */
  desvio: number;
  desvioPct: number | null;
  matchStatus: MatchComparativo;
};

export type ComparativoDesembolsoMes = {
  mesYm: string;
  labelMes: string;
  linhas: ComparativoDesembolsoLinha[];
  totais: {
    projetado: number;
    realizado: number;
    restanteADesembolsar: number;
    desvio: number;
    desvioPct: number | null;
    pctRealizadoDoProjetado: number | null;
  };
};

export type ComparativoReceitaLinha = {
  parcelaId: string;
  label: string;
  cliente: string | null;
  rubrica: string | null;
  vencimento: string | null;
  pagamento: string | null;
  previsto: number;
  recebido: number;
  aReceber: number;
};

export type ComparativoReceitaMes = {
  mesYm: string;
  labelMes: string;
  fonte: "conta_azul";
  /**
   * Soma dos valores dos títulos a receber com vencimento no mês (Conta Azul).
   * É a “projeção” nativa do CA para o mês.
   */
  previsto: number;
  /** Baixas/recebimentos no mês (data de pagamento Conta Azul). */
  recebido: number;
  /** Saldo em aberto dos títulos com vencimento no mês (Conta Azul). */
  aReceber: number;
  /** recebido + aReceber. */
  pipelineMes: number;
  /** previsto − recebido (positivo = ainda não liquidou o previsto). */
  gapRecebimento: number;
  gapRecebimentoPct: number | null;
  /** previsto − (recebido + aReceber). */
  gapFinal: number;
  pctRecebidoDoPrevisto: number | null;
  /** Títulos Conta Azul do mês (vencimento ou pagamento no mês), ordenados por impacto. */
  linhas: ComparativoReceitaLinha[];
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

type SerieRealizado = {
  linhaId: string;
  label: string;
  fornecedor: string | null;
  rubrica: string | null;
  realizado: number;
  /** Tokens de nome (fornecedor + descrição) p/ match frouxo. */
  tokens: string[];
  rubricaNorm: string;
};

const STOP_TOKENS = new Set([
  "pix",
  "enviado",
  "recebido",
  "des",
  "ted",
  "doc",
  "transferencia",
  "pagamento",
  "pagto",
  "folha",
  "salario",
  "salarios",
  "prolabore",
  "labore",
  "parcela",
  "ref",
  "mes",
  "mensal",
  "adiantamento",
  "vale",
  "the",
  "and",
  "ltda",
  "eireli",
  "mei",
  "cpf",
  "cnpj",
]);

function normTexto(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensIdentidade(
  ...parts: Array<string | null | undefined>
): string[] {
  const raw = normTexto(parts.filter(Boolean).join(" "));
  if (!raw) return [];
  return raw
    .split(" ")
    .filter(
      t =>
        t.length >= 3 &&
        !STOP_TOKENS.has(t) &&
        !/^\d+$/.test(t) &&
        !/^\d+\/\d+$/.test(t),
    );
}

function overlapTokens(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hit = 0;
  for (const t of a) if (setB.has(t)) hit++;
  return hit / Math.min(a.length, b.length);
}

function valoresProximos(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return false;
  const diff = Math.abs(a - b);
  return diff <= 1.01 || diff / Math.max(a, b) <= 0.02;
}

function agregarRealizadoPorSerie(
  parcelas: ParcelaBaseProjecao[],
  mesYm: string,
): Map<string, SerieRealizado> {
  const map = new Map<string, SerieRealizado>();
  for (const p of parcelas) {
    const pago = valorPagoParcela(p);
    if (pago <= 0) continue;
    if (mesPagamentoParcela(p) !== mesYm) continue;
    const key = chaveSerie(p);
    const linhaId = hashSerie(key);
    const cur = map.get(linhaId);
    if (cur) {
      cur.realizado = round2(cur.realizado + pago);
      continue;
    }
    map.set(linhaId, {
      linhaId,
      label: p.descricao,
      fornecedor: p.fornecedor,
      rubrica: p.rubrica,
      realizado: pago,
      tokens: tokensIdentidade(p.fornecedor, p.descricao),
      rubricaNorm: normTexto(p.rubrica),
    });
  }
  return map;
}

type ProjPendente = {
  lin: LinhaProjecao;
  projetado: number;
  tokens: string[];
  rubricaNorm: string;
};

/**
 * Cruza células ativas da projeção no mês com o que foi pago no Conta Azul.
 * 1) match exato pela série (mesmo hash da grade)
 * 2) match frouxo: mesma rúbrica + pessoa/nome + valor ≈ (PIX vs Folha etc.)
 */
export function montarComparativoDesembolsoMes(input: {
  mesYm: string;
  linhasProjecao: LinhaProjecao[];
  parcelasPagarMes: ParcelaBaseProjecao[];
}): ComparativoDesembolsoMes {
  const { mesYm, linhasProjecao, parcelasPagarMes } = input;
  const realizados = agregarRealizadoPorSerie(parcelasPagarMes, mesYm);
  const linhas: ComparativoDesembolsoLinha[] = [];
  const usadosReal = new Set<string>();
  const pendentesProj: ProjPendente[] = [];

  for (const lin of linhasProjecao) {
    const cel = lin.celulas.find(c => c.mesYm === mesYm);
    const projetado =
      cel && cel.ativo && Number.isFinite(cel.valorEfetivo)
        ? round2(cel.valorEfetivo)
        : 0;
    const real = realizados.get(lin.id);
    if (real && projetado > 0) {
      usadosReal.add(lin.id);
      const realizado = real.realizado;
      const desvio = round2(realizado - projetado);
      linhas.push({
        linhaId: lin.id,
        label: lin.label,
        fornecedor: lin.fornecedor ?? real.fornecedor,
        rubrica: lin.rubrica ?? real.rubrica,
        natureza: lin.natureza,
        projetado,
        realizado,
        restanteADesembolsar: round2(Math.max(0, projetado - realizado)),
        desvio,
        desvioPct: desvioPct(desvio, projetado),
        matchStatus: "matched",
      });
      continue;
    }
    if (real && projetado <= 0) {
      // Realizado bateu o id mas projeção inativa — trata como só realizado depois
      continue;
    }
    if (projetado > 0) {
      pendentesProj.push({
        lin,
        projetado,
        tokens: tokensIdentidade(lin.fornecedor, lin.label),
        rubricaNorm: normTexto(lin.rubrica),
      });
    }
  }

  const candidatosReal = Array.from(realizados.values()).filter(
    r => !usadosReal.has(r.linhaId),
  );

  type PairScore = {
    pi: number;
    ri: number;
    score: number;
  };
  const pairs: PairScore[] = [];

  for (let pi = 0; pi < pendentesProj.length; pi++) {
    const p = pendentesProj[pi]!;
    for (let ri = 0; ri < candidatosReal.length; ri++) {
      const r = candidatosReal[ri]!;
      if (p.rubricaNorm && r.rubricaNorm && p.rubricaNorm !== r.rubricaNorm) {
        continue;
      }
      // Sem rúbrica nos dois lados: ainda tenta por nome + valor
      if (!valoresProximos(p.projetado, r.realizado)) continue;

      const overlap = overlapTokens(p.tokens, r.tokens);
      const fornP = normTexto(p.lin.fornecedor);
      const fornR = normTexto(r.fornecedor);
      const fornIgual = !!(fornP && fornR && fornP === fornR);

      // Exige evidência de pessoa (evita cruzar dois pró-labores iguais)
      if (overlap < 0.4 && !fornIgual) continue;

      const score =
        (fornIgual ? 3 : 0) +
        overlap * 2 -
        Math.abs(p.projetado - r.realizado) / Math.max(p.projetado, 1);
      pairs.push({ pi, ri, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score);
  const projPareado = new Set<number>();
  const realPareado = new Set<number>();

  for (const pair of pairs) {
    if (projPareado.has(pair.pi) || realPareado.has(pair.ri)) continue;
    projPareado.add(pair.pi);
    realPareado.add(pair.ri);
    const p = pendentesProj[pair.pi]!;
    const r = candidatosReal[pair.ri]!;
    usadosReal.add(r.linhaId);
    const realizado = r.realizado;
    const desvio = round2(realizado - p.projetado);
    linhas.push({
      linhaId: p.lin.id,
      label: p.lin.label,
      fornecedor: p.lin.fornecedor ?? r.fornecedor,
      rubrica: p.lin.rubrica ?? r.rubrica,
      natureza: p.lin.natureza,
      projetado: p.projetado,
      realizado,
      restanteADesembolsar: round2(Math.max(0, p.projetado - realizado)),
      desvio,
      desvioPct: desvioPct(desvio, p.projetado),
      matchStatus: "matched",
    });
  }

  for (let pi = 0; pi < pendentesProj.length; pi++) {
    if (projPareado.has(pi)) continue;
    const p = pendentesProj[pi]!;
    const desvio = round2(0 - p.projetado);
    linhas.push({
      linhaId: p.lin.id,
      label: p.lin.label,
      fornecedor: p.lin.fornecedor,
      rubrica: p.lin.rubrica,
      natureza: p.lin.natureza,
      projetado: p.projetado,
      realizado: 0,
      restanteADesembolsar: p.projetado,
      desvio,
      desvioPct: desvioPct(desvio, p.projetado),
      matchStatus: "somente_projecao",
    });
  }

  for (let ri = 0; ri < candidatosReal.length; ri++) {
    if (realPareado.has(ri)) continue;
    const r = candidatosReal[ri]!;
    if (usadosReal.has(r.linhaId)) continue;
    const desvio = round2(r.realizado);
    linhas.push({
      linhaId: r.linhaId,
      label: r.label,
      fornecedor: r.fornecedor,
      rubrica: r.rubrica,
      natureza: "unico",
      projetado: 0,
      realizado: r.realizado,
      restanteADesembolsar: 0,
      desvio,
      desvioPct: desvioPct(desvio, 0),
      matchStatus: "somente_realizado",
    });
  }

  linhas.sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));

  const projetado = round2(linhas.reduce((s, l) => s + l.projetado, 0));
  const realizado = round2(linhas.reduce((s, l) => s + l.realizado, 0));
  const desvio = round2(realizado - projetado);
  return {
    mesYm,
    labelMes: labelMesYm(mesYm),
    linhas,
    totais: {
      projetado,
      realizado,
      restanteADesembolsar: round2(Math.max(0, projetado - realizado)),
      desvio,
      desvioPct: desvioPct(desvio, projetado),
      pctRealizadoDoProjetado:
        projetado > 0 ? round2((realizado / projetado) * 100) : null,
    },
  };
}

/**
 * Receita 100% Conta Azul (contas a receber):
 * - previsto = títulos com vencimento no mês
 * - recebido = baixas com data de pagamento no mês
 * - a receber = em aberto com vencimento no mês
 */
export function montarComparativoReceitaMes(input: {
  mesYm: string;
  parcelasReceberMes: ParcelaBaseProjecao[];
}): ComparativoReceitaMes {
  const { mesYm, parcelasReceberMes } = input;

  let previsto = 0;
  let recebido = 0;
  let aReceber = 0;
  const linhas: ComparativoReceitaLinha[] = [];

  for (const p of parcelasReceberMes) {
    const vencMes = mesVencimentoParcela(p) === mesYm;
    const pagMes = mesPagamentoParcela(p) === mesYm;
    if (!vencMes && !pagMes) continue;

    const valorTitulo = round2(p.valor > 0 ? p.valor : p.valorPago + p.valorEmAberto);
    const pagoNoMes = pagMes ? valorPagoParcela(p) : 0;
    const abertoNoMes =
      vencMes && p.valorEmAberto > 0.009 ? round2(p.valorEmAberto) : 0;
    const previstoLinha = vencMes ? valorTitulo : 0;

    if (previstoLinha > 0) previsto += previstoLinha;
    if (pagoNoMes > 0) recebido += pagoNoMes;
    if (abertoNoMes > 0) aReceber += abertoNoMes;

    if (previstoLinha <= 0 && pagoNoMes <= 0 && abertoNoMes <= 0) continue;

    linhas.push({
      parcelaId: p.id,
      label: p.descricao,
      cliente: p.fornecedor,
      rubrica: p.rubrica,
      vencimento: p.dataVencimento,
      pagamento: p.dataPagamento,
      previsto: previstoLinha,
      recebido: pagoNoMes,
      aReceber: abertoNoMes,
    });
  }

  previsto = round2(previsto);
  recebido = round2(recebido);
  aReceber = round2(aReceber);
  const pipelineMes = round2(recebido + aReceber);
  const gapRecebimento = round2(previsto - recebido);
  const gapFinal = round2(previsto - pipelineMes);

  linhas.sort(
    (a, b) =>
      Math.abs(b.aReceber) + Math.abs(b.recebido) + Math.abs(b.previsto) -
      (Math.abs(a.aReceber) + Math.abs(a.recebido) + Math.abs(a.previsto)),
  );

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
    linhas,
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
      saldoRealizado: round2(receita.recebido - desembolso.totais.realizado),
      gapCaixaMes: round2(
        receita.pipelineMes - desembolso.totais.projetado,
      ),
    },
  };
}
