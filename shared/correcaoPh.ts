/**
 * Correção de pH:
 * - Subir: hidróxido de potássio P.A. (Dinâmica, teor mín. 85%)
 * - Baixar: ácido fosfórico 85% P.A.
 *
 * Prática operacional (ambos):
 * 1) Preparar solução estoque diluída.
 * 2) Adicionar poucos mL desse estoque na caixa.
 *
 * A dose em mL é empírica (fator calibrável por produto).
 */

// --- KOH (subir pH) ---------------------------------------------------------

export const KOH_PRODUTO_NOME = "Hidróxido de potássio (KOH) P.A. — Dinâmica";

/** Embalagem comercial típica (g). */
export const KOH_PA_EMBALAGEM_G = 1000;

/** Teor mínimo declarado no rótulo (fração 0–1). */
export const KOH_TEOR_MIN = 0.85;

/** Receita do estoque: 100 g do produto em 1 L → 100 g produto/L. */
export const KOH_ESTOQUE_MASSA_G = 100;
export const KOH_ESTOQUE_VOLUME_L = 1;
export const KOH_ESTOQUE_G_PRODUTO_POR_L = KOH_ESTOQUE_MASSA_G / KOH_ESTOQUE_VOLUME_L; // 100

/**
 * mL da solução estoque (100 g produto/L) por litro da caixa para subir 1,0 de pH.
 * Ex.: 0,06 → em 500 L e ΔpH 0,5 ≈ 15 mL de estoque.
 */
export const FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO = 0.06;

// --- Ácido fosfórico (baixar pH) --------------------------------------------

export const H3PO4_PRODUTO_NOME = "Ácido fosfórico 85% P.A.";

/** Teor declarado (fração 0–1). */
export const H3PO4_TEOR = 0.85;

/**
 * Densidade aproximada do H₃PO₄ 85% a 20 °C (g/mL).
 * Usada só para equivalência em gramas do produto concentrado.
 */
export const H3PO4_DENSIDADE_G_POR_ML = 1.685;

/**
 * Receita do estoque: 100 mL do ácido 85% P.A. completados a 1 L com água
 * (sempre ácido na água, com EPI).
 */
export const H3PO4_ESTOQUE_ML_PRODUTO = 100;
export const H3PO4_ESTOQUE_VOLUME_L = 1;

/** Fração v/v do produto concentrado no estoque (100 mL / 1000 mL). */
export const H3PO4_ESTOQUE_FRACAO_V = H3PO4_ESTOQUE_ML_PRODUTO / (H3PO4_ESTOQUE_VOLUME_L * 1000);

/**
 * mL da solução estoque (10% v/v) por litro da caixa para baixar 1,0 de pH.
 * Ex.: 0,05 → em 500 L e ΔpH 0,5 ≈ 12,5 mL de estoque.
 */
export const FATOR_ML_ESTOQUE_ACIDO_POR_L_POR_PH_PADRAO = 0.05;

/** Volumes de caixa usados na operação. */
export const VOLUMES_CAIXA_PH_L = [310, 500] as const;

export type EntradaCorrecaoPhKoh = {
  volumeCaixaL: number;
  phAtual: number;
  phAlvo: number;
  /** mL de estoque por litro da caixa por unidade de pH. */
  fatorMlEstoquePorLPorPh?: number;
  /** g de produto (não puro) por litro do estoque. Default 100. */
  estoqueGProdutoPorL?: number;
  /** Teor KOH (0–1). Default 0,85. */
  teor?: number;
  embalagemG?: number;
};

export type ResultadoCorrecaoPhKoh = {
  deltaPh: number;
  /** mL da solução estoque a adicionar na caixa. */
  mlEstoque: number;
  /** Gramas de produto (como pesado) equivalentes na dose. */
  produtoGramas: number;
  /** Gramas de KOH puro equivalentes (produto × teor). */
  kohPuroGramas: number;
  teor: number;
  estoqueMassaG: number;
  estoqueVolumeL: number;
  estoqueGProdutoPorL: number;
  dosesPorLitroEstoque: number | null;
  sobraEmbalagemG: number;
  aviso: string | null;
  precisaAcido: boolean;
};

export type EntradaCorrecaoPhAcido = {
  volumeCaixaL: number;
  phAtual: number;
  phAlvo: number;
  /** mL de estoque por litro da caixa por unidade de pH (queda). */
  fatorMlEstoquePorLPorPh?: number;
  /** mL de ácido concentrado no estoque (default 100). */
  estoqueMlProduto?: number;
  /** Volume do estoque em L (default 1). */
  estoqueVolumeL?: number;
  /** Densidade do concentrado g/mL (default 1,685). */
  densidadeGPorMl?: number;
  teor?: number;
};

export type ResultadoCorrecaoPhAcido = {
  deltaPh: number;
  /** Queda de pH (sempre ≥ 0 quando há dose). */
  quedaPh: number;
  /** mL da solução estoque a adicionar na caixa. */
  mlEstoque: number;
  /** mL equivalentes do ácido concentrado 85% na dose. */
  mlConcentrado: number;
  /** Gramas de produto concentrado equivalentes. */
  produtoGramas: number;
  teor: number;
  estoqueMlProduto: number;
  estoqueVolumeL: number;
  densidadeGPorMl: number;
  dosesPorLitroEstoque: number | null;
  aviso: string | null;
  precisaBase: boolean;
};

export type DirecaoCorrecaoPh = "subir" | "baixar" | "neutro" | "invalido";

export type ResultadoCorrecaoPh = {
  direcao: DirecaoCorrecaoPh;
  koh: ResultadoCorrecaoPhKoh | null;
  acido: ResultadoCorrecaoPhAcido | null;
  aviso: string | null;
};

function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Calcula mL de solução estoque KOH (100 g produto/L, teor ~85%) para subir o pH.
 */
export function calcularCorrecaoPhKoh(input: EntradaCorrecaoPhKoh): ResultadoCorrecaoPhKoh {
  const volume = input.volumeCaixaL;
  const phAtual = input.phAtual;
  const phAlvo = input.phAlvo;
  const fator = input.fatorMlEstoquePorLPorPh ?? FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO;
  const estoqueGProdutoPorL = input.estoqueGProdutoPorL ?? KOH_ESTOQUE_G_PRODUTO_POR_L;
  const teor = input.teor ?? KOH_TEOR_MIN;
  const embalagem = input.embalagemG ?? KOH_PA_EMBALAGEM_G;
  const estoqueMassaG = KOH_ESTOQUE_MASSA_G;
  const estoqueVolumeL = KOH_ESTOQUE_VOLUME_L;

  const empty = (
    aviso: string,
    extra?: Partial<ResultadoCorrecaoPhKoh>,
  ): ResultadoCorrecaoPhKoh => ({
    deltaPh: 0,
    mlEstoque: 0,
    produtoGramas: 0,
    kohPuroGramas: 0,
    teor,
    estoqueMassaG,
    estoqueVolumeL,
    estoqueGProdutoPorL,
    dosesPorLitroEstoque: null,
    sobraEmbalagemG: embalagem,
    aviso,
    precisaAcido: false,
    ...extra,
  });

  if (!(volume > 0) || !Number.isFinite(volume)) {
    return empty("Informe o volume da caixa em litros (> 0).");
  }
  if (
    !Number.isFinite(phAtual) ||
    !Number.isFinite(phAlvo) ||
    phAtual < 0 ||
    phAlvo < 0 ||
    phAtual > 14 ||
    phAlvo > 14
  ) {
    return empty("Informe pH atual e pH alvo válidos (0–14).");
  }

  const deltaPh = round(phAlvo - phAtual, 2);

  if (deltaPh < -0.01) {
    return empty(
      "pH alvo menor que o atual: KOH sobe o pH. Use ácido fosfórico 85% P.A. para baixar.",
      { deltaPh, precisaAcido: true },
    );
  }

  if (Math.abs(deltaPh) < 0.01) {
    return empty("pH já está no alvo — nenhuma dose necessária.", { deltaPh: 0 });
  }

  if (!(fator > 0) || !(estoqueGProdutoPorL > 0) || !(teor > 0)) {
    return empty("Fator, estoque ou teor inválidos.", { deltaPh });
  }

  const mlEstoque = round(volume * deltaPh * fator, 1);
  const produtoGramas = round((mlEstoque / 1000) * estoqueGProdutoPorL, 3);
  const kohPuroGramas = round(produtoGramas * teor, 3);
  const dosesPorLitroEstoque = mlEstoque > 0 ? round(1000 / mlEstoque, 1) : null;
  const sobraEmbalagemG = round(Math.max(0, embalagem - produtoGramas), 1);

  let aviso: string | null = null;
  if (produtoGramas > embalagem) {
    aviso = `A dose usa ${produtoGramas} g de produto — mais que a embalagem de ${embalagem} g.`;
  }

  return {
    deltaPh,
    mlEstoque,
    produtoGramas,
    kohPuroGramas,
    teor,
    estoqueMassaG,
    estoqueVolumeL,
    estoqueGProdutoPorL,
    dosesPorLitroEstoque,
    sobraEmbalagemG,
    aviso,
    precisaAcido: false,
  };
}

/**
 * Calcula mL de solução estoque de ácido fosfórico 85% P.A. para baixar o pH.
 * Estoque padrão: 100 mL do concentrado completados a 1 L com água.
 */
export function calcularCorrecaoPhAcido(input: EntradaCorrecaoPhAcido): ResultadoCorrecaoPhAcido {
  const volume = input.volumeCaixaL;
  const phAtual = input.phAtual;
  const phAlvo = input.phAlvo;
  const fator = input.fatorMlEstoquePorLPorPh ?? FATOR_ML_ESTOQUE_ACIDO_POR_L_POR_PH_PADRAO;
  const estoqueMlProduto = input.estoqueMlProduto ?? H3PO4_ESTOQUE_ML_PRODUTO;
  const estoqueVolumeL = input.estoqueVolumeL ?? H3PO4_ESTOQUE_VOLUME_L;
  const densidadeGPorMl = input.densidadeGPorMl ?? H3PO4_DENSIDADE_G_POR_ML;
  const teor = input.teor ?? H3PO4_TEOR;

  const empty = (
    aviso: string,
    extra?: Partial<ResultadoCorrecaoPhAcido>,
  ): ResultadoCorrecaoPhAcido => ({
    deltaPh: 0,
    quedaPh: 0,
    mlEstoque: 0,
    mlConcentrado: 0,
    produtoGramas: 0,
    teor,
    estoqueMlProduto,
    estoqueVolumeL,
    densidadeGPorMl,
    dosesPorLitroEstoque: null,
    aviso,
    precisaBase: false,
    ...extra,
  });

  if (!(volume > 0) || !Number.isFinite(volume)) {
    return empty("Informe o volume da caixa em litros (> 0).");
  }
  if (
    !Number.isFinite(phAtual) ||
    !Number.isFinite(phAlvo) ||
    phAtual < 0 ||
    phAlvo < 0 ||
    phAtual > 14 ||
    phAlvo > 14
  ) {
    return empty("Informe pH atual e pH alvo válidos (0–14).");
  }

  const deltaPh = round(phAlvo - phAtual, 2);
  const quedaPh = round(phAtual - phAlvo, 2);

  if (deltaPh > 0.01) {
    return empty(
      "pH alvo maior que o atual: ácido fosfórico baixa o pH. Use KOH para subir.",
      { deltaPh, quedaPh: 0, precisaBase: true },
    );
  }

  if (Math.abs(deltaPh) < 0.01) {
    return empty("pH já está no alvo — nenhuma dose necessária.", { deltaPh: 0, quedaPh: 0 });
  }

  if (!(fator > 0) || !(estoqueMlProduto > 0) || !(estoqueVolumeL > 0) || !(densidadeGPorMl > 0)) {
    return empty("Fator, estoque ou densidade inválidos.", { deltaPh, quedaPh });
  }

  const mlEstoque = round(volume * quedaPh * fator, 1);
  const fracaoV = estoqueMlProduto / (estoqueVolumeL * 1000);
  const mlConcentrado = round(mlEstoque * fracaoV, 2);
  const produtoGramas = round(mlConcentrado * densidadeGPorMl, 3);
  const dosesPorLitroEstoque = mlEstoque > 0 ? round(1000 / mlEstoque, 1) : null;

  let aviso: string | null = null;
  if (mlConcentrado > 50) {
    aviso =
      "Dose alta de ácido concentrado equivalente — confira o fator e aplique em etapas, medindo o pH.";
  }

  return {
    deltaPh,
    quedaPh,
    mlEstoque,
    mlConcentrado,
    produtoGramas,
    teor,
    estoqueMlProduto,
    estoqueVolumeL,
    densidadeGPorMl,
    dosesPorLitroEstoque,
    aviso,
    precisaBase: false,
  };
}

/**
 * Escolhe KOH (subir) ou ácido fosfórico (baixar) conforme o ΔpH.
 */
export function calcularCorrecaoPh(input: {
  volumeCaixaL: number;
  phAtual: number;
  phAlvo: number;
  fatorKoh?: number;
  fatorAcido?: number;
}): ResultadoCorrecaoPh {
  const { volumeCaixaL, phAtual, phAlvo } = input;

  if (
    !(volumeCaixaL > 0) ||
    !Number.isFinite(volumeCaixaL) ||
    !Number.isFinite(phAtual) ||
    !Number.isFinite(phAlvo) ||
    phAtual < 0 ||
    phAlvo < 0 ||
    phAtual > 14 ||
    phAlvo > 14
  ) {
    return {
      direcao: "invalido",
      koh: null,
      acido: null,
      aviso: "Informe volume e pH válidos.",
    };
  }

  const delta = phAlvo - phAtual;
  if (Math.abs(delta) < 0.01) {
    return {
      direcao: "neutro",
      koh: null,
      acido: null,
      aviso: "pH já está no alvo — nenhuma dose necessária.",
    };
  }

  if (delta > 0) {
    const koh = calcularCorrecaoPhKoh({
      volumeCaixaL,
      phAtual,
      phAlvo,
      fatorMlEstoquePorLPorPh: input.fatorKoh,
    });
    return { direcao: "subir", koh, acido: null, aviso: koh.aviso };
  }

  const acido = calcularCorrecaoPhAcido({
    volumeCaixaL,
    phAtual,
    phAlvo,
    fatorMlEstoquePorLPorPh: input.fatorAcido,
  });
  return { direcao: "baixar", koh: null, acido, aviso: acido.aviso };
}
