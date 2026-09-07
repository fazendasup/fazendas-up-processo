/**
 * Correção de pH com hidróxido de potássio P.A. (para subir o pH).
 *
 * Produto de referência: Dinâmica KOH P.A. — teor mín. 85%.
 *
 * Prática operacional:
 * 1) Estoque: 100 g do produto em 1 L de água (~100 g/L).
 * 2) Adicionar poucos mL desse estoque na caixa.
 *
 * A dose em mL é empírica (fator calibrável); o teor 85% entra no equivalente de KOH puro.
 */

export const KOH_PRODUTO_NOME = "Hidróxido de potássio P.A. (Dinâmica)";

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
      "pH alvo menor que o atual: KOH sobe o pH. Use um ácido (ex.: nítrico ou fosfórico) para baixar.",
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
