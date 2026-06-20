/** Equipes de mão de obra — CLT vs PJ, processamento (variável) vs overhead (fixa). */

export const REGIMES_MO_EQUIPE = ["clt", "pj", "prolabore"] as const;
export type RegimeMoEquipe = (typeof REGIMES_MO_EQUIPE)[number];

export const FINALIDADES_MO_EQUIPE = ["processamento", "overhead"] as const;
export type FinalidadeMoEquipe = (typeof FINALIDADES_MO_EQUIPE)[number];

export const REGIMES_MO_ETAPA = ["clt", "pj", "qualquer"] as const;
export type RegimeMoEtapa = (typeof REGIMES_MO_ETAPA)[number];

export const LABEL_REGIME_MO_EQUIPE: Record<RegimeMoEquipe, string> = {
  clt: "CLT (com encargos)",
  pj: "PJ / contrato",
  prolabore: "Pró-labore (sócio)",
};

export const LABEL_FINALIDADE_MO_EQUIPE: Record<FinalidadeMoEquipe, string> = {
  processamento: "Processamento (tempo × R$/h → CMV)",
  overhead: "Fixa / supervisão (rateio mensal)",
};

export const LABEL_REGIME_MO_ETAPA: Record<RegimeMoEtapa, string> = {
  clt: "Equipe CLT",
  pj: "Equipe PJ",
  qualquer: "Proporcional (CLT + PJ)",
};

export type MoEquipeInput = {
  id?: number;
  nome: string;
  cargo?: string | null;
  codigoFolha?: string | null;
  regime: RegimeMoEquipe;
  finalidade: FinalidadeMoEquipe;
  numPessoas: number;
  horasMes: number;
  custoMensalBase?: number | null;
  encargosPct?: number | null;
  custoMensalTotal?: number | null;
  /** Valor líquido desembolsado (folha / transferência). */
  liquidoMensal?: number | null;
  observacoes?: string | null;
  ativo?: boolean | null;
};

export const MODOS_CUSTO_MO_EQUIPE = ["empregador", "liquido"] as const;
export type ModoCustoMoEquipe = (typeof MODOS_CUSTO_MO_EQUIPE)[number];

export const LABEL_MODO_CUSTO_MO_EQUIPE: Record<ModoCustoMoEquipe, string> = {
  empregador: "Custo empregador (proventos + FGTS / contrato)",
  liquido: "Desembolso líquido (sem encargos patronais)",
};

export type MoEquipeCalculada = MoEquipeInput & {
  custoMensalEmpregador: number;
  custoMensalEfetivo: number;
  custoHora: number | null;
  modoCusto: ModoCustoMoEquipe;
};

export type CustoHoraPorRegime = {
  clt: number | null;
  pj: number | null;
  misto: number | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Custo mensal cheio (empregador / contrato). */
export function calcularCustoMensalEmpregador(e: MoEquipeInput): number {
  if (e.ativo === false) return 0;
  const totalManual = e.custoMensalTotal;
  if (totalManual != null && totalManual >= 0) return round2(totalManual);

  const base = e.custoMensalBase ?? 0;
  if (e.regime === "clt") {
    const enc = e.encargosPct ?? 0;
    if (base > 0) return round2(base * (1 + enc / 100));
  }
  if (e.regime === "pj" || e.regime === "prolabore") {
    if (base > 0) return round2(base);
  }
  if (base > 0) return round2(base);
  return 0;
}

/** Custo usado nos cálculos conforme modo (empregador ou líquido desembolsado). */
export function calcularCustoMensalEquipe(
  e: MoEquipeInput,
  modo: ModoCustoMoEquipe = "empregador",
): number {
  if (e.ativo === false) return 0;
  if (modo === "liquido") {
    if (e.liquidoMensal != null && e.liquidoMensal >= 0) return round2(e.liquidoMensal);
    return calcularCustoMensalEmpregador(e);
  }
  return calcularCustoMensalEmpregador(e);
}

export function calcularCustoHoraEquipe(custoMensal: number, horasMes: number): number | null {
  if (!(horasMes > 0) || !(custoMensal > 0)) return null;
  return round4(custoMensal / horasMes);
}

export function calcularEquipeCompleta(
  e: MoEquipeInput,
  modo: ModoCustoMoEquipe = "empregador",
): MoEquipeCalculada {
  const custoMensalEmpregador = calcularCustoMensalEmpregador(e);
  const custoMensalEfetivo = calcularCustoMensalEquipe(e, modo);
  return {
    ...e,
    custoMensalEmpregador,
    custoMensalEfetivo,
    custoHora: calcularCustoHoraEquipe(custoMensalEfetivo, e.horasMes),
    modoCusto: modo,
  };
}

/** Mapa R$/h das equipes de processamento por regime (+ misto ponderado por horas). */
export function mapaCustoHoraProcessamento(
  equipes: MoEquipeInput[],
  modo: ModoCustoMoEquipe = "empregador",
): CustoHoraPorRegime {
  const proc = equipes.filter((e) => e.ativo !== false && e.finalidade === "processamento");
  let horasClt = 0;
  let custoClt = 0;
  let horasPj = 0;
  let custoPj = 0;

  for (const raw of proc) {
    const e = calcularEquipeCompleta(raw, modo);
    if (e.custoHora == null) continue;
    if (e.regime === "clt") {
      horasClt += e.horasMes;
      custoClt += e.custoMensalEfetivo;
    } else {
      horasPj += e.horasMes;
      custoPj += e.custoMensalEfetivo;
    }
  }

  const clt = horasClt > 0 ? round4(custoClt / horasClt) : null;
  const pj = horasPj > 0 ? round4(custoPj / horasPj) : null;
  const horasTotal = horasClt + horasPj;
  const misto =
    horasTotal > 0 ? round4((custoClt + custoPj) / horasTotal) : clt ?? pj;

  return { clt, pj, misto };
}

export function somarMoOverheadEquipes(
  equipes: MoEquipeInput[],
  modo: ModoCustoMoEquipe = "empregador",
): number {
  let total = 0;
  for (const e of equipes) {
    if (e.ativo === false || e.finalidade !== "overhead") continue;
    total += calcularCustoMensalEquipe(e, modo);
  }
  return round2(total);
}

export function resolverCustoHoraEtapa(
  regimeMo: RegimeMoEtapa | undefined,
  mapa: CustoHoraPorRegime,
): number | null {
  const r = regimeMo ?? "qualquer";
  if (r === "clt") return mapa.clt ?? mapa.misto;
  if (r === "pj") return mapa.pj ?? mapa.misto;
  return mapa.misto ?? mapa.clt ?? mapa.pj;
}

export function custoMoPorMinutos(
  minutosPorUnidade: number,
  regimeMo: RegimeMoEtapa | undefined,
  mapa: CustoHoraPorRegime,
): number {
  if (!(minutosPorUnidade > 0)) return 0;
  const hora = resolverCustoHoraEtapa(regimeMo, mapa);
  if (hora == null) return 0;
  return round4((minutosPorUnidade / 60) * hora);
}
