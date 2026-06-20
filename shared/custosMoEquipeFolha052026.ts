import type { FinalidadeMoEquipe, MoEquipeInput, RegimeMoEquipe } from "./custosMoEquipe";

export const FOLHA_REFERENCIA = "05/2026";
export const FOLHA_EMPRESA = "VISIONEER SOLUTION LTDA";

export type ColaboradorFolhaMo = MoEquipeInput & {
  codigoFolha: string;
  cargo: string;
  proventos: number;
  fgts: number;
  liquido: number;
  salarioContratual?: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function obsClt(c: ColaboradorFolhaMo): string {
  const fgtsTxt = c.fgts > 0 ? ` + FGTS R$ ${c.fgts.toFixed(2).replace(".", ",")}` : "";
  return (
    `Folha ${FOLHA_REFERENCIA} · ${FOLHA_EMPRESA} · código ${c.codigoFolha}. ` +
    `Proventos R$ ${c.proventos.toFixed(2).replace(".", ",")}${fgtsTxt} = ` +
    `custo empregador R$ ${(c.custoMensalTotal ?? 0).toFixed(2).replace(".", ",")}. ` +
    `Líquido R$ ${c.liquido.toFixed(2).replace(".", ",")}.`
  );
}

function obsProlabore(c: ColaboradorFolhaMo): string {
  return (
    `Folha ${FOLHA_REFERENCIA} · ${FOLHA_EMPRESA} · código ${c.codigoFolha}. ` +
    `Pró-labore R$ ${c.proventos.toFixed(2).replace(".", ",")}. ` +
    `Líquido R$ ${c.liquido.toFixed(2).replace(".", ",")}.`
  );
}

/** Colaboradores CLT e pró-labore da folha ref. 05/2026. Custo empregador CLT = proventos + FGTS. */
const COLABORADORES_RAW = [
  {
    codigoFolha: "000001",
    nome: "ADSON BRUNO TOLENTINO LOPES",
    cargo: "CEO",
    regime: "prolabore" as const,
    finalidade: "overhead" as const,
    numPessoas: 1,
    horasMes: 0,
    custoMensalBase: 17370.38,
    custoMensalTotal: 17370.38,
    proventos: 17370.38,
    fgts: 0,
    liquido: 12982.74,
  },
  {
    codigoFolha: "000003",
    nome: "KARLA BEATRIZ DE SOUZA MAIA",
    cargo: "GERENTE",
    regime: "clt" as const,
    finalidade: "overhead" as const,
    numPessoas: 1,
    horasMes: 220,
    salarioContratual: 5000,
    custoMensalBase: 5000,
    custoMensalTotal: round2(5000 + 400),
    proventos: 5000,
    fgts: 400,
    liquido: 4198.5,
  },
  {
    codigoFolha: "000004",
    nome: "JOSE TEIXEIRA DE ARAUJO NETO SANTOS",
    cargo: "CFO",
    regime: "prolabore" as const,
    finalidade: "overhead" as const,
    numPessoas: 1,
    horasMes: 0,
    custoMensalBase: 4870.38,
    custoMensalTotal: 4870.38,
    proventos: 4870.38,
    fgts: 0,
    liquido: 4334.64,
  },
  {
    codigoFolha: "000005",
    nome: "ADRIA VICTORIA DOS ANJOS MATOS DE SOUZA",
    cargo: "LIDER DE PROCESSO",
    regime: "clt" as const,
    finalidade: "overhead" as const,
    numPessoas: 1,
    horasMes: 220,
    salarioContratual: 2100,
    custoMensalBase: 2100,
    custoMensalTotal: round2(2884.15 + 230.73),
    proventos: 2884.15,
    fgts: 230.73,
    liquido: 2522.9,
  },
  {
    codigoFolha: "000006",
    nome: "JANIO ANDRADE TORRES",
    cargo: "MOTORISTA ENTREGADOR",
    regime: "clt" as const,
    finalidade: "processamento" as const,
    numPessoas: 1,
    horasMes: 220,
    salarioContratual: 2225.25,
    custoMensalBase: 2225.25,
    custoMensalTotal: round2(4306.47 + 344.51),
    proventos: 4306.47,
    fgts: 344.51,
    liquido: 3767.59,
  },
  {
    codigoFolha: "000009",
    nome: "KAILANY BARROS SOARES",
    cargo: "AUXILIAR DE PROCESSO",
    regime: "clt" as const,
    finalidade: "processamento" as const,
    numPessoas: 1,
    horasMes: 220,
    salarioContratual: 2277,
    custoMensalBase: 2277,
    custoMensalTotal: round2(3181.9 + 242.4),
    proventos: 3181.9,
    fgts: 242.4,
    liquido: 2641.28,
  },
] as const;

export const COLABORADORES_FOLHA_052026: ColaboradorFolhaMo[] = COLABORADORES_RAW.map((c) => ({
  ...c,
  liquidoMensal: c.liquido,
  observacoes: c.regime === "prolabore" ? obsProlabore(c as ColaboradorFolhaMo) : obsClt(c as ColaboradorFolhaMo),
}));

export function colaboradoresFolha052026(): ColaboradorFolhaMo[] {
  return COLABORADORES_FOLHA_052026.map((c) => ({ ...c }));
}

export function isRegimeFolhaOverhead(regime: RegimeMoEquipe, finalidade: FinalidadeMoEquipe): boolean {
  return finalidade === "overhead" || regime === "prolabore";
}
