/** Equipes de mão de obra — CLT vs PJ, processamento (variável) vs overhead (fixa). */

export const REGIMES_MO_EQUIPE = ["clt", "pj"] as const;
export type RegimeMoEquipe = (typeof REGIMES_MO_EQUIPE)[number];

export const FINALIDADES_MO_EQUIPE = ["processamento", "overhead"] as const;
export type FinalidadeMoEquipe = (typeof FINALIDADES_MO_EQUIPE)[number];

export const REGIMES_MO_ETAPA = ["clt", "pj", "qualquer"] as const;
export type RegimeMoEtapa = (typeof REGIMES_MO_ETAPA)[number];

export const LABEL_REGIME_MO_EQUIPE: Record<RegimeMoEquipe, string> = {
  clt: "CLT (com encargos)",
  pj: "PJ / contrato",
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
  regime: RegimeMoEquipe;
  finalidade: FinalidadeMoEquipe;
  numPessoas: number;
  horasMes: number;
  custoMensalBase?: number | null;
  encargosPct?: number | null;
  custoMensalTotal?: number | null;
  ativo?: boolean | null;
};

export type MoEquipeCalculada = MoEquipeInput & {
  custoMensalEfetivo: number;
  custoHora: number | null;
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

/** Custo mensal efetivo: CLT usa base × encargos; PJ usa total ou base. */
export function calcularCustoMensalEquipe(e: MoEquipeInput): number {
  if (e.ativo === false) return 0;
  const totalManual = e.custoMensalTotal;
  if (totalManual != null && totalManual >= 0) return round2(totalManual);

  const base = e.custoMensalBase ?? 0;
  if (e.regime === "clt") {
    const enc = e.encargosPct ?? 0;
    if (base > 0) return round2(base * (1 + enc / 100));
  }
  if (base > 0) return round2(base);
  return 0;
}

export function calcularCustoHoraEquipe(custoMensal: number, horasMes: number): number | null {
  if (!(horasMes > 0) || !(custoMensal > 0)) return null;
  return round4(custoMensal / horasMes);
}

export function calcularEquipeCompleta(e: MoEquipeInput): MoEquipeCalculada {
  const custoMensalEfetivo = calcularCustoMensalEquipe(e);
  return {
    ...e,
    custoMensalEfetivo,
    custoHora: calcularCustoHoraEquipe(custoMensalEfetivo, e.horasMes),
  };
}

/** Mapa R$/h das equipes de processamento por regime (+ misto ponderado por horas). */
export function mapaCustoHoraProcessamento(equipes: MoEquipeInput[]): CustoHoraPorRegime {
  const proc = equipes.filter((e) => e.ativo !== false && e.finalidade === "processamento");
  let horasClt = 0;
  let custoClt = 0;
  let horasPj = 0;
  let custoPj = 0;

  for (const raw of proc) {
    const e = calcularEquipeCompleta(raw);
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

export function somarMoOverheadEquipes(equipes: MoEquipeInput[]): number {
  let total = 0;
  for (const e of equipes) {
    if (e.ativo === false || e.finalidade !== "overhead") continue;
    total += calcularCustoMensalEquipe(e);
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
