/**
 * Calculadora de correção de EC com os concentrados A/B da receita atual.
 * A e B entram em volumes iguais.
 *
 * Cada sal tem o EC de uma solução a 1 g/L. A mistura na caixa rende menos do que a
 * soma desses valores: na validação (alvo 1,30 saindo de 0,04) a regra antiga,
 * que tratava todo grama como 1,43 mS, chegou a 0,90. O fator abaixo faz a dose
 * padrão fechar com essa leitura.
 */

export type SalConcentrado = {
  id: string;
  nome: string;
  /** Massa no galão (kg). */
  massaKg: number;
  /** mS/cm acrescentados por 1 g/L deste sal na caixa. */
  ecPorGPorL: number;
};

export type ReceitaConcentradoAb = {
  volumeGalaoL: number;
  galaoA: SalConcentrado[];
  galaoB: SalConcentrado[];
};

/** EC (mS/cm) de solução pura a 1 g/L. Calcinit: ficha Yara, 1,2. MKP: 0,72–0,86 a 1 g/L. */
const EC_PURO_POR_G_POR_L: Record<string, number> = {
  nks: 1.3,
  mkp: 0.8,
  mgso4: 0.7,
  dripsol: 0.4,
  calcinit: 1.2,
  "fe-eddha": 0.25,
};

const MASSA_PADRAO_KG: Record<string, number> = {
  nks: 3.6,
  mkp: 1.4,
  mgso4: 2.8,
  dripsol: 0.12,
  calcinit: 6.2,
  "fe-eddha": 0.2,
};

const VOLUME_GALAO_L = 50;

/**
 * A dose calculada com 1 g/L = 1,43 mS (fator 700) subiu o EC em 0,86, não em 1,26.
 * Esta potência é a que a caixa realmente entregou, em mS por mL/L de A e de B.
 */
const POTENCIA_MEDIDA_RECEITA = 0.86 / (1.26 / ((158.4 + 128) / 700));

function potenciaPuraPadrao(): number {
  return Object.entries(MASSA_PADRAO_KG).reduce(
    (soma, [id, kg]) => soma + (kg / VOLUME_GALAO_L) * (EC_PURO_POR_G_POR_L[id] ?? 0),
    0,
  );
}

const ESCALA_EC_MEDIDO = POTENCIA_MEDIDA_RECEITA / potenciaPuraPadrao();

function ecDoSal(id: string): number {
  return (EC_PURO_POR_G_POR_L[id] ?? 0.975) * ESCALA_EC_MEDIDO;
}

/** Receita das caixas A e B (complete 50 L cada). A dose de EC usa o rendimento medido desta mistura. */
export const RECEITA_AB_PADRAO: ReceitaConcentradoAb = {
  volumeGalaoL: VOLUME_GALAO_L,
  galaoA: [
    { id: "nks", nome: "NKS 13-00-43 +1Mg", massaKg: 3.6, ecPorGPorL: ecDoSal("nks") },
    { id: "mkp", nome: "MKP", massaKg: 1.4, ecPorGPorL: ecDoSal("mkp") },
    { id: "mgso4", nome: "Sulfato de Mg 9,5%", massaKg: 2.8, ecPorGPorL: ecDoSal("mgso4") },
    { id: "dripsol", nome: "Dripsol Micro Equilíbrio", massaKg: 0.12, ecPorGPorL: ecDoSal("dripsol") },
  ],
  galaoB: [
    { id: "calcinit", nome: "YaraLiva Calcinit", massaKg: 6.2, ecPorGPorL: ecDoSal("calcinit") },
    { id: "fe-eddha", nome: "Ferro EDDHA 6%", massaKg: 0.2, ecPorGPorL: ecDoSal("fe-eddha") },
  ],
};

export function normalizarReceita(bruta: Partial<ReceitaConcentradoAb> | null | undefined): ReceitaConcentradoAb {
  const catalogo = new Map(
    [...RECEITA_AB_PADRAO.galaoA, ...RECEITA_AB_PADRAO.galaoB].map((sal) => [sal.id, sal.ecPorGPorL]),
  );
  const sal = (item: Partial<SalConcentrado> | undefined, padrao: SalConcentrado): SalConcentrado => {
    const ecInformado = Number(item?.ecPorGPorL);
    return {
      id: padrao.id,
      nome: typeof item?.nome === "string" && item.nome.trim() ? item.nome : padrao.nome,
      massaKg: Number(item?.massaKg) >= 0 ? Number(item?.massaKg) : padrao.massaKg,
      ecPorGPorL: ecInformado > 0 ? ecInformado : (catalogo.get(String(item?.id ?? padrao.id)) ?? padrao.ecPorGPorL),
    };
  };
  if (!bruta?.galaoA?.length || !bruta?.galaoB?.length) return RECEITA_AB_PADRAO;
  const doGalao = (itens: Partial<SalConcentrado>[] | undefined, padroes: SalConcentrado[]) =>
    padroes.map((padrao) => sal(itens?.find((item) => item.id === padrao.id), padrao));
  return {
    volumeGalaoL: (bruta.volumeGalaoL ?? 0) > 0 ? Number(bruta.volumeGalaoL) : VOLUME_GALAO_L,
    galaoA: doGalao(bruta.galaoA, RECEITA_AB_PADRAO.galaoA),
    galaoB: doGalao(bruta.galaoB, RECEITA_AB_PADRAO.galaoB),
  };
}

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

/** ΔEC (mS/cm) ao adicionar 1 mL de A e 1 mL de B em 1 L de caixa. */
export function potenciaEcPorMlPorLitro(receita: ReceitaConcentradoAb): number {
  if (receita.volumeGalaoL <= 0) return 0;
  return [...receita.galaoA, ...receita.galaoB].reduce((soma, sal) => {
    const ec = sal.ecPorGPorL > 0 ? sal.ecPorGPorL : 0;
    return soma + (Math.max(0, sal.massaKg) / receita.volumeGalaoL) * ec;
  }, 0);
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
