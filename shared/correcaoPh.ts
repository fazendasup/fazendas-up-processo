/**
 * Correção de pH com hidróxido de potássio P.A. (para subir o pH).
 *
 * A quantidade exata depende da alcalinidade/tampão da solução.
 * Usamos um fator empírico calibrável: g KOH / L / unidade de pH.
 */

export const KOH_PA_EMBALAGEM_G = 1000;
export const KOH_MASSA_MOLAR = 56.11;

/** Padrão conservador para solução nutritiva recirculante (~tampão moderado). */
export const FATOR_KOH_G_POR_L_POR_PH_PADRAO = 0.08;

/** mL de água por grama de KOH na pré-diluição (segurança — reação exotérmica). */
export const ML_AGUA_POR_G_KOH_DILUICAO = 10;

/** Volume mínimo de água para dissolver a dose (mL). */
export const ML_AGUA_DILUICAO_MIN = 100;

export type EntradaCorrecaoPhKoh = {
  volumeCaixaL: number;
  phAtual: number;
  phAlvo: number;
  /** g KOH necessários por litro da caixa para subir 1,0 unidade de pH. */
  fatorGPorLPorPh?: number;
  /** Embalagem disponível (g). Default 1000 g P.A. */
  embalagemG?: number;
};

export type ResultadoCorrecaoPhKoh = {
  deltaPh: number;
  /** Gramas de KOH P.A. a pesar. */
  kohGramas: number;
  /** mL de água limpa para dissolver o KOH antes de ir à caixa. */
  aguaDiluicaoMl: number;
  /** Concentração aproximada da pré-solução (% m/v). */
  concentracaoPreSolucaoPct: number;
  /** Quanto sobra da embalagem de 1000 g após esta dose. */
  sobraEmbalagemG: number;
  aviso: string | null;
  /** true quando o alvo exige baixar pH (KOH não serve). */
  precisaAcido: boolean;
};

function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Calcula dose de KOH P.A. e volume de água para pré-diluição.
 * Adicione à caixa somente a solução já diluída (nunca o sólido direto).
 */
export function calcularCorrecaoPhKoh(input: EntradaCorrecaoPhKoh): ResultadoCorrecaoPhKoh {
  const volume = input.volumeCaixaL;
  const phAtual = input.phAtual;
  const phAlvo = input.phAlvo;
  const fator = input.fatorGPorLPorPh ?? FATOR_KOH_G_POR_L_POR_PH_PADRAO;
  const embalagem = input.embalagemG ?? KOH_PA_EMBALAGEM_G;

  const empty = (aviso: string, extra?: Partial<ResultadoCorrecaoPhKoh>): ResultadoCorrecaoPhKoh => ({
    deltaPh: 0,
    kohGramas: 0,
    aguaDiluicaoMl: 0,
    concentracaoPreSolucaoPct: 0,
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
      "pH alvo menor que o atual: hidróxido de potássio sobe o pH. Use um ácido (ex.: nítrico ou fosfórico) para baixar.",
      { deltaPh, precisaAcido: true },
    );
  }

  if (Math.abs(deltaPh) < 0.01) {
    return empty("pH já está no alvo — nenhuma dose necessária.", { deltaPh: 0 });
  }

  if (!(fator > 0)) {
    return empty("Fator de correção inválido.", { deltaPh });
  }

  const kohGramas = round(volume * deltaPh * fator, 2);
  const aguaDiluicaoMl = Math.max(
    ML_AGUA_DILUICAO_MIN,
    Math.ceil(kohGramas * ML_AGUA_POR_G_KOH_DILUICAO),
  );
  const concentracaoPreSolucaoPct =
    aguaDiluicaoMl > 0 ? round((kohGramas / aguaDiluicaoMl) * 100, 1) : 0;
  const sobraEmbalagemG = round(Math.max(0, embalagem - kohGramas), 1);

  let aviso: string | null = null;
  if (kohGramas > embalagem) {
    aviso = `A dose (${kohGramas} g) ultrapassa a embalagem de ${embalagem} g — use mais de um frasco.`;
  }

  return {
    deltaPh,
    kohGramas,
    aguaDiluicaoMl,
    concentracaoPreSolucaoPct,
    sobraEmbalagemG,
    aviso,
    precisaAcido: false,
  };
}
