import type { CustoHoraPorRegime, RegimeMoEtapa } from "./custosMoEquipe";
import { custoMoPorMinutos } from "./custosMoEquipe";

export const TIPOS_FICHA_CUSTO_PRODUTO = [
  "producao_propria",
  "revenda_processada",
  "mix",
  "manual",
] as const;
export type TipoFichaCustoProduto = (typeof TIPOS_FICHA_CUSTO_PRODUTO)[number];

export const LABEL_TIPO_FICHA_CUSTO_PRODUTO: Record<TipoFichaCustoProduto, string> = {
  producao_propria: "Produção própria",
  revenda_processada: "Revenda processada",
  mix: "Mix (produção + revenda)",
  manual: "Manual / referência",
};

export const CATEGORIAS_PRODUTO_CUSTO = [
  "alface",
  "microverde",
  "revenda",
  "mix",
  "outros",
] as const;
export type CategoriaProdutoCusto = (typeof CATEGORIAS_PRODUTO_CUSTO)[number];

export const LABEL_CATEGORIA_PRODUTO_CUSTO: Record<CategoriaProdutoCusto, string> = {
  alface: "Alface / folhosas",
  microverde: "Microverdes",
  revenda: "Revenda",
  mix: "Mix",
  outros: "Outros",
};

export const UNIDADES_VENDA_PRODUTO = ["unidade", "kg", "bandeja", "pacote", "maco"] as const;
export type UnidadeVendaProduto = (typeof UNIDADES_VENDA_PRODUTO)[number];

/** Como a matéria-prima de revenda é comprada (mesmo SKU, fornecedores diferentes). */
export const MODOS_COMPRA_MP = ["kg", "unidade"] as const;
export type ModoCompraMp = (typeof MODOS_COMPRA_MP)[number];

export const LABEL_MODO_COMPRA_MP: Record<ModoCompraMp, string> = {
  kg: "Por kg (a granel)",
  unidade: "Por unidade (caixa, bandeja, pacote…)",
};

export const TIPOS_COMPONENTE_CUSTO = [
  "variedade",
  "estoque",
  "produto_comercial",
  "manual",
  "ficha",
] as const;
export type TipoComponenteCusto = (typeof TIPOS_COMPONENTE_CUSTO)[number];

export const TIPOS_ETAPA_PROCESSO = [
  "lavagem",
  "descasque_corte",
  "embalagem",
  "adesivo",
  "mao_de_obra",
  "logistica",
  "outros",
] as const;
export type TipoEtapaProcesso = (typeof TIPOS_ETAPA_PROCESSO)[number];

export const LABEL_ETAPA_PROCESSO: Record<TipoEtapaProcesso, string> = {
  lavagem: "Lavagem industrial",
  descasque_corte: "Descasque / corte",
  embalagem: "Embalagem",
  adesivo: "Adesivo / rótulo",
  mao_de_obra: "Mão de obra",
  logistica: "Logística",
  outros: "Outros",
};

export type ComponenteCalculoInput = {
  tipo: TipoComponenteCusto;
  nome: string;
  quantidadePorUnidadeFinal: number;
  unidadeComponente: string;
  /** Custo resolvido por unidade do componente (kg, un, etc.) */
  custoUnitario?: number | null;
};

export type EtapaCalculoInput = {
  tipo: TipoEtapaProcesso;
  nome: string;
  custoPorUnidadeFinal: number;
  custoPorKgProcessado?: number | null;
  /** Percentual aplicado sobre o subtotal acumulado antes desta etapa. */
  custoPercentual?: number | null;
  /** Tempo padrão por unidade vendida (min) — MO calculada via R$/h das equipes. */
  minutosPorUnidade?: number | null;
  regimeMo?: RegimeMoEtapa;
};

export type FichaCalculoInput = {
  tipo: TipoFichaCustoProduto;
  unidadeVenda: UnidadeVendaProduto;
  precoVendaReferencia?: number | null;
  /** Revenda: preço de compra por kg (modo kg). */
  precoCompraKg?: number | null;
  /** Revenda: preço de compra por unidade de MP (modo unidade). */
  custoCompraUn?: number | null;
  /** Revenda (compra/un): override manual de unidades consumidas (raro — prefira kg/un compra + perdas). */
  unidadesMpPorUnidade?: number | null;
  /** Revenda (compra/un): peso médio de 1 unidade de compra (ex.: 0,35 kg/cabeça). */
  kgPorUnidadeCompra?: number | null;
  modoCompraMp?: ModoCompraMp | null;
  /**
   * Peso final vendido por unidade.
   * O nome histórico do campo ficou como "bruto", mas o cálculo usa este valor como kg líquido/alvo
   * e calcula automaticamente a compra bruta a partir das perdas.
   */
  kgBrutoPorUnidade?: number | null;
  perdaLavagemPct?: number;
  perdaDescasquePct?: number;
  perdaSelecaoPct?: number;
  /** Produção própria: custo R$/planta da variedade */
  custoVariedadePorPlanta?: number | null;
  /** Kg colhidos por planta (rendimento agrícola) */
  kgColhidoPorPlanta?: number | null;
  /** Kg da produção própria usados por unidade vendida */
  kgProducaoPorUnidade?: number | null;
  componentes: ComponenteCalculoInput[];
  etapas: EtapaCalculoInput[];
  /** R$/h das equipes de processamento (CLT, PJ, misto). */
  custoHoraMo?: CustoHoraPorRegime | null;
};

export type DetalheCustoLinha = {
  grupo: "material" | "processo" | "componente";
  label: string;
  valor: number;
};

export type PrecoVendaMargem = {
  margemPct: number;
  precoVenda: number;
};

export type ResultadoCustoProduto = {
  unidadeVenda: UnidadeVendaProduto;
  custoMaterial: number;
  custoProcesso: number;
  custoTotal: number;
  custoPorUnidade: number | null;
  custoPorKg: number | null;
  kgLiquidoPorUnidade: number | null;
  precoVendaReferencia: number | null;
  margemBruta: number | null;
  margemPct: number | null;
  precosVendaPorMargem: PrecoVendaMargem[];
  alertas: string[];
  detalhes: DetalheCustoLinha[];
};

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function clampPct(v: number): number {
  return Math.min(100, Math.max(0, v));
}

export const MARGENS_ALVO_PRECO_VENDA = [5, 10, 20, 30] as const;

export function precoVendaParaMargem(custo: number | null | undefined, margemPct: number): number | null {
  const c = toNum(custo);
  const m = clampPct(margemPct);
  if (c == null || c <= 0 || m >= 100) return null;
  return c / (1 - m / 100);
}

/** Fator de aproveitamento acumulado (0–1) a partir das perdas em %. */
export function fatorAproveitamento(perdasPct: number[]): number {
  let f = 1;
  for (const p of perdasPct) {
    f *= 1 - clampPct(p) / 100;
  }
  return f;
}

/** Kg bruto necessário para obter `kgLiquido` após perdas. */
export function kgBrutoParaLiquido(kgLiquido: number, perdasPct: number[]): number | null {
  if (kgLiquido <= 0) return null;
  const f = fatorAproveitamento(perdasPct);
  if (f <= 0) return null;
  return kgLiquido / f;
}

export function custoMaterialRevenda(input: {
  precoCompraKg: number;
  kgBrutoPorUnidade: number;
  perdasPct?: number[];
}): { custo: number; kgLiquido: number; alertas: string[] } {
  const alertas: string[] = [];
  const preco = input.precoCompraKg;
  const kgLiquido = input.kgBrutoPorUnidade;
  if (!(preco > 0) || !(kgLiquido > 0)) {
    alertas.push("Informe preço de compra (R$/kg) e kg final vendido por unidade.");
    return { custo: 0, kgLiquido: 0, alertas };
  }
  const kgBruto = kgBrutoParaLiquido(kgLiquido, input.perdasPct ?? []);
  if (kgBruto == null) {
    alertas.push("Perdas acumuladas impedem calcular a compra bruta necessária.");
    return { custo: 0, kgLiquido: 0, alertas };
  }
  const custo = preco * kgBruto;
  const f = fatorAproveitamento(input.perdasPct ?? []);
  if (f < 0.5) alertas.push("Perdas acumuladas > 50% — confira os percentuais.");
  return { custo, kgLiquido, alertas };
}

/**
 * Calcula quantas unidades de compra (cabeça, caixa…) entram por produto vendido.
 * Preferência: peso final + peso/un compra + perdas %. Fallback: unidades base + perdas.
 */
export function unidadesMpConsumidasRevenda(input: {
  kgPorUnidadeVendida?: number | null;
  kgPorUnidadeCompra?: number | null;
  unidadesMpPorUnidade?: number | null;
  perdasPct?: number[];
}): { unidades: number; kgBrutoNecessario: number | null; alertas: string[] } {
  const alertas: string[] = [];
  const perdas = input.perdasPct ?? [];
  const kgFinal = toNum(input.kgPorUnidadeVendida);
  const kgUnCompra = toNum(input.kgPorUnidadeCompra);
  const f = fatorAproveitamento(perdas);
  if (f <= 0) {
    alertas.push("Perdas acumuladas impedem calcular o consumo de matéria-prima.");
    return { unidades: 0, kgBrutoNecessario: null, alertas };
  }

  if (kgFinal != null && kgFinal > 0 && kgUnCompra != null && kgUnCompra > 0) {
    const kgBruto = kgBrutoParaLiquido(kgFinal, perdas);
    if (kgBruto == null) {
      alertas.push("Perdas acumuladas impedem calcular o consumo de matéria-prima.");
      return { unidades: 0, kgBrutoNecessario: null, alertas };
    }
    return { unidades: kgBruto / kgUnCompra, kgBrutoNecessario: kgBruto, alertas };
  }

  const base = toNum(input.unidadesMpPorUnidade) ?? 1;
  if (base <= 0) {
    alertas.push("Unidades de matéria-prima por produto devem ser maiores que zero.");
    return { unidades: 0, kgBrutoNecessario: null, alertas };
  }
  const perdasAtivas = perdas.some((p) => p > 0);
  if (perdasAtivas && base !== 1) {
    alertas.push(
      "Consumo manual com perdas % — use 1 unidade base + perdas, ou informe kg/un de compra + peso do pacote.",
    );
  }
  return {
    unidades: base / f,
    kgBrutoNecessario: kgFinal != null && kgFinal > 0 ? kgBrutoParaLiquido(kgFinal, perdas) : null,
    alertas,
  };
}

/** Matéria-prima comprada por unidade (cabeça, caixa, bandeja…). */
export function custoMaterialRevendaUnidade(input: {
  custoCompraUn: number;
  kgPorUnidadeVendida?: number | null;
  kgPorUnidadeCompra?: number | null;
  unidadesMpPorUnidade?: number | null;
  perdasPct?: number[];
}): { custo: number; kgLiquido: number | null; unidadesMpConsumidas: number; alertas: string[] } {
  const alertas: string[] = [];
  const precoUn = input.custoCompraUn;
  if (!(precoUn > 0)) {
    alertas.push("Informe o preço de compra por unidade de matéria-prima.");
    return { custo: 0, kgLiquido: null, unidadesMpConsumidas: 0, alertas };
  }
  const consumo = unidadesMpConsumidasRevenda(input);
  alertas.push(...consumo.alertas);
  if (consumo.unidades <= 0) {
    return { custo: 0, kgLiquido: null, unidadesMpConsumidas: 0, alertas };
  }
  const kg = toNum(input.kgPorUnidadeVendida);
  return {
    custo: precoUn * consumo.unidades,
    kgLiquido: kg != null && kg > 0 ? kg : null,
    unidadesMpConsumidas: consumo.unidades,
    alertas,
  };
}

export function custoMaterialProducaoPropria(input: {
  custoVariedadePorPlanta: number | null | undefined;
  kgColhidoPorPlanta: number | null | undefined;
  kgProducaoPorUnidade: number | null | undefined;
}): { custo: number; alertas: string[] } {
  const alertas: string[] = [];
  const cpp = toNum(input.custoVariedadePorPlanta);
  const kgp = toNum(input.kgColhidoPorPlanta);
  const kgUso = toNum(input.kgProducaoPorUnidade);
  if (cpp == null || kgp == null || kgUso == null) {
    alertas.push("Informe custo/planta, kg colhido/planta e kg usado por unidade vendida.");
    return { custo: 0, alertas };
  }
  if (cpp <= 0 || kgp <= 0 || kgUso <= 0) {
    alertas.push("Custos e rendimentos devem ser maiores que zero.");
    return { custo: 0, alertas };
  }
  const custoPorKg = cpp / kgp;
  return { custo: custoPorKg * kgUso, alertas };
}

export function custoComponentesMix(
  componentes: ComponenteCalculoInput[],
): { custo: number; detalhes: DetalheCustoLinha[]; alertas: string[] } {
  const detalhes: DetalheCustoLinha[] = [];
  const alertas: string[] = [];
  let custo = 0;
  for (const c of componentes) {
    const q = toNum(c.quantidadePorUnidadeFinal);
    const cu = toNum(c.custoUnitario);
    if (q == null || q <= 0) continue;
    if (cu == null) {
      alertas.push(`Componente «${c.nome}» sem custo unitário resolvido.`);
      continue;
    }
    const linha = q * cu;
    custo += linha;
    detalhes.push({ grupo: "componente", label: c.nome, valor: linha });
  }
  return { custo, detalhes, alertas };
}

export function custoEtapasProcesso(
  etapas: EtapaCalculoInput[],
  kgLiquidoPorUnidade: number | null,
  custoBase = 0,
  custoHoraMo?: CustoHoraPorRegime | null,
): { custo: number; detalhes: DetalheCustoLinha[]; alertas: string[] } {
  const detalhes: DetalheCustoLinha[] = [];
  const alertas: string[] = [];
  let custo = 0;
  for (const e of etapas) {
    const fixo = toNum(e.custoPorUnidadeFinal) ?? 0;
    const porKg = toNum(e.custoPorKgProcessado) ?? 0;
    const pct = clampPct(toNum(e.custoPercentual) ?? 0);
    const minutos = toNum(e.minutosPorUnidade) ?? 0;
    if (e.tipo === "lavagem") {
      if (porKg > 0 && (kgLiquidoPorUnidade == null || kgLiquidoPorUnidade <= 0)) {
        alertas.push(
          `Lavagem «${e.nome}» (${porKg} R$/kg) zerada — informe kg vendido/un ou kg/un na classificação.`,
        );
      }
      if (fixo > 0) {
        alertas.push(`Lavagem «${e.nome}» com R$/un fixo — prefira rateio R$/kg do lote.`);
      }
      if (minutos > 0) {
        alertas.push(`Lavagem «${e.nome}» com min/un — use R$/kg médio do lote, não tempo por SKU.`);
      }
    }
    const moTempo =
      minutos > 0 && custoHoraMo
        ? custoMoPorMinutos(minutos, e.regimeMo, custoHoraMo)
        : 0;
    const variavel = kgLiquidoPorUnidade != null && kgLiquidoPorUnidade > 0 ? porKg * kgLiquidoPorUnidade : 0;
    const percentual = ((custoBase + custo) * pct) / 100;
    const linha = fixo + variavel + percentual + moTempo;
    if (linha > 0) {
      custo += linha;
      const suffix =
        moTempo > 0 && minutos > 0
          ? ` (${minutos} min${e.regimeMo && e.regimeMo !== "qualquer" ? ` · ${e.regimeMo.toUpperCase()}` : ""})`
          : "";
      detalhes.push({ grupo: "processo", label: `${e.nome}${suffix}`, valor: linha });
    }
  }
  return { custo, detalhes, alertas };
}

/** Calcula custo total de uma ficha de produto. */
export function calcularCustoProduto(input: FichaCalculoInput): ResultadoCustoProduto {
  const alertas: string[] = [];
  const detalhes: DetalheCustoLinha[] = [];
  let custoMaterial = 0;
  let kgLiquidoPorUnidade: number | null = null;

  const perdas = [
    input.perdaLavagemPct ?? 0,
    input.perdaDescasquePct ?? 0,
    input.perdaSelecaoPct ?? 0,
  ];

  if (input.tipo === "revenda_processada" || input.tipo === "manual") {
    const modo = input.modoCompraMp ?? "kg";
    if (modo === "unidade") {
      const rev = custoMaterialRevendaUnidade({
        custoCompraUn: toNum(input.custoCompraUn) ?? 0,
        kgPorUnidadeVendida: toNum(input.kgBrutoPorUnidade),
        kgPorUnidadeCompra: toNum(input.kgPorUnidadeCompra),
        unidadesMpPorUnidade: toNum(input.unidadesMpPorUnidade),
        perdasPct: perdas,
      });
      custoMaterial += rev.custo;
      kgLiquidoPorUnidade = rev.kgLiquido;
      alertas.push(...rev.alertas);
      if (rev.custo > 0) {
        const n = rev.unidadesMpConsumidas;
        const sufixo =
          Math.abs(n - 1) < 0.0001
            ? ""
            : ` × ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n)} un MP`;
        detalhes.push({
          grupo: "material",
          label: `Matéria-prima (compra/un${sufixo})`,
          valor: rev.custo,
        });
      }
    } else {
      const rev = custoMaterialRevenda({
        precoCompraKg: toNum(input.precoCompraKg) ?? 0,
        kgBrutoPorUnidade: toNum(input.kgBrutoPorUnidade) ?? 0,
        perdasPct: perdas,
      });
      custoMaterial += rev.custo;
      kgLiquidoPorUnidade = rev.kgLiquido;
      alertas.push(...rev.alertas);
      if (rev.custo > 0) {
        detalhes.push({ grupo: "material", label: "Matéria-prima (R$/kg)", valor: rev.custo });
      }
    }
  }

  if (input.tipo === "producao_propria") {
    const prod = custoMaterialProducaoPropria({
      custoVariedadePorPlanta: input.custoVariedadePorPlanta,
      kgColhidoPorPlanta: input.kgColhidoPorPlanta,
      kgProducaoPorUnidade: input.kgProducaoPorUnidade,
    });
    custoMaterial += prod.custo;
    alertas.push(...prod.alertas);
    if (prod.custo > 0) {
      detalhes.push({ grupo: "material", label: "Produção própria", valor: prod.custo });
      kgLiquidoPorUnidade = toNum(input.kgProducaoPorUnidade);
    }
  }

  if (input.tipo === "mix" || input.componentes.length > 0) {
    const mix = custoComponentesMix(input.componentes);
    custoMaterial += mix.custo;
    detalhes.push(...mix.detalhes);
    alertas.push(...mix.alertas);
    if (input.tipo === "mix" && input.componentes.length < 2) {
      alertas.push("Mix deve ter ao menos 2 componentes.");
    }
  }

  const proc = custoEtapasProcesso(input.etapas, kgLiquidoPorUnidade, custoMaterial, input.custoHoraMo);
  const custoProcesso = proc.custo;
  detalhes.push(...proc.detalhes);
  alertas.push(...proc.alertas);

  const custoTotal = custoMaterial + custoProcesso;
  const custoPorKg =
    custoTotal > 0 && kgLiquidoPorUnidade != null && kgLiquidoPorUnidade > 0
      ? custoTotal / kgLiquidoPorUnidade
      : input.unidadeVenda === "kg" && custoTotal > 0
        ? custoTotal
        : null;
  const custoPorUnidade =
    input.unidadeVenda === "kg"
      ? custoPorKg
      : custoTotal > 0
        ? custoTotal
        : null;

  const preco = toNum(input.precoVendaReferencia);
  const margemBruta =
    preco != null && custoPorUnidade != null && preco > 0 ? preco - custoPorUnidade : null;
  const margemPct =
    margemBruta != null && preco != null && preco > 0 ? (margemBruta / preco) * 100 : null;
  const precosVendaPorMargem =
    custoPorUnidade != null
      ? MARGENS_ALVO_PRECO_VENDA.map((m) => ({
          margemPct: m,
          precoVenda: precoVendaParaMargem(custoPorUnidade, m) ?? 0,
        }))
      : [];

  if (custoPorUnidade == null) {
    alertas.push("Não foi possível calcular custo por unidade — complete os campos obrigatórios.");
  }

  return {
    unidadeVenda: input.unidadeVenda,
    custoMaterial,
    custoProcesso,
    custoTotal,
    custoPorUnidade,
    custoPorKg,
    kgLiquidoPorUnidade,
    precoVendaReferencia: preco,
    margemBruta,
    margemPct,
    precosVendaPorMargem,
    alertas,
    detalhes,
  };
}
