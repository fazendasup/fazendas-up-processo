/**
 * Projeção de desembolso — base = o que foi PAGO no mês anterior.
 * Sem títulos abertos do Conta Azul. Essenciais (energia, aluguel…) já entram
 * como projetado recorrente; demais ficam sugeridos para o usuário ativar.
 */

export type NaturezaDesembolso = "parcela" | "recorrente" | "unico" | "manual";

export type OrigemCelulaProjecao =
  | "executado"
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
  /** Soma das células ativas nos meses que entram no total (sem mês anterior). */
  totalAtivo: number;
};

/** Sugere valor ao ativar célula vazia: base da célula → outras células da linha. */
export function sugerirValorAoAtivarProjecao(
  celula: Pick<CelulaProjecao, "mesYm" | "valorBase" | "valorEfetivo">,
  celulasLinha: Array<
    Pick<CelulaProjecao, "mesYm" | "valorBase" | "valorEfetivo">
  >,
): number {
  if (celula.valorEfetivo > 0) return round2(celula.valorEfetivo);
  if (celula.valorBase > 0) return round2(celula.valorBase);
  const outros = celulasLinha
    .filter(c => c.mesYm !== celula.mesYm)
    .map(c => (c.valorEfetivo > 0 ? c.valorEfetivo : c.valorBase))
    .filter(v => v > 0);
  if (outros.length === 0) return 0;
  const soma = outros.reduce((s, v) => s + v, 0);
  return round2(soma / outros.length);
}

export type ColunaProjecao = {
  mesYm: string;
  label: string;
  /** Coluna criada pelo usuário (além do padrão mês ant. + 3 meses). */
  custom: boolean;
  /** Entra no total da projeção (false = mês anterior, só contexto). */
  contaNoTotal: boolean;
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

/** Meses que entram no total: os 3 à frente (ref + 2), sem o mês anterior. */
export function mesesProjecaoNoTotal(mesRefYm: string): string[] {
  return [0, 1, 2].map(d => addMonthsYm(mesRefYm, d));
}

export function mesAnteriorProjecao(mesRefYm: string): string {
  return addMonthsYm(mesRefYm, -1);
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
 * Despesas essenciais que tendem a se repetir todo mês → já projetar ativas.
 * Inclui utilidades, folha/salário, terceiro fixo, combustível e insumos
 * de legumes/folhosas/flores.
 */
export function ehDespesaEssencialRecorrente(
  descricao: string,
  rubrica?: string | null,
  fornecedor?: string | null,
): boolean {
  const d = textoNatureza(descricao, rubrica, fornecedor);

  const utilidadesFolha =
    /\b(aluguel|locacao|energia|eletrica|eletricidade|luz|agua|esgoto|gas|internet|banda[\s-]?larga|telefone|celular|telecom|condominio|iptu|seguro|folha(\s+de\s+pagamento)?|salario|remuneracao|holerite|pro[\s-]?labore|adiantamento\s+salarial|plano\s+(de\s+)?saude|vale[\s-]*(transporte|refeicao|alimentacao)|contabil(idade)?|software|assinatura|saas|hospedagem|dominio|limpeza|conservacao|seguranca|vigilancia|manutencao(\s+predial)?|contador|escritorio\s+contabil)\b/.test(
      d,
    );

  const terceiroFixo =
    /\bterceir(o|a|izados?)(\s+fixo)?\b/.test(d) ||
    /\b(prestador|fornecedor|servico)\s+fixo\b/.test(d) ||
    /\bfixo\s+(mensal|terceir)/.test(d) ||
    /\b(pj|mei)\s+fix[oa]\b/.test(d);

  const combustivel =
    /\b(combustivel|combustiveis|diesel|gasolina|etanol|alcool\s+combustivel|abastecimento|posto\s+de\s+combustivel)\b/.test(
      d,
    );

  const insumosHorta =
    /\b(legume|legumes|folhosa|folhosas|hortifruti|horti[\s-]?fruti|hortalica|hortalicas|verdura|verduras|alface|rucula|microverde|microverdes|flor(es)?(\s+comestiveis?)?|mudas?|sementes?|insumo\s+agricola|materia[\s-]?prima\s+(agricola|horta))\b/.test(
      d,
    );

  return utilidadesFolha || terceiroFixo || combustivel || insumosHorta;
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
    ehDespesaEssencialRecorrente(descricao, extra?.rubrica, extra?.fornecedor)
  ) {
    return "recorrente";
  }

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

  const temFracao =
    /\(\s*\d+\s*\/\s*\d+\s*\)/.test(d) || /\b\d+\s*\/\s*\d+\b/.test(d);

  if (
    sinalCartaoBoleto ||
    (temFracao && /\b(cartao|credito|boleto|parcelado|financi)\b/.test(d))
  ) {
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

export function statusExecutado(p: ParcelaBaseProjecao): boolean {
  const st = (p.status || "").toUpperCase();
  if (
    st.includes("RECEBIDO") ||
    st.includes("QUITADO") ||
    st.includes("PAGO") ||
    st.includes("BAIXAD") ||
    st.includes("LIQUID") ||
    st.includes("ACQUIT")
  ) {
    return p.valorEmAberto <= 0.009 || p.valorPago > 0;
  }
  if (p.dataPagamento && p.valorEmAberto <= 0.009) return true;
  return p.valorEmAberto <= 0.009 && p.valorPago > 0;
}

/** Mês em que o dinheiro saiu (pagamento). */
export function mesPagamentoParcela(p: ParcelaBaseProjecao): string | null {
  const ref = p.dataPagamento || (statusExecutado(p) ? p.dataVencimento : null);
  if (!ref || !/^\d{4}-\d{2}/.test(ref)) return null;
  return ref.slice(0, 7);
}

function valorPagoParcela(p: ParcelaBaseProjecao): number {
  if (p.valorPago > 0) return round2(p.valorPago);
  if (statusExecutado(p) && p.valor > 0) return round2(p.valor);
  return 0;
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
  const mesAnt = mesAnteriorProjecao(mesRefYm);
  const all = [...padrao, ...colunasExtraYm.filter(Boolean)];
  const uniq = Array.from(new Set(all)).sort();
  return uniq.map(mesYm => ({
    mesYm,
    label: labelMesYm(mesYm),
    custom: !padrao.has(mesYm),
    contaNoTotal: mesYm !== mesAnt,
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

type SeriePago = {
  key: string;
  label: string;
  fornecedor: string | null;
  rubrica: string | null;
  valorPago: number;
  parcelaIds: string[];
  natureza: NaturezaDesembolso;
  essencial: boolean;
};

/**
 * Monta a grade a partir do que foi PAGO no mês anterior.
 * - Coluna contexto (mês ant.): só executado, travada.
 * - 3 meses à frente: projeção; essenciais já ativos; demais sugeridos inativos.
 * - Não inclui previsão/títulos abertos do Conta Azul.
 */
export function montarProjecaoDesembolso(input: {
  mesInicioYm: string;
  colunasExtraYm?: string[];
  parcelas: ParcelaBaseProjecao[];
  /** Histórico opcional (reforça natureza recorrente). */
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
  const mesesNoTotal = new Set(
    colunas.filter(c => c.contaNoTotal).map(c => c.mesYm),
  );
  const mesContextoYm = mesAnteriorProjecao(input.mesInicioYm);
  const somaAtivaNoTotal = (celulas: CelulaProjecao[]) =>
    round2(
      celulas
        .filter(c => c.ativo && mesesNoTotal.has(c.mesYm))
        .reduce((s, c) => s + c.valorEfetivo, 0),
    );
  const ovMap = new Map(
    (input.overrides ?? []).map(o => [overrideKey(o.linhaId, o.mesYm), o]),
  );

  const historico = input.historico ?? [];
  const ocorrenciasPorSerie = new Map<string, Set<string>>();
  for (const p of [...historico, ...input.parcelas]) {
    if (!statusExecutado(p)) continue;
    const mes = mesPagamentoParcela(p);
    if (!mes) continue;
    const key = chaveSerie(p);
    if (!ocorrenciasPorSerie.has(key)) ocorrenciasPorSerie.set(key, new Set());
    ocorrenciasPorSerie.get(key)!.add(mes);
  }

  const pagosContexto = input.parcelas.filter(p => {
    if (!statusExecutado(p)) return false;
    return mesPagamentoParcela(p) === mesContextoYm;
  });

  const seriesMap = new Map<string, SeriePago>();
  for (const p of pagosContexto) {
    const key = chaveSerie(p);
    const pago = valorPagoParcela(p);
    if (pago <= 0) continue;
    const cur = seriesMap.get(key);
    if (cur) {
      cur.valorPago = round2(cur.valorPago + pago);
      cur.parcelaIds.push(p.id);
      continue;
    }
    const nMeses = ocorrenciasPorSerie.get(key)?.size ?? 1;
    const essencial = ehDespesaEssencialRecorrente(
      p.descricao,
      p.rubrica,
      p.fornecedor,
    );
    const natureza = detectarNaturezaDesembolso(p.descricao, nMeses, {
      rubrica: p.rubrica,
      fornecedor: p.fornecedor,
    });
    seriesMap.set(key, {
      key,
      label: p.descricao,
      fornecedor: p.fornecedor,
      rubrica: p.rubrica,
      valorPago: pago,
      parcelaIds: [p.id],
      natureza: essencial ? "recorrente" : natureza,
      essencial,
    });
  }

  const linhas: LinhaProjecao[] = [];

  for (const serie of Array.from(seriesMap.values())) {
    const linhaId = hashSerie(serie.key);
    const valor = serie.valorPago;
    const autoAtivar = serie.essencial || serie.natureza === "recorrente";

    const celulas: CelulaProjecao[] = colunas.map(col => {
      if (col.mesYm === mesContextoYm) {
        return {
          mesYm: col.mesYm,
          valorBase: valor,
          valorEfetivo: valor,
          ativo: true,
          editavel: false,
          origem: "executado" as const,
          parcelaId: serie.parcelaIds[0] ?? null,
        };
      }
      const base: CelulaProjecao = {
        mesYm: col.mesYm,
        valorBase: valor,
        valorEfetivo: valor,
        ativo: autoAtivar,
        editavel: true,
        origem: "projetado",
        parcelaId: null,
      };
      return aplicarOverride(base, ovMap.get(overrideKey(linhaId, col.mesYm)));
    });

    linhas.push({
      id: linhaId,
      label: serie.label,
      fornecedor: serie.fornecedor,
      rubrica: serie.rubrica,
      natureza: serie.natureza,
      origemLinha: "projetado",
      celulas,
      totalAtivo: somaAtivaNoTotal(celulas),
    });
  }

  for (const m of input.linhasManuais ?? []) {
    const linhaId = `manual:${m.id}`;
    const celulas: CelulaProjecao[] = colunas.map(col => {
      const noContexto = col.mesYm === mesContextoYm;
      const base: CelulaProjecao = {
        mesYm: col.mesYm,
        valorBase: 0,
        valorEfetivo: 0,
        ativo: !noContexto,
        editavel: !noContexto,
        origem: noContexto ? "executado" : "manual",
        parcelaId: null,
      };
      if (noContexto) return base;
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
      totalAtivo: somaAtivaNoTotal(celulas),
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
    totalGeral: round2(
      totaisPorMes
        .filter(t => mesesNoTotal.has(t.mesYm))
        .reduce((s, t) => s + t.total, 0),
    ),
  };
}
