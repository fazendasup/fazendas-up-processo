/**
 * Calculadora de correção de EC com concentrados A/B (galões de estoque).
 *
 * Dosagem padrão: volumes iguais de A e B (prática hidropônica).
 * Relação EC ↔ concentração: EC (mS/cm) ≈ ppm / fatorTds
 * (500, 640 ou 700 conforme a escala do medidor).
 */

export type SalConcentrado = {
  id: string;
  nome: string;
  /** Massa no galão (kg). */
  massaKg: number;
};

export type ReceitaConcentradoAb = {
  volumeGalaoL: number;
  galaoA: SalConcentrado[];
  galaoB: SalConcentrado[];
  /**
   * Fator do medidor: ppm ≈ EC_mS × fatorTds.
   * 700 = escala “700”; 640 comum em fertilizantes; 500 = escala “500”.
   */
  fatorTds: number;
};

/** Receita informada pelo produtor (2×50 L). */
export const RECEITA_AB_PADRAO: ReceitaConcentradoAb = {
  volumeGalaoL: 50,
  fatorTds: 700,
  galaoA: [
    { id: "kno3", nome: "Nitrato de potássio (KNO₃)", massaKg: 5.172 },
    { id: "mgso4", nome: "Sulfato de magnésio 7H₂O", massaKg: 5.07 },
    { id: "map", nome: "MAP", massaKg: 1.316 },
    { id: "micros", nome: "Micros", massaKg: 0.2 },
  ],
  galaoB: [
    { id: "cano3", nome: "Nitrato de cálcio (Ca(NO₃)₂·4H₂O)", massaKg: 6.29 },
    { id: "fe", nome: "Quelato de ferro", massaKg: 0.25 },
  ],
};

export type EntradaCorrecaoEc = {
  volumeCaixaL: number;
  ecAtual: number;
  ecAlvo: number;
  receita?: ReceitaConcentradoAb;
};

export type SalDoseResultado = {
  id: string;
  nome: string;
  galao: "A" | "B";
  /** Gramas do sal que entram na caixa com a dose calculada. */
  gramas: number;
};

export type ResultadoCorrecaoEc = {
  deltaEc: number;
  /** mL do concentrado A a adicionar. */
  mlA: number;
  /** mL do concentrado B a adicionar (igual a A na dosagem 1:1). */
  mlB: number;
  /** Concentração total dos estoques (g/L). */
  concA_gL: number;
  concB_gL: number;
  /** Potência: ΔEC (mS) ao adicionar 1 mL de A + 1 mL de B em 1 L. */
  potenciaMlPorL: number;
  /** Sais sólidos equivalentes na dose. */
  sais: SalDoseResultado[];
  /** Se EC alvo < atual, sugere diluição com água (L). */
  diluirComAguaL: number | null;
  aviso: string | null;
};

function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function concentracaoGalaoGL(sais: SalConcentrado[], volumeGalaoL: number): number {
  if (volumeGalaoL <= 0) return 0;
  const kg = sais.reduce((s, x) => s + Math.max(0, x.massaKg), 0);
  return (kg * 1000) / volumeGalaoL;
}

/** Potência: ΔEC por (mL A + mL B) por litro de caixa. */
export function potenciaEcPorMlPorLitro(receita: ReceitaConcentradoAb): number {
  const concA = concentracaoGalaoGL(receita.galaoA, receita.volumeGalaoL);
  const concB = concentracaoGalaoGL(receita.galaoB, receita.volumeGalaoL);
  const gPorMlCada = (concA + concB) / 1000; // g/L na caixa por 1 mL/L de cada
  const fator = receita.fatorTds > 0 ? receita.fatorTds : 700;
  // ppm = g/L * 1000; EC = ppm / fator → EC = g/L * 1000 / fator
  return (gPorMlCada * 1000) / fator;
}

/**
 * Calcula mL de A e de B (1:1) para subir o EC da caixa.
 * Se o alvo for menor que o atual, estima litros de água limpa para diluir.
 */
export function calcularCorrecaoEc(input: EntradaCorrecaoEc): ResultadoCorrecaoEc {
  const receita = input.receita ?? RECEITA_AB_PADRAO;
  const volume = input.volumeCaixaL;
  const ecAtual = input.ecAtual;
  const ecAlvo = input.ecAlvo;

  const concA = concentracaoGalaoGL(receita.galaoA, receita.volumeGalaoL);
  const concB = concentracaoGalaoGL(receita.galaoB, receita.volumeGalaoL);
  const potencia = potenciaEcPorMlPorLitro(receita);

  if (!(volume > 0) || !Number.isFinite(volume)) {
    return {
      deltaEc: 0,
      mlA: 0,
      mlB: 0,
      concA_gL: round2(concA),
      concB_gL: round2(concB),
      potenciaMlPorL: round(potencia, 4),
      sais: [],
      diluirComAguaL: null,
      aviso: "Informe o volume da caixa em litros (> 0).",
    };
  }
  if (!Number.isFinite(ecAtual) || !Number.isFinite(ecAlvo) || ecAtual < 0 || ecAlvo < 0) {
    return {
      deltaEc: 0,
      mlA: 0,
      mlB: 0,
      concA_gL: round2(concA),
      concB_gL: round2(concB),
      potenciaMlPorL: round(potencia, 4),
      sais: [],
      diluirComAguaL: null,
      aviso: "Informe EC atual e EC alvo válidos (≥ 0).",
    };
  }

  const deltaEc = round2(ecAlvo - ecAtual);

  if (deltaEc < -0.001) {
    // Diluição: C1*V1 = C2*V2 → V2 = V1 * C1/C2 → água = V2 - V1
    const diluir =
      ecAlvo > 0.001 ? round2(volume * (ecAtual / ecAlvo - 1)) : null;
    return {
      deltaEc,
      mlA: 0,
      mlB: 0,
      concA_gL: round2(concA),
      concB_gL: round2(concB),
      potenciaMlPorL: round(potencia, 4),
      sais: [],
      diluirComAguaL: diluir != null && diluir > 0 ? diluir : null,
      aviso:
        diluir != null && diluir > 0
          ? "EC alvo menor que o atual: não adicione concentrado — dilua com água limpa."
          : "EC alvo menor que o atual. Para zerar, esvazie e reponha com água limpa.",
    };
  }

  if (Math.abs(deltaEc) < 0.001) {
    return {
      deltaEc: 0,
      mlA: 0,
      mlB: 0,
      concA_gL: round2(concA),
      concB_gL: round2(concB),
      potenciaMlPorL: round(potencia, 4),
      sais: [],
      diluirComAguaL: null,
      aviso: "EC já está no alvo — nenhuma dose necessária.",
    };
  }

  if (potencia <= 0) {
    return {
      deltaEc,
      mlA: 0,
      mlB: 0,
      concA_gL: round2(concA),
      concB_gL: round2(concB),
      potenciaMlPorL: 0,
      sais: [],
      diluirComAguaL: null,
      aviso: "Receita de concentrado inválida (concentração zero).",
    };
  }

  // ml_por_L * volume = ml total de cada galão
  const mlPorL = deltaEc / potencia;
  const ml = round(mlPorL * volume, 1);

  const sais: SalDoseResultado[] = [
    ...receita.galaoA.map((s) => ({
      id: s.id,
      nome: s.nome,
      galao: "A" as const,
      gramas: round2((s.massaKg * 1000 * ml) / (receita.volumeGalaoL * 1000)),
    })),
    ...receita.galaoB.map((s) => ({
      id: s.id,
      nome: s.nome,
      galao: "B" as const,
      gramas: round2((s.massaKg * 1000 * ml) / (receita.volumeGalaoL * 1000)),
    })),
  ];

  return {
    deltaEc,
    mlA: ml,
    mlB: ml,
    concA_gL: round2(concA),
    concB_gL: round2(concB),
    potenciaMlPorL: round(potencia, 4),
    sais,
    diluirComAguaL: null,
    aviso: null,
  };
}
