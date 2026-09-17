/**
 * Projeção de desembolso (contas a pagar) — grade editável.
 * Células já executadas (pagas) são somente leitura; previstas/projetadas editáveis.
 */

export type NaturezaDesembolso = "parcela" | "recorrente" | "unico" | "manual";

export type OrigemCelulaProjecao =
  | "executado"
  | "previsto_ca"
  | "projetado"
  | "manual";

export type CelulaProjecao = {
  mesYm: string;
  valorBase: number;
  valorEfetivo: number;
  ativo: boolean;
  editavel: boolean;
  origem: OrigemCelulaProjecao;
  parcelaId: string | null;
};

export type LinhaProjecao = {
  id: string;
  label: string;
  fornecedor: string | null;
  rubrica: string | null;
  natureza: NaturezaDesembolso;
  origemLinha: "conta_azul" | "projetado" | "manual";
  celulas: CelulaProjecao[];
  /** Soma só das células ativas. */
  totalAtivo: number;
};

export type ColunaProjecao = {
  mesYm: string;
  label: string;
  /** Coluna criada pelo usuário (além do padrão mês ant. + 3 meses). */
  custom: boolean;
};

export type OverrideCelulaProjecao = {
  linhaId: string;
  mesYm: string;
  valorOverride?: number | null;
  ativo?: boolean | null;
};

export type LinhaManualProjecao = {
  id: number;
  descricao: string;
  fornecedor?: string | null;
  rubrica?: string | null;
  natureza?: NaturezaDesembolso | null;
};

export type ParcelaBaseProjecao = {
  id: string;
  descricao: string;
  fornecedor: string | null;
  rubrica: string | null;
  valor: number;
  valorPago: number;
  valorEmAberto: number;
  status: string;
  dataVencimento: string | null;
  dataPagamento: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function mesYmFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function labelMesYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
}

export function addMonthsYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return mesYmFromDate(d);
}

/**
 * Horizonte padrão: mês anterior + 3 meses (referência inclusive).
 * Ex.: ref 2026-09 → ago, set, out, nov.
 */
export function mesesProjecaoPadrao(mesRefYm: string): string[] {
  return [-1, 0, 1, 2].map(d => addMonthsYm(mesRefYm, d));
}

function textoNatureza(
  descricao: string,
  rubrica?: string | null,
  fornecedor?: string | null,
): string {
  return [descricao, rubrica, fornecedor]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * "Parcela" = parcelamento de cartão/boleto/financiamento.
 * Números tipo 14/17 em folha ou aluguel NÃO contam como parcela de cartão.
 */
export function detectarNaturezaDesembolso(
  descricao: string,
  ocorrenciasMeses: number,
  extra?: { rubrica?: string | null; fornecedor?: string | null },
): NaturezaDesembolso {
  const d = textoNatureza(descricao, extra?.rubrica, extra?.fornecedor);

  if (
    /\b(folha(\s+de\s+pagamento)?|salario|pro[\s-]?labore|holerite|fgts|inss|adiantamento\s+salarial)\b/.test(
      d,
    )
  ) {
    return ocorrenciasMeses >= 2 ? "recorrente" : "unico";
  }

  const sinalCartaoBoleto =
    /\b(cartao|credito|visa|master|mastercard|elo|amex|hipercard)\b/.test(d) ||
    /\bparcelado\b/.test(d) ||
    /\bfinanciamento\b/.test(d) ||
    (/\bboleto\b/.test(d) &&
      /\b(parcela|parcelas|parcelado|parcelamento)\b/.test(d)) ||
    (/\bparcela\b/.test(d) &&
      /\b(cartao|credito|boleto|financi)\b/.test(d));

  const temFracao = /\(\s*\d+\s*\/\s*\d+\s*\)/.test(d) || /\b\d+\s*\/\s*\d+\b/.test(d);

  if (sinalCartaoBoleto || (temFracao && /\b(cartao|credito|boleto|parcelado|financi)\b/.test(d))) {
    return "parcela";
  }

  if (ocorrenciasMeses >= 2) return "recorrente";
  return "unico";
}

function chaveSerie(p: ParcelaBaseProjecao): string {
  const forn = (p.fornecedor || "").trim().toLowerCase();
  const rub = (p.rubrica || "").trim().toLowerCase();
  const desc = p.descricao
    .replace(/\(\s*\d+\s*\/\s*\d+\s*\)/g, "")
    .replace(/\b\d+\s*\/\s*\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `${forn}|${rub}|${desc.slice(0, 80)}`;
}

function statusExecutado(p: ParcelaBaseProjecao): boolean {
  const st = (p.status || "").toUpperCase();
  if (
    st.includes("RECEBIDO") ||
    st.includes("QUITADO") ||
    st.includes("PAGO")
  ) {
    return p.valorEmAberto <= 0.009 || p.valorPago > 0;
  }
  return p.valorEmAberto <= 0.009 && p.valorPago > 0;
}

function mesDaParcela(p: ParcelaBaseProjecao): string | null {
  const ref = p.dataVencimento || p.dataPagamento || p.dataVencimento;
  if (!ref || !/^\d{4}-\d{2}/.test(ref)) return null;
  return ref.slice(0, 7);
}

function overrideKey(linhaId: string, mesYm: string): string {
  return `${linhaId}||${mesYm}`;
}

function hashSerie(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return `proj:${Math.abs(h).toString(36)}`;
}

export function montarColunasProjecao(
  mesRefYm: string,
  colunasExtraYm: string[] = [],
): ColunaProjecao[] {
  const padrao = new Set(mesesProjecaoPadrao(mesRefYm));
  const all = [...padrao, ...colunasExtraYm.filter(Boolean)];
  const uniq = Array.from(new Set(all)).sort();
  return uniq.map(mesYm => ({
    mesYm,
    label: labelMesYm(mesYm),
    custom: !padrao.has(mesYm),
  }));
}

function aplicarOverride(
  base: CelulaProjecao,
  ov: OverrideCelulaProjecao | undefined,
): CelulaProjecao {
  if (!base.editavel || !ov) return base;
  const valorEfetivo =
    ov.valorOverride != null && Number.isFinite(ov.valorOverride)
      ? round2(ov.valorOverride)
      : base.valorBase;
  const ativo = ov.ativo == null ? base.ativo : !!ov.ativo;
  return {
    ...base,
    valorEfetivo,
    ativo,
  };
}

/**
 * Monta a grade: parcelas CA no horizonte + séries recorrentes projetadas + linhas manuais.
 */
export function montarProjecaoDesembolso(input: {
  mesInicioYm: string;
  colunasExtraYm?: string[];
  parcelas: ParcelaBaseProjecao[];
  /** Parcelas dos meses anteriores (histórico) para detectar recorrência. */
  historico?: ParcelaBaseProjecao[];
  linhasManuais?: LinhaManualProjecao[];
  overrides?: OverrideCelulaProjecao[];
}): {
  colunas: ColunaProjecao[];
  linhas: LinhaProjecao[];
  totaisPorMes: Array<{ mesYm: string; total: number }>;
  totalGeral: number;
} {
  const colunas = montarColunasProjecao(
    input.mesInicioYm,
    input.colunasExtraYm ?? [],
  );
  const mesesSet = new Set(colunas.map(c => c.mesYm));
  const ovMap = new Map(
    (input.overrides ?? []).map(o => [overrideKey(o.linhaId, o.mesYm), o]),
  );

  const historico = input.historico ?? [];
  const ocorrenciasPorSerie = new Map<string, Set<string>>();
  const valorMedioPorSerie = new Map<string, { soma: number; n: number }>();
  const metaSerie = new Map<
    string,
    { label: string; fornecedor: string | null; rubrica: string | null }
  >();

  for (const p of [...historico, ...input.parcelas]) {
    const mes = mesDaParcela(p);
    if (!mes) continue;
    const key = chaveSerie(p);
    if (!ocorrenciasPorSerie.has(key)) ocorrenciasPorSerie.set(key, new Set());
    ocorrenciasPorSerie.get(key)!.add(mes);
    const acc = valorMedioPorSerie.get(key) ?? { soma: 0, n: 0 };
    acc.soma += p.valor > 0 ? p.valor : p.valorPago;
    acc.n += 1;
    valorMedioPorSerie.set(key, acc);
    if (!metaSerie.has(key)) {
      metaSerie.set(key, {
        label: p.descricao,
        fornecedor: p.fornecedor,
        rubrica: p.rubrica,
      });
    }
  }

  const linhas: LinhaProjecao[] = [];
  const seriesJaNaGrade = new Set<string>();

  // 1) Uma linha por parcela CA cujo vencimento cai nas colunas
  for (const p of input.parcelas) {
    const mes = mesDaParcela(p);
    if (!mes || !mesesSet.has(mes)) continue;
    const key = chaveSerie(p);
    const nMeses = ocorrenciasPorSerie.get(key)?.size ?? 1;
    const natureza = detectarNaturezaDesembolso(p.descricao, nMeses, {
      rubrica: p.rubrica,
      fornecedor: p.fornecedor,
    });
    const linhaId = `ca:${p.id}`;
    seriesJaNaGrade.add(key);

    const celulas: CelulaProjecao[] = colunas.map(col => {
      if (col.mesYm !== mes) {
        return {
          mesYm: col.mesYm,
          valorBase: 0,
          valorEfetivo: 0,
          ativo: false,
          editavel: true,
          origem: "projetado" as const,
          parcelaId: null,
        };
      }
      const executado = statusExecutado(p);
      const valorBase = round2(
        executado
          ? p.valorPago > 0
            ? p.valorPago
            : p.valor
          : p.valorEmAberto > 0
            ? p.valorEmAberto
            : p.valor,
      );
      const base: CelulaProjecao = {
        mesYm: col.mesYm,
        valorBase,
        valorEfetivo: valorBase,
        ativo: true,
        editavel: !executado,
        origem: executado ? "executado" : "previsto_ca",
        parcelaId: p.id,
      };
      return aplicarOverride(base, ovMap.get(overrideKey(linhaId, col.mesYm)));
    });

    linhas.push({
      id: linhaId,
      label: p.descricao,
      fornecedor: p.fornecedor,
      rubrica: p.rubrica,
      natureza,
      origemLinha: "conta_azul",
      celulas,
      totalAtivo: round2(
        celulas.filter(c => c.ativo).reduce((s, c) => s + c.valorEfetivo, 0),
      ),
    });
  }

  // 2) Projetar séries recorrentes/parcelas sem título futuro no horizonte
  for (const [key, meses] of Array.from(ocorrenciasPorSerie.entries())) {
    if (seriesJaNaGrade.has(key)) continue;
    if (meses.size < 2) continue;
    const meta = metaSerie.get(key);
    if (!meta) continue;
    const media = valorMedioPorSerie.get(key);
    const valorProj = media && media.n > 0 ? round2(media.soma / media.n) : 0;
    if (valorProj <= 0) continue;

    const natureza = detectarNaturezaDesembolso(meta.label, meses.size, {
      rubrica: meta.rubrica,
      fornecedor: meta.fornecedor,
    });
    if (natureza === "unico") continue;

    const linhaId = hashSerie(key);
    const celulas: CelulaProjecao[] = colunas.map(col => {
      const base: CelulaProjecao = {
        mesYm: col.mesYm,
        valorBase: valorProj,
        valorEfetivo: valorProj,
        ativo: true,
        editavel: true,
        origem: "projetado",
        parcelaId: null,
      };
      return aplicarOverride(base, ovMap.get(overrideKey(linhaId, col.mesYm)));
    });

    linhas.push({
      id: linhaId,
      label: meta.label,
      fornecedor: meta.fornecedor,
      rubrica: meta.rubrica,
      natureza,
      origemLinha: "projetado",
      celulas,
      totalAtivo: round2(
        celulas.filter(c => c.ativo).reduce((s, c) => s + c.valorEfetivo, 0),
      ),
    });
  }

  // 3) Linhas manuais
  for (const m of input.linhasManuais ?? []) {
    const linhaId = `manual:${m.id}`;
    const celulas: CelulaProjecao[] = colunas.map(col => {
      const base: CelulaProjecao = {
        mesYm: col.mesYm,
        valorBase: 0,
        valorEfetivo: 0,
        ativo: true,
        editavel: true,
        origem: "manual",
        parcelaId: null,
      };
      return aplicarOverride(base, ovMap.get(overrideKey(linhaId, col.mesYm)));
    });
    linhas.push({
      id: linhaId,
      label: m.descricao,
      fornecedor: m.fornecedor ?? null,
      rubrica: m.rubrica ?? null,
      natureza: m.natureza ?? "manual",
      origemLinha: "manual",
      celulas,
      totalAtivo: round2(
        celulas.filter(c => c.ativo).reduce((s, c) => s + c.valorEfetivo, 0),
      ),
    });
  }

  linhas.sort((a, b) => b.totalAtivo - a.totalAtivo);

  const totaisPorMes = colunas.map(col => ({
    mesYm: col.mesYm,
    total: round2(
      linhas.reduce((s, lin) => {
        const c = lin.celulas.find(x => x.mesYm === col.mesYm);
        if (!c || !c.ativo) return s;
        return s + c.valorEfetivo;
      }, 0),
    ),
  }));

  return {
    colunas,
    linhas,
    totaisPorMes,
    totalGeral: round2(totaisPorMes.reduce((s, t) => s + t.total, 0)),
  };
}
