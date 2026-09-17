/**
 * Financeiro Conta Azul — visão ERP / CFO.
 *
 * Fonte da verdade: categorias, centros de custo e rateio da API.
 * Heurística de “setor/criticidade” NÃO entra em decisão de corte.
 */

export const RUBRICA_SEM_CATEGORIA = "Sem rúbrica no Conta Azul";
export const CENTRO_CUSTO_SEM = "Sem centro de custo";
export const DRE_SEM_MAPEAMENTO = "Sem entrada DRE mapeada";

export type FonteClassificacao =
  | "rateio_api"
  | "listagem_categoria"
  | "sem_classificacao"
  | "override_manual"
  | "ajuste_manual";

export type ConfiancaClassificacao = "alta" | "media" | "baixa";

export type RateioCentro = {
  id: string | null;
  nome: string | null;
  valor: number;
};

export type RateioLinha = {
  categoriaId: string | null;
  categoriaNome: string | null;
  valor: number;
  centros: RateioCentro[];
};

export type ParcelaFinanceiraNorm = {
  id: string;
  tipo: "receber" | "pagar";
  descricao: string;
  valor: number;
  valorPago: number;
  valorEmAberto: number;
  status: string;
  dataVencimento: string | null;
  dataPagamento: string | null;
  dataCompetencia: string | null;
  /** Rúbrica efetiva (CA ou override). */
  categoria: string | null;
  categorias: string[];
  centrosCusto: string[];
  centroCusto: string | null;
  /** Snapshot Conta Azul antes de override. */
  categoriaOriginal: string | null;
  centroCustoOriginal: string | null;
  contraparte: string | null;
  rateio: RateioLinha[];
  fonteClassificacao: FonteClassificacao;
  confiancaClassificacao: ConfiancaClassificacao;
  entradaDre: string | null;
  editadoManual: boolean;
  excluido: boolean;
  notaClassificacao: string | null;
  origem: "conta_azul" | "ajuste_manual";
  ajusteManualId?: number | null;
};

export type ClassificacaoOverride = {
  tipo: "parcela" | "fornecedor";
  chave: string;
  rubricaOverride?: string | null;
  centroCustoOverride?: string | null;
  excluido?: boolean;
  nota?: string | null;
};

export type AjusteManualInput = {
  id: number;
  tipo: "pagar" | "receber";
  descricao: string;
  contraparte?: string | null;
  rubrica: string;
  centroCusto?: string | null;
  valor: number;
  dataCompetencia?: string | null;
  dataVencimento?: string | null;
  nota?: string | null;
};

export type DimensaoFinanceiraAgg = {
  chave: string;
  label: string;
  pago: number;
  emAberto: number;
  total: number;
  qtd: number;
  pctDoDesembolso: number;
  semAlocacao: boolean;
  /** Quanto do total veio de rateio API (confiança alta). */
  valorComRateio: number;
  valorSemRateio: number;
  entradaDre?: string | null;
};

export type MatrizRubricaCentro = {
  rubrica: string;
  centroCusto: string;
  total: number;
  qtd: number;
  pctDoDesembolso: number;
};

export type GrupoDreAgg = {
  entradaDre: string;
  label: string;
  total: number;
  pago: number;
  emAberto: number;
  qtd: number;
  pctDoDesembolso: number;
  rubricas: DimensaoFinanceiraAgg[];
};

export type FornecedorAgg = {
  nome: string;
  rubricas: string[];
  total: number;
  pago: number;
  emAberto: number;
  qtd: number;
  pctDoDesembolso: number;
};

/** Normaliza nome para comparar equipe Conta Azul ↔ cadastro MO. */
export function normalizarNomeContraparte(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MARCADOR_EMPRESA_RE =
  /\b(ltda|me|mei|eireli|s ?a|ss|indust\w*|comerc\w*|servic\w*|transport\w*|distribuid\w*|atacado|empreendiment\w*|associac\w*|cooperativ\w*|fazenda|agro\w*|holding|tecnolog\w*|soluc\w*|solution\w*)\b/i;

const FOLHA_TEXTO_RE =
  /\b(salario|folha(\s+de\s+pagamento)?|pro[\s-]?labore|ferias|13[\soº°]|decimo(\s+terceiro)?|fgts|inss|vale[\s-]*(transporte|refeicao|alimentacao)|rescisao|holerite|encargos(\s+sociais)?|adiantamento(\s+(salarial|quinzenal))?|beneficio|beneficios|colaborador|funcionario|pessoal)\b/i;

export function pareceNomeEmpresa(nome: string): boolean {
  return MARCADOR_EMPRESA_RE.test(normalizarNomeContraparte(nome));
}

/** Nome típico de pessoa física (sem marcador de empresa). */
export function pareceNomePessoaFisica(nome: string): boolean {
  const t = nome.trim();
  if (!t || /^sem fornecedor$/i.test(t)) return false;
  if (pareceNomeEmpresa(t)) return false;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  if (!/^[\p{L}\s.'’-]+$/u.test(t)) return false;
  return true;
}

export function textoSugereFolhaOuPessoal(
  ...partes: Array<string | null | undefined>
): boolean {
  const blob = normalizarNomeContraparte(partes.filter(Boolean).join(" "));
  return blob.length > 0 && FOLHA_TEXTO_RE.test(blob);
}

/**
 * Pagamentos a funcionários / pró-labore / folha — não entram em “top fornecedores”.
 * Conta Azul cadastra colaborador como fornecedor (PF); filtramos por equipe MO,
 * palavras de folha e nomes tipicamente pessoais.
 */
export function ehPagamentoPessoalOuEquipe(
  p: ParcelaFinanceiraNorm,
  nomesEquipeNorm: Iterable<string> = [],
): boolean {
  const equipe = new Set(
    Array.from(nomesEquipeNorm)
      .map(normalizarNomeContraparte)
      .filter(n => n.length >= 3),
  );
  const contraparte = (p.contraparte || "").trim();
  if (contraparte) {
    const n = normalizarNomeContraparte(contraparte);
    if (equipe.has(n)) return true;
    for (const eq of Array.from(equipe)) {
      if (eq.length < 8) continue;
      if (n.includes(eq) || eq.includes(n)) return true;
    }
  }
  if (
    textoSugereFolhaOuPessoal(
      p.descricao,
      p.categoria,
      ...(p.categorias ?? []),
      p.entradaDre,
    )
  ) {
    return true;
  }
  if (contraparte && pareceNomePessoaFisica(contraparte)) return true;
  return false;
}

export type AgingBucket = {
  chave: string;
  label: string;
  valor: number;
  qtd: number;
};

export type QualidadeAlocacao = {
  totalTitulosPagar: number;
  comRateioApi: number;
  semRubrica: number;
  semCentroCusto: number;
  valorTotal: number;
  valorComRateioApi: number;
  valorSemRubrica: number;
  valorSemCentroCusto: number;
  pctTitulosComRateioApi: number;
  pctTitulosSemRubrica: number;
  pctTitulosSemCentroCusto: number;
  pctValorComRateioApi: number;
  pctValorSemRubrica: number;
  pctValorSemCentroCusto: number;
  /** true se a base ainda não serve para decisão de CFO. */
  baseConfiavelParaDecisao: boolean;
  motivoBloqueioDecisao: string | null;
};

export type ResumoCaixaCfo = {
  entradasPrevistas: number;
  entradasRealizadas: number;
  saidasPrevistas: number;
  saidasRealizadas: number;
  aReceberEmAberto: number;
  aPagarEmAberto: number;
  saldoPeriodoRealizado: number;
  gapCaixaPrevisto: number;
  coberturaReceberSobrePagar: number | null;
};

/** Gap de desembolso por rúbrica (mês atual × período comparável). */
export type GapRubricaCusto = {
  rubrica: string;
  atual: number;
  anterior: number;
  delta: number;
  deltaPct: number | null;
  qtdAtual: number;
  qtdAnterior: number;
};

/** KPIs para analista de redução de custo. */
export type KpisReducaoCusto = {
  gastoTotal: number;
  gastoAnterior: number | null;
  deltaGasto: number | null;
  deltaGastoPct: number | null;
  aPagarEmAberto: number;
  titulosPagar: number;
  valorSemRubrica: number;
  pctSemRubrica: number;
  concentracaoTop3Pct: number;
  maiorAumento: GapRubricaCusto | null;
  maiorQueda: GapRubricaCusto | null;
};

export type ComparativoCustoMes = {
  periodoAnterior: { inicio: string; fim: string };
  gastoAnterior: number;
  rubricasAnterior: DimensaoFinanceiraAgg[];
  gaps: GapRubricaCusto[];
  /** Gaps ordenados por |delta| desc — foco operacional. */
  gapsPorImpacto: GapRubricaCusto[];
};

export type SemanaFluxo = {
  inicioSemana: string;
  entradasPrevistas: number;
  saidasPrevistas: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
  saldoLiquidoPrevisto: number;
  saldoLiquidoRealizado: number;
};

export type DiaFluxo = {
  data: string;
  entradasPrevistas: number;
  saidasPrevistas: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
  saldoLiquidoPrevisto: number;
  saldoLiquidoRealizado: number;
  /** Saldo realizado acumulado no período (ordenado por data). */
  saldoAcumuladoRealizado: number;
};

export type InsightCfo = {
  id: string;
  severidade: "critica" | "alta" | "media" | "oportunidade";
  tipo: "caixa" | "descasamento" | "alocacao" | "integridade";
  titulo: string;
  analise: string;
  acaoSimples: string;
  acaoComplexa?: string;
  impactoEstimado?: number | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function valorTitulo(p: ParcelaFinanceiraNorm): number {
  return p.valor > 0 ? p.valor : p.valorPago;
}

function semanaKey(ymd: string | null): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function labelEntradaDre(codigo: string | null | undefined): string {
  if (!codigo?.trim()) return DRE_SEM_MAPEAMENTO;
  const map: Record<string, string> = {
    RECEITA_OPERACIONAL_BRUTA: "Receita operacional bruta",
    DEDUCOES_RECEITA: "Deduções da receita",
    CUSTO_SERVICOS_PRESTADOS: "Custo dos serviços / produtos",
    DESPESAS_OPERACIONAIS: "Despesas operacionais",
    DESPESAS_ADMINISTRATIVAS: "Despesas administrativas",
    DESPESAS_COMERCIAIS: "Despesas comerciais",
    DESPESAS_TRIBUTARIAS: "Despesas tributárias",
    DESPESAS_FINANCEIRAS: "Despesas financeiras",
    OUTRAS_RECEITAS: "Outras receitas",
    OUTRAS_DESPESAS: "Outras despesas",
  };
  return map[codigo] ?? codigo.replace(/_/g, " ").toLowerCase();
}

/**
 * Expande uma parcela em linhas de alocação com valor.
 * Prioridade: rateio API → categoria da listagem (valor integral) → sem rúbrica.
 */
export function linhasAlocacaoRubrica(
  p: ParcelaFinanceiraNorm,
): Array<{ rubrica: string; centro: string; valor: number; comRateio: boolean }> {
  const vTotal = valorTitulo(p);
  const out: Array<{
    rubrica: string;
    centro: string;
    valor: number;
    comRateio: boolean;
  }> = [];

  if (p.rateio.length > 0) {
    for (const r of p.rateio) {
      const rubrica = r.categoriaNome?.trim() || RUBRICA_SEM_CATEGORIA;
      const valorLinha = r.valor > 0 ? r.valor : 0;
      if (r.centros.length > 0) {
        for (const c of r.centros) {
          out.push({
            rubrica,
            centro: c.nome?.trim() || CENTRO_CUSTO_SEM,
            valor: c.valor > 0 ? c.valor : valorLinha,
            comRateio: true,
          });
        }
      } else {
        out.push({
          rubrica,
          centro: p.centroCusto?.trim() || CENTRO_CUSTO_SEM,
          valor: valorLinha > 0 ? valorLinha : vTotal,
          comRateio: true,
        });
      }
    }
    const soma = out.reduce((s, x) => s + x.valor, 0);
    if (soma <= 0 && vTotal > 0) {
      out.push({
        rubrica: p.categoria?.trim() || RUBRICA_SEM_CATEGORIA,
        centro: p.centroCusto?.trim() || CENTRO_CUSTO_SEM,
        valor: vTotal,
        comRateio: true,
      });
    }
    return out;
  }

  out.push({
    rubrica: p.categoria?.trim() || RUBRICA_SEM_CATEGORIA,
    centro: p.centroCusto?.trim() || CENTRO_CUSTO_SEM,
    valor: vTotal,
    comRateio: false,
  });
  return out;
}

export function montarFluxoPorSemana(
  parcelas: ParcelaFinanceiraNorm[],
): SemanaFluxo[] {
  const map = new Map<string, SemanaFluxo>();
  const ensure = (key: string): SemanaFluxo => {
    let row = map.get(key);
    if (!row) {
      row = {
        inicioSemana: key,
        entradasPrevistas: 0,
        saidasPrevistas: 0,
        entradasRealizadas: 0,
        saidasRealizadas: 0,
        saldoLiquidoPrevisto: 0,
        saldoLiquidoRealizado: 0,
      };
      map.set(key, row);
    }
    return row;
  };

  for (const p of parcelas) {
    const kVenc = semanaKey(p.dataVencimento);
    const kPag = semanaKey(p.dataPagamento);
    if (p.tipo === "receber") {
      if (kVenc) ensure(kVenc).entradasPrevistas += p.valor;
      if (kPag) ensure(kPag).entradasRealizadas += p.valorPago;
    } else {
      if (kVenc) ensure(kVenc).saidasPrevistas += p.valor;
      if (kPag) ensure(kPag).saidasRealizadas += p.valorPago;
    }
  }

  return Array.from(map.values())
    .map(s => ({
      ...s,
      entradasPrevistas: round2(s.entradasPrevistas),
      saidasPrevistas: round2(s.saidasPrevistas),
      entradasRealizadas: round2(s.entradasRealizadas),
      saidasRealizadas: round2(s.saidasRealizadas),
      saldoLiquidoPrevisto: round2(s.entradasPrevistas - s.saidasPrevistas),
      saldoLiquidoRealizado: round2(s.entradasRealizadas - s.saidasRealizadas),
    }))
    .sort((a, b) => a.inicioSemana.localeCompare(b.inicioSemana));
}

function cadaDiaYmd(inicioYmd: string, fimYmd: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicioYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(fimYmd)) {
    return [];
  }
  const out: string[] = [];
  const cur = new Date(`${inicioYmd}T12:00:00`);
  const end = new Date(`${fimYmd}T12:00:00`);
  if (end.getTime() < cur.getTime()) return [];
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Fluxo diário contínuo no intervalo (dias sem movimento ficam zerados). */
export function montarFluxoPorDia(
  parcelas: ParcelaFinanceiraNorm[],
  inicioYmd: string,
  fimYmd: string,
): DiaFluxo[] {
  const dias = cadaDiaYmd(inicioYmd, fimYmd);
  const map = new Map<string, DiaFluxo>();
  for (const data of dias) {
    map.set(data, {
      data,
      entradasPrevistas: 0,
      saidasPrevistas: 0,
      entradasRealizadas: 0,
      saidasRealizadas: 0,
      saldoLiquidoPrevisto: 0,
      saldoLiquidoRealizado: 0,
      saldoAcumuladoRealizado: 0,
    });
  }

  const bump = (ymd: string | null, fn: (row: DiaFluxo) => void) => {
    if (!ymd || !map.has(ymd)) return;
    fn(map.get(ymd)!);
  };

  for (const p of parcelas) {
    if (p.tipo === "receber") {
      bump(p.dataVencimento, r => {
        r.entradasPrevistas += p.valor;
      });
      bump(p.dataPagamento, r => {
        r.entradasRealizadas += p.valorPago;
      });
    } else {
      bump(p.dataVencimento, r => {
        r.saidasPrevistas += p.valor;
      });
      bump(p.dataPagamento, r => {
        r.saidasRealizadas += p.valorPago;
      });
    }
  }

  let acum = 0;
  return dias.map(data => {
    const s = map.get(data)!;
    const entradasPrevistas = round2(s.entradasPrevistas);
    const saidasPrevistas = round2(s.saidasPrevistas);
    const entradasRealizadas = round2(s.entradasRealizadas);
    const saidasRealizadas = round2(s.saidasRealizadas);
    const saldoLiquidoRealizado = round2(entradasRealizadas - saidasRealizadas);
    acum = round2(acum + saldoLiquidoRealizado);
    return {
      data,
      entradasPrevistas,
      saidasPrevistas,
      entradasRealizadas,
      saidasRealizadas,
      saldoLiquidoPrevisto: round2(entradasPrevistas - saidasPrevistas),
      saldoLiquidoRealizado,
      saldoAcumuladoRealizado: acum,
    };
  });
}

export function agregarPorRubrica(pagar: ParcelaFinanceiraNorm[]): DimensaoFinanceiraAgg[] {
  const map = new Map<string, DimensaoFinanceiraAgg & { _dre?: string | null }>();
  let totalGeral = 0;

  for (const p of pagar) {
    const linhas = linhasAlocacaoRubrica(p);
    const fatorAberto =
      valorTitulo(p) > 0 ? p.valorEmAberto / valorTitulo(p) : 0;
    const fatorPago = valorTitulo(p) > 0 ? p.valorPago / valorTitulo(p) : 0;

    for (const lin of linhas) {
      totalGeral += lin.valor;
      const cur = map.get(lin.rubrica) ?? {
        chave: lin.rubrica,
        label: lin.rubrica,
        pago: 0,
        emAberto: 0,
        total: 0,
        qtd: 0,
        pctDoDesembolso: 0,
        semAlocacao: lin.rubrica === RUBRICA_SEM_CATEGORIA,
        valorComRateio: 0,
        valorSemRateio: 0,
        entradaDre: p.entradaDre,
        _dre: p.entradaDre,
      };
      cur.total += lin.valor;
      cur.pago += lin.valor * fatorPago;
      cur.emAberto += lin.valor * fatorAberto;
      cur.qtd += 1;
      if (lin.comRateio) cur.valorComRateio += lin.valor;
      else cur.valorSemRateio += lin.valor;
      if (!cur.entradaDre && p.entradaDre) cur.entradaDre = p.entradaDre;
      map.set(lin.rubrica, cur);
    }
  }

  return Array.from(map.values())
    .map(({ _dre: _ignored, ...s }) => ({
      ...s,
      pago: round2(s.pago),
      emAberto: round2(s.emAberto),
      total: round2(s.total),
      valorComRateio: round2(s.valorComRateio),
      valorSemRateio: round2(s.valorSemRateio),
      pctDoDesembolso: totalGeral > 0 ? round2((s.total / totalGeral) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Desloca o intervalo exatamente 1 mês (mesmo dia → dia), para MoM alinhado. */
export function periodoComparavelAnterior(
  inicio: Date,
  fim: Date,
): { inicio: Date; fim: Date } {
  const i = new Date(inicio);
  const f = new Date(fim);
  i.setMonth(i.getMonth() - 1);
  f.setMonth(f.getMonth() - 1);
  i.setHours(0, 0, 0, 0);
  f.setHours(23, 59, 59, 999);
  return { inicio: i, fim: f };
}

export function compararRubricasCusto(
  atual: DimensaoFinanceiraAgg[],
  anterior: DimensaoFinanceiraAgg[],
): GapRubricaCusto[] {
  const mapAnt = new Map(anterior.map(r => [r.chave, r]));
  const chaves = new Set([
    ...atual.map(r => r.chave),
    ...anterior.map(r => r.chave),
  ]);
  const gaps: GapRubricaCusto[] = [];
  for (const chave of Array.from(chaves)) {
    const a = atual.find(r => r.chave === chave);
    const b = mapAnt.get(chave);
    const atualV = a?.total ?? 0;
    const anteriorV = b?.total ?? 0;
    const delta = round2(atualV - anteriorV);
    gaps.push({
      rubrica: a?.label ?? b?.label ?? chave,
      atual: atualV,
      anterior: anteriorV,
      delta,
      deltaPct:
        anteriorV > 0
          ? round2((delta / anteriorV) * 100)
          : atualV > 0
            ? 100
            : null,
      qtdAtual: a?.qtd ?? 0,
      qtdAnterior: b?.qtd ?? 0,
    });
  }
  return gaps.sort((x, y) => y.delta - x.delta);
}

export function montarComparativoCustoMes(
  atual: DimensaoFinanceiraAgg[],
  anterior: DimensaoFinanceiraAgg[],
  periodoAnterior: { inicio: string; fim: string },
): ComparativoCustoMes {
  const gaps = compararRubricasCusto(atual, anterior);
  const gastoAnterior = round2(anterior.reduce((s, r) => s + r.total, 0));
  return {
    periodoAnterior,
    gastoAnterior,
    rubricasAnterior: anterior,
    gaps,
    gapsPorImpacto: [...gaps].sort(
      (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
    ),
  };
}

export function montarKpisReducaoCusto(input: {
  rubricas: DimensaoFinanceiraAgg[];
  qualidade: QualidadeAlocacao;
  aPagarEmAberto: number;
  titulosPagar: number;
  comparativo: ComparativoCustoMes | null;
}): KpisReducaoCusto {
  const gastoTotal = round2(input.rubricas.reduce((s, r) => s + r.total, 0));
  const top3 = input.rubricas.slice(0, 3).reduce((s, r) => s + r.total, 0);
  const gaps = input.comparativo?.gaps ?? [];
  const aumentos = gaps.filter(g => g.delta > 0);
  const quedas = gaps.filter(g => g.delta < 0);
  const gastoAnterior = input.comparativo?.gastoAnterior ?? null;
  const deltaGasto =
    gastoAnterior == null ? null : round2(gastoTotal - gastoAnterior);
  return {
    gastoTotal,
    gastoAnterior,
    deltaGasto,
    deltaGastoPct:
      gastoAnterior != null && gastoAnterior > 0 && deltaGasto != null
        ? round2((deltaGasto / gastoAnterior) * 100)
        : gastoAnterior === 0 && gastoTotal > 0
          ? 100
          : null,
    aPagarEmAberto: round2(input.aPagarEmAberto),
    titulosPagar: input.titulosPagar,
    valorSemRubrica: input.qualidade.valorSemRubrica,
    pctSemRubrica: input.qualidade.pctValorSemRubrica,
    concentracaoTop3Pct:
      gastoTotal > 0 ? round2((top3 / gastoTotal) * 100) : 0,
    maiorAumento: aumentos[0] ?? null,
    maiorQueda: quedas.length ? quedas[quedas.length - 1]! : null,
  };
}

export function agregarPorCentroCusto(
  pagar: ParcelaFinanceiraNorm[],
): DimensaoFinanceiraAgg[] {
  const map = new Map<string, DimensaoFinanceiraAgg>();
  let totalGeral = 0;

  for (const p of pagar) {
    const linhas = linhasAlocacaoRubrica(p);
    const fatorAberto =
      valorTitulo(p) > 0 ? p.valorEmAberto / valorTitulo(p) : 0;
    const fatorPago = valorTitulo(p) > 0 ? p.valorPago / valorTitulo(p) : 0;

    for (const lin of linhas) {
      totalGeral += lin.valor;
      const cur = map.get(lin.centro) ?? {
        chave: lin.centro,
        label: lin.centro,
        pago: 0,
        emAberto: 0,
        total: 0,
        qtd: 0,
        pctDoDesembolso: 0,
        semAlocacao: lin.centro === CENTRO_CUSTO_SEM,
        valorComRateio: 0,
        valorSemRateio: 0,
      };
      cur.total += lin.valor;
      cur.pago += lin.valor * fatorPago;
      cur.emAberto += lin.valor * fatorAberto;
      cur.qtd += 1;
      if (lin.comRateio) cur.valorComRateio += lin.valor;
      else cur.valorSemRateio += lin.valor;
      map.set(lin.centro, cur);
    }
  }

  return Array.from(map.values())
    .map(s => ({
      ...s,
      pago: round2(s.pago),
      emAberto: round2(s.emAberto),
      total: round2(s.total),
      valorComRateio: round2(s.valorComRateio),
      valorSemRateio: round2(s.valorSemRateio),
      pctDoDesembolso: totalGeral > 0 ? round2((s.total / totalGeral) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function agregarMatrizRubricaCentro(
  pagar: ParcelaFinanceiraNorm[],
): MatrizRubricaCentro[] {
  const map = new Map<string, MatrizRubricaCentro>();
  let totalGeral = 0;
  for (const p of pagar) {
    for (const lin of linhasAlocacaoRubrica(p)) {
      totalGeral += lin.valor;
      const key = `${lin.rubrica}||${lin.centro}`;
      const cur = map.get(key) ?? {
        rubrica: lin.rubrica,
        centroCusto: lin.centro,
        total: 0,
        qtd: 0,
        pctDoDesembolso: 0,
      };
      cur.total += lin.valor;
      cur.qtd += 1;
      map.set(key, cur);
    }
  }
  return Array.from(map.values())
    .map(r => ({
      ...r,
      total: round2(r.total),
      pctDoDesembolso: totalGeral > 0 ? round2((r.total / totalGeral) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function agregarPorGrupoDre(
  pagar: ParcelaFinanceiraNorm[],
  rubricas: DimensaoFinanceiraAgg[],
): GrupoDreAgg[] {
  const byDre = new Map<string, GrupoDreAgg>();
  let totalGeral = 0;

  for (const p of pagar) {
    const dre = p.entradaDre?.trim() || DRE_SEM_MAPEAMENTO;
    for (const lin of linhasAlocacaoRubrica(p)) {
      totalGeral += lin.valor;
      const cur = byDre.get(dre) ?? {
        entradaDre: dre,
        label: labelEntradaDre(dre === DRE_SEM_MAPEAMENTO ? null : dre),
        total: 0,
        pago: 0,
        emAberto: 0,
        qtd: 0,
        pctDoDesembolso: 0,
        rubricas: [],
      };
      cur.total += lin.valor;
      cur.qtd += 1;
      byDre.set(dre, cur);
    }
  }

  const rubricasPorDre = new Map<string, DimensaoFinanceiraAgg[]>();
  for (const r of rubricas) {
    const dre = r.entradaDre?.trim() || DRE_SEM_MAPEAMENTO;
    const list = rubricasPorDre.get(dre) ?? [];
    list.push(r);
    rubricasPorDre.set(dre, list);
  }

  return Array.from(byDre.values())
    .map(g => ({
      ...g,
      total: round2(g.total),
      pctDoDesembolso: totalGeral > 0 ? round2((g.total / totalGeral) * 100) : 0,
      rubricas: (rubricasPorDre.get(g.entradaDre) ?? []).slice(0, 40),
    }))
    .sort((a, b) => b.total - a.total);
}

export function agregarPorFornecedor(
  pagar: ParcelaFinanceiraNorm[],
  opts?: { excluirPessoal?: boolean; nomesEquipe?: string[] },
): FornecedorAgg[] {
  const excluirPessoal = opts?.excluirPessoal !== false;
  const nomesEquipe = opts?.nomesEquipe ?? [];
  const map = new Map<
    string,
    FornecedorAgg & { _rubricas: Map<string, number> }
  >();
  let totalGeral = 0;
  for (const p of pagar) {
    if (excluirPessoal && ehPagamentoPessoalOuEquipe(p, nomesEquipe)) continue;
    const nome = (p.contraparte || "Sem fornecedor").trim() || "Sem fornecedor";
    const v = valorTitulo(p);
    totalGeral += v;
    const cur = map.get(nome) ?? {
      nome,
      rubricas: [],
      total: 0,
      pago: 0,
      emAberto: 0,
      qtd: 0,
      pctDoDesembolso: 0,
      _rubricas: new Map<string, number>(),
    };
    cur.total += v;
    cur.pago += p.valorPago;
    cur.emAberto += p.valorEmAberto;
    cur.qtd += 1;
    for (const lin of linhasAlocacaoRubrica(p)) {
      cur._rubricas.set(lin.rubrica, (cur._rubricas.get(lin.rubrica) ?? 0) + lin.valor);
    }
    map.set(nome, cur);
  }
  return Array.from(map.values())
    .map(({ _rubricas, ...f }) => ({
      ...f,
      rubricas: Array.from(_rubricas.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([n]) => n),
      total: round2(f.total),
      pago: round2(f.pago),
      emAberto: round2(f.emAberto),
      pctDoDesembolso: totalGeral > 0 ? round2((f.total / totalGeral) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function montarAging(
  parcelas: ParcelaFinanceiraNorm[],
  referenciaYmd: string,
): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { chave: "a_vencer", label: "A vencer", valor: 0, qtd: 0 },
    { chave: "1_7", label: "1–7 dias atrasado", valor: 0, qtd: 0 },
    { chave: "8_15", label: "8–15 dias", valor: 0, qtd: 0 },
    { chave: "16_30", label: "16–30 dias", valor: 0, qtd: 0 },
    { chave: "31_60", label: "31–60 dias", valor: 0, qtd: 0 },
    { chave: "60_mais", label: "> 60 dias", valor: 0, qtd: 0 },
    { chave: "sem_vencimento", label: "Sem vencimento", valor: 0, qtd: 0 },
  ];
  const byKey = new Map(buckets.map(b => [b.chave, b]));
  const ref = new Date(`${referenciaYmd}T12:00:00`);

  for (const p of parcelas) {
    if (p.valorEmAberto <= 0) continue;
    const venc = p.dataVencimento;
    if (!venc) {
      const b = byKey.get("sem_vencimento")!;
      b.valor += p.valorEmAberto;
      b.qtd += 1;
      continue;
    }
    const d = new Date(`${venc}T12:00:00`);
    const dias = Math.floor((ref.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    let key = "a_vencer";
    if (dias >= 1 && dias <= 7) key = "1_7";
    else if (dias >= 8 && dias <= 15) key = "8_15";
    else if (dias >= 16 && dias <= 30) key = "16_30";
    else if (dias >= 31 && dias <= 60) key = "31_60";
    else if (dias > 60) key = "60_mais";
    const b = byKey.get(key)!;
    b.valor += p.valorEmAberto;
    b.qtd += 1;
  }

  return buckets.map(b => ({ ...b, valor: round2(b.valor) }));
}

export function medirQualidadeAlocacao(
  pagar: ParcelaFinanceiraNorm[],
): QualidadeAlocacao {
  let comRateioApi = 0;
  let semRubrica = 0;
  let semCentroCusto = 0;
  let valorTotal = 0;
  let valorComRateioApi = 0;
  let valorSemRubrica = 0;
  let valorSemCentroCusto = 0;

  for (const p of pagar) {
    const v = valorTitulo(p);
    valorTotal += v;
    if (p.fonteClassificacao === "rateio_api") {
      comRateioApi += 1;
      valorComRateioApi += v;
    }
    const temRubrica =
      p.rateio.some(r => !!r.categoriaNome?.trim()) || !!p.categoria?.trim();
    const temCc =
      p.rateio.some(r => r.centros.some(c => !!c.nome?.trim())) ||
      !!p.centroCusto?.trim();
    if (!temRubrica) {
      semRubrica += 1;
      valorSemRubrica += v;
    }
    if (!temCc) {
      semCentroCusto += 1;
      valorSemCentroCusto += v;
    }
  }

  const n = pagar.length;
  const pctValorSemRubrica =
    valorTotal > 0 ? round2((valorSemRubrica / valorTotal) * 100) : 0;
  const pctValorComRateioApi =
    valorTotal > 0 ? round2((valorComRateioApi / valorTotal) * 100) : 0;

  let baseConfiavelParaDecisao = true;
  let motivoBloqueioDecisao: string | null = null;
  if (n === 0) {
    baseConfiavelParaDecisao = false;
    motivoBloqueioDecisao = "Não há títulos a pagar no período.";
  } else if (pctValorSemRubrica >= 20) {
    baseConfiavelParaDecisao = false;
    motivoBloqueioDecisao = `${pctValorSemRubrica}% do valor a pagar está sem rúbrica Conta Azul. Classifique no CA (ou aqui) antes de decidir corte, prioridade ou alocação.`;
  }

  return {
    totalTitulosPagar: n,
    comRateioApi,
    semRubrica,
    semCentroCusto,
    valorTotal: round2(valorTotal),
    valorComRateioApi: round2(valorComRateioApi),
    valorSemRubrica: round2(valorSemRubrica),
    valorSemCentroCusto: round2(valorSemCentroCusto),
    pctTitulosComRateioApi: n > 0 ? round2((comRateioApi / n) * 100) : 0,
    pctTitulosSemRubrica: n > 0 ? round2((semRubrica / n) * 100) : 0,
    pctTitulosSemCentroCusto: n > 0 ? round2((semCentroCusto / n) * 100) : 0,
    pctValorComRateioApi,
    pctValorSemRubrica,
    pctValorSemCentroCusto:
      valorTotal > 0 ? round2((valorSemCentroCusto / valorTotal) * 100) : 0,
    baseConfiavelParaDecisao,
    motivoBloqueioDecisao,
  };
}

export function resumirCaixa(
  receber: ParcelaFinanceiraNorm[],
  pagar: ParcelaFinanceiraNorm[],
): ResumoCaixaCfo {
  const sum = (xs: ParcelaFinanceiraNorm[], f: (p: ParcelaFinanceiraNorm) => number) =>
    round2(xs.reduce((s, p) => s + f(p), 0));

  const entradasPrevistas = sum(receber, p => p.valor);
  const entradasRealizadas = sum(receber, p => p.valorPago);
  const saidasPrevistas = sum(pagar, p => p.valor);
  const saidasRealizadas = sum(pagar, p => p.valorPago);
  const aReceberEmAberto = sum(receber, p => p.valorEmAberto);
  const aPagarEmAberto = sum(pagar, p => p.valorEmAberto);

  return {
    entradasPrevistas,
    entradasRealizadas,
    saidasPrevistas,
    saidasRealizadas,
    aReceberEmAberto,
    aPagarEmAberto,
    saldoPeriodoRealizado: round2(entradasRealizadas - saidasRealizadas),
    gapCaixaPrevisto: round2(entradasPrevistas - saidasPrevistas),
    coberturaReceberSobrePagar:
      aPagarEmAberto > 0 ? round2(aReceberEmAberto / aPagarEmAberto) : null,
  };
}

/** Só fatos de caixa e integridade — zero “consultoria” inventada. */
export function gerarInsightsCfo(input: {
  resumo: ResumoCaixaCfo;
  qualidadeAlocacao: QualidadeAlocacao;
  saldoContas?: number | null;
}): InsightCfo[] {
  const { resumo, qualidadeAlocacao, saldoContas } = input;
  const insights: InsightCfo[] = [];

  if (!qualidadeAlocacao.baseConfiavelParaDecisao && qualidadeAlocacao.motivoBloqueioDecisao) {
    insights.push({
      id: "integridade-base",
      severidade: "critica",
      tipo: "integridade",
      titulo: "Base Conta Azul insuficiente para decisão de CFO",
      analise: qualidadeAlocacao.motivoBloqueioDecisao,
      acaoSimples:
        "No Conta Azul: complete a categoria (rúbrica) nos títulos sem classificação.",
      acaoComplexa:
        "Padronize o plano de contas e obrigue rateio na inclusão de contas a pagar. Sem isso, qualquer insight de corte é chute.",
      impactoEstimado: qualidadeAlocacao.valorSemRubrica,
    });
  }

  if (qualidadeAlocacao.pctValorSemCentroCusto >= 25) {
    insights.push({
      id: "alocacao-cc",
      severidade: "alta",
      tipo: "alocacao",
      titulo: "Centro de custo pouco preenchido",
      analise: `${qualidadeAlocacao.pctValorSemCentroCusto}% do valor a pagar sem CC — não dá para saber se o gasto está no local certo.`,
      acaoSimples: "Complete CC nos maiores títulos (aba Razão / Lançamentos).",
    });
  }

  if (resumo.saldoPeriodoRealizado < 0) {
    insights.push({
      id: "prejuizo-periodo",
      severidade: "critica",
      tipo: "caixa",
      titulo: "Caixa realizado negativo no período",
      analise: `Saídas realizadas − entradas = R$ ${resumo.saldoPeriodoRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      acaoSimples:
        "Olhe a aba Rúbricas (valores rateados) e a aging de receber — sem inventar corte por fornecedor.",
    });
  }

  if (resumo.gapCaixaPrevisto < 0) {
    insights.push({
      id: "gap-previsto",
      severidade: "alta",
      tipo: "descasamento",
      titulo: "Vencimentos: pagar > receber no período",
      analise: `Gap previsto R$ ${resumo.gapCaixaPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      acaoSimples: "Cruze o fluxo diário com aging a receber.",
      impactoEstimado: Math.abs(resumo.gapCaixaPrevisto),
    });
  }

  if (
    resumo.coberturaReceberSobrePagar != null &&
    resumo.coberturaReceberSobrePagar < 0.85
  ) {
    insights.push({
      id: "cobertura-baixa",
      severidade: "alta",
      tipo: "caixa",
      titulo: "A receber em aberto não cobre a pagar",
      analise: `Cobertura ${resumo.coberturaReceberSobrePagar.toFixed(2)}×.`,
      acaoSimples: "Priorize cobrança pelos maiores títulos da aging.",
    });
  }

  if (saldoContas != null && saldoContas >= 0 && resumo.aPagarEmAberto > saldoContas) {
    insights.push({
      id: "saldo-insuficiente",
      severidade: "critica",
      tipo: "caixa",
      titulo: "Saldo em contas < a pagar em aberto",
      analise: `Saldo ~R$ ${saldoContas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vs a pagar R$ ${resumo.aPagarEmAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      acaoSimples: "Use aging + rúbricas rateadas para priorizar o que é obrigação real.",
    });
  }

  const order: Record<InsightCfo["severidade"], number> = {
    critica: 0,
    alta: 1,
    media: 2,
    oportunidade: 3,
  };
  return insights.sort(
    (a, b) =>
      order[a.severidade] - order[b.severidade] ||
      (b.impactoEstimado ?? 0) - (a.impactoEstimado ?? 0),
  );
}

export function normalizarParcela(input: {
  id: string;
  tipo: "receber" | "pagar";
  descricao?: string | null;
  valor?: number | null;
  valorPago?: number | null;
  valorEmAberto?: number | null;
  status?: string | null;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  dataCompetencia?: string | null;
  categoria?: string | null;
  categorias?: string[] | null;
  centrosCusto?: string[] | null;
  contraparte?: string | null;
  rateio?: RateioLinha[] | null;
  fonteClassificacao?: FonteClassificacao | null;
  entradaDre?: string | null;
  origem?: "conta_azul" | "ajuste_manual" | null;
  ajusteManualId?: number | null;
}): ParcelaFinanceiraNorm {
  const categorias = (input.categorias ?? [])
    .map(c => c.trim())
    .filter(Boolean);
  const centrosCusto = (input.centrosCusto ?? [])
    .map(c => c.trim())
    .filter(Boolean);
  const rateio = (input.rateio ?? []).map(r => ({
    categoriaId: r.categoriaId,
    categoriaNome: r.categoriaNome?.trim() || null,
    valor: round2(Number(r.valor) || 0),
    centros: (r.centros ?? []).map(c => ({
      id: c.id,
      nome: c.nome?.trim() || null,
      valor: round2(Number(c.valor) || 0),
    })),
  }));

  const categoriaFromRateio = rateio.find(r => r.categoriaNome)?.categoriaNome ?? null;
  const categoria =
    categoriaFromRateio || input.categoria?.trim() || categorias[0] || null;
  const centroFromRateio =
    rateio.flatMap(r => r.centros).find(c => c.nome)?.nome ?? null;
  const centroCusto = centroFromRateio || centrosCusto[0] || null;

  let fonte: FonteClassificacao =
    input.fonteClassificacao ??
    (rateio.length > 0
      ? "rateio_api"
      : categoria
        ? "listagem_categoria"
        : "sem_classificacao");

  const confianca: ConfiancaClassificacao =
    fonte === "rateio_api" ||
    fonte === "override_manual" ||
    fonte === "ajuste_manual"
      ? "alta"
      : fonte === "listagem_categoria"
        ? "media"
        : "baixa";

  const valor = Number(input.valor ?? 0) || 0;
  const valorPago = Number(input.valorPago ?? 0) || 0;
  const valorEmAberto =
    input.valorEmAberto != null
      ? Number(input.valorEmAberto) || 0
      : Math.max(0, valor - valorPago);

  const catsNomes = [
    ...new Set(
      [
        ...categorias,
        ...rateio.map(r => r.categoriaNome).filter(Boolean),
        categoria,
      ].filter(Boolean) as string[],
    ),
  ];
  const ccsNomes = [
    ...new Set(
      [
        ...centrosCusto,
        ...rateio.flatMap(r => r.centros.map(c => c.nome).filter(Boolean)),
        centroCusto,
      ].filter(Boolean) as string[],
    ),
  ];

  return {
    id: input.id,
    tipo: input.tipo,
    descricao: input.descricao?.trim() || "Sem descrição",
    valor: round2(valor),
    valorPago: round2(valorPago),
    valorEmAberto: round2(valorEmAberto),
    status: input.status?.trim() || "DESCONHECIDO",
    dataVencimento: input.dataVencimento?.slice(0, 10) ?? null,
    dataPagamento: input.dataPagamento?.slice(0, 10) ?? null,
    dataCompetencia: input.dataCompetencia?.slice(0, 10) ?? null,
    categoria,
    categorias: catsNomes,
    centrosCusto: ccsNomes,
    centroCusto,
    categoriaOriginal: categoria,
    centroCustoOriginal: centroCusto,
    contraparte: input.contraparte ?? null,
    rateio,
    fonteClassificacao: fonte,
    confiancaClassificacao: confianca,
    entradaDre: input.entradaDre?.trim() || null,
    editadoManual: false,
    excluido: false,
    notaClassificacao: null,
    origem: input.origem ?? "conta_azul",
    ajusteManualId: input.ajusteManualId ?? null,
  };
}

export function normalizarChaveFornecedor(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Aplica overrides de parcela/fornecedor. Parcela ganha de fornecedor. */
export function aplicarEdicoesClassificacao(
  parcelas: ParcelaFinanceiraNorm[],
  overrides: ClassificacaoOverride[],
): ParcelaFinanceiraNorm[] {
  const byParcela = new Map<string, ClassificacaoOverride>();
  const byFornecedor = new Map<string, ClassificacaoOverride>();
  for (const o of overrides) {
    if (o.tipo === "parcela") byParcela.set(o.chave.trim(), o);
    else byFornecedor.set(normalizarChaveFornecedor(o.chave), o);
  }

  return parcelas.map(p => {
    const oForn = p.contraparte
      ? byFornecedor.get(normalizarChaveFornecedor(p.contraparte))
      : undefined;
    const oParc = byParcela.get(p.id);
    const o = oParc ?? oForn;
    if (!o) return p;

    const rubrica = o.rubricaOverride?.trim() || p.categoria;
    const centro = o.centroCustoOverride?.trim() || p.centroCusto;
    const editado =
      !!o.rubricaOverride?.trim() ||
      !!o.centroCustoOverride?.trim() ||
      !!o.excluido ||
      !!o.nota?.trim();

    return {
      ...p,
      categoria: rubrica,
      centroCusto: centro,
      categorias: rubrica
        ? Array.from(new Set([rubrica, ...p.categorias]))
        : p.categorias,
      centrosCusto: centro
        ? Array.from(new Set([centro, ...p.centrosCusto]))
        : p.centrosCusto,
      editadoManual: editado,
      excluido: !!o.excluido,
      notaClassificacao: o.nota?.trim() || null,
      fonteClassificacao: o.rubricaOverride?.trim()
        ? "override_manual"
        : p.fonteClassificacao,
      confiancaClassificacao: o.rubricaOverride?.trim()
        ? "alta"
        : p.confiancaClassificacao,
      // Se override de rúbrica, rateio visual fica como 1 linha com valor total
      rateio:
        o.rubricaOverride?.trim()
          ? [
              {
                categoriaId: null,
                categoriaNome: rubrica,
                valor: p.valor > 0 ? p.valor : p.valorPago,
                centros: centro
                  ? [
                      {
                        id: null,
                        nome: centro,
                        valor: p.valor > 0 ? p.valor : p.valorPago,
                      },
                    ]
                  : [],
              },
            ]
          : p.rateio,
    };
  });
}

export function ajusteManualParaParcela(a: AjusteManualInput): ParcelaFinanceiraNorm {
  const valor = round2(Number(a.valor) || 0);
  return normalizarParcela({
    id: `manual-${a.id}`,
    tipo: a.tipo,
    descricao: a.descricao,
    valor,
    valorPago: valor,
    valorEmAberto: 0,
    status: "MANUAL",
    dataVencimento: a.dataVencimento ?? a.dataCompetencia ?? null,
    dataPagamento: a.dataCompetencia ?? a.dataVencimento ?? null,
    dataCompetencia: a.dataCompetencia ?? null,
    categoria: a.rubrica,
    categorias: [a.rubrica],
    centrosCusto: a.centroCusto ? [a.centroCusto] : [],
    contraparte: a.contraparte ?? null,
    fonteClassificacao: "ajuste_manual",
    origem: "ajuste_manual",
    ajusteManualId: a.id,
    rateio: [
      {
        categoriaId: null,
        categoriaNome: a.rubrica,
        valor,
        centros: a.centroCusto
          ? [{ id: null, nome: a.centroCusto, valor }]
          : [],
      },
    ],
  });
}

/** Linhas ativas para agregação/relatório (exclui marcados). */
export function parcelasAtivasParaRelatorio(
  parcelas: ParcelaFinanceiraNorm[],
): ParcelaFinanceiraNorm[] {
  return parcelas.filter(p => !p.excluido);
}
