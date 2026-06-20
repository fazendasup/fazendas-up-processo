/**
 * Converte tempos/capacidades da linha industrial em valores simples para fichas:
 * - R$/kg (pré-lavagem + lavagem + enxague + secagem) → etapa Lavagem da ficha
 * - min/un desfolhagem → etapa Corte (com pés/un de referência)
 * - min/un embalagem + selagem → etapa Embalagem (MO)
 */

export type LinhaProcessoIndustrialInput = {
  custoHoraMo: number;
  /** Pés por unidade vendida (referência; cada SKU pode variar na ficha). */
  pesPorUnidadeRef: number;
  desfolhagemSegPorPe: number;
  preLavagemKgHora: number;
  preLavagemEficienciaPct: number;
  lavagemKgHora: number;
  lavagemEficienciaPct: number;
  enxagueSeg: number;
  enxagueKg: number;
  secagemMin: number;
  secagemKg: number;
  embalagemMinPorUn: number;
  selagemMinPorCiclo: number;
  selagemUnPorCiclo: number;
};

export const LINHA_PROCESSO_INDUSTRIAL_PADRAO: LinhaProcessoIndustrialInput = {
  custoHoraMo: 30,
  pesPorUnidadeRef: 1,
  desfolhagemSegPorPe: 30,
  preLavagemKgHora: 300,
  preLavagemEficienciaPct: 70,
  lavagemKgHora: 300,
  lavagemEficienciaPct: 70,
  enxagueSeg: 30,
  enxagueKg: 3,
  secagemMin: 2,
  secagemKg: 3,
  embalagemMinPorUn: 3,
  selagemMinPorCiclo: 2,
  selagemUnPorCiclo: 4,
};

export type EtapaLinhaBreakdown = {
  nome: string;
  modo: "por_kg" | "por_un";
  minPorKg: number | null;
  minPorUn: number | null;
  reaisPorKg: number | null;
  reaisPorUn: number | null;
};

export type LinhaProcessoIndustrialResult = {
  etapas: EtapaLinhaBreakdown[];
  /** Soma MO das etapas por kg (vai para lavagemReaisKg do modelo). */
  processamentoReaisKg: number;
  desfolhagemMinPorUn: number;
  selagemMinPorUn: number;
  embalagemSelagemMinPorUn: number;
  alertas: string[];
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function kgHoraEfetivo(nominal: number, eficienciaPct: number): number | null {
  if (!(nominal > 0) || !(eficienciaPct > 0) || eficienciaPct > 100) return null;
  return (nominal * eficienciaPct) / 100;
}

/** MO R$/kg quando o gargalo é capacidade kg/h (máquina + operador). */
function reaisPorKgDeThroughput(custoHoraMo: number, kgHoraEfetivo: number): number {
  return round4(custoHoraMo / kgHoraEfetivo);
}

/** MO R$/kg quando o tempo é dado por lote (ex.: 30 s a cada 3 kg). */
function reaisPorKgDeTempoLote(
  custoHoraMo: number,
  tempoMin: number,
  kgReferencia: number,
): number | null {
  if (!(tempoMin > 0) || !(kgReferencia > 0) || !(custoHoraMo >= 0)) return null;
  const minPorKg = tempoMin / kgReferencia;
  return round4((minPorKg / 60) * custoHoraMo);
}

function minPorKgDeTempoLote(tempoMin: number, kgReferencia: number): number | null {
  if (!(tempoMin > 0) || !(kgReferencia > 0)) return null;
  return round4(tempoMin / kgReferencia);
}

function minPorKgDeThroughput(kgHoraEfetivo: number): number {
  return round4(60 / kgHoraEfetivo);
}

export function calcularLinhaProcessoIndustrial(
  input: LinhaProcessoIndustrialInput,
): LinhaProcessoIndustrialResult {
  const alertas: string[] = [];
  const etapas: EtapaLinhaBreakdown[] = [];
  const { custoHoraMo } = input;

  if (!(custoHoraMo >= 0)) {
    alertas.push("Informe R$/h MO para calcular.");
  }

  const pes = Math.max(0, input.pesPorUnidadeRef);
  const desfolhMinPorPe = input.desfolhagemSegPorPe / 60;
  const desfolhagemMinPorUn = round4(desfolhMinPorPe * pes);
  etapas.push({
    nome: "Desfolhagem",
    modo: "por_un",
    minPorKg: null,
    minPorUn: desfolhagemMinPorUn,
    reaisPorKg: null,
    reaisPorUn:
      custoHoraMo >= 0 ? round4((desfolhagemMinPorUn / 60) * custoHoraMo) : null,
  });

  const preKgH = kgHoraEfetivo(input.preLavagemKgHora, input.preLavagemEficienciaPct);
  if (preKgH == null) {
    alertas.push("Pré-lavagem: informe kg/h e eficiência (%).");
  } else {
    etapas.push({
      nome: "Pré-lavagem",
      modo: "por_kg",
      minPorKg: minPorKgDeThroughput(preKgH),
      minPorUn: null,
      reaisPorKg: reaisPorKgDeThroughput(custoHoraMo, preKgH),
      reaisPorUn: null,
    });
  }

  const lavKgH = kgHoraEfetivo(input.lavagemKgHora, input.lavagemEficienciaPct);
  if (lavKgH == null) {
    alertas.push("Lavagem: informe kg/h e eficiência (%).");
  } else {
    etapas.push({
      nome: "Lavagem",
      modo: "por_kg",
      minPorKg: minPorKgDeThroughput(lavKgH),
      minPorUn: null,
      reaisPorKg: reaisPorKgDeThroughput(custoHoraMo, lavKgH),
      reaisPorUn: null,
    });
  }

  const enxagueMinKg = minPorKgDeTempoLote(input.enxagueSeg / 60, input.enxagueKg);
  const enxagueRkg = reaisPorKgDeTempoLote(custoHoraMo, input.enxagueSeg / 60, input.enxagueKg);
  if (enxagueRkg == null) {
    alertas.push("Enxague: informe tempo e kg de referência.");
  } else {
    etapas.push({
      nome: "Enxague",
      modo: "por_kg",
      minPorKg: enxagueMinKg,
      minPorUn: null,
      reaisPorKg: enxagueRkg,
      reaisPorUn: null,
    });
  }

  const secagemRkg = reaisPorKgDeTempoLote(custoHoraMo, input.secagemMin, input.secagemKg);
  const secagemMinKg = minPorKgDeTempoLote(input.secagemMin, input.secagemKg);
  if (secagemRkg == null) {
    alertas.push("Secagem: informe tempo e kg de referência.");
  } else {
    etapas.push({
      nome: "Secagem",
      modo: "por_kg",
      minPorKg: secagemMinKg,
      minPorUn: null,
      reaisPorKg: secagemRkg,
      reaisPorUn: null,
    });
  }

  const selagemMinPorUn =
    input.selagemUnPorCiclo > 0
      ? round4(input.selagemMinPorCiclo / input.selagemUnPorCiclo)
      : 0;
  const embalagemSelagemMinPorUn = round4(input.embalagemMinPorUn + selagemMinPorUn);

  etapas.push({
    nome: "Embalagem",
    modo: "por_un",
    minPorKg: null,
    minPorUn: round4(input.embalagemMinPorUn),
    reaisPorKg: null,
    reaisPorUn:
      custoHoraMo >= 0 ? round4((input.embalagemMinPorUn / 60) * custoHoraMo) : null,
  });
  etapas.push({
    nome: "Selagem",
    modo: "por_un",
    minPorKg: null,
    minPorUn: selagemMinPorUn,
    reaisPorKg: null,
    reaisPorUn:
      custoHoraMo >= 0 ? round4((selagemMinPorUn / 60) * custoHoraMo) : null,
  });

  const processamentoReaisKg = round4(
    etapas
      .filter((e) => e.modo === "por_kg" && e.reaisPorKg != null)
      .reduce((s, e) => s + (e.reaisPorKg ?? 0), 0),
  );

  return {
    etapas,
    processamentoReaisKg,
    desfolhagemMinPorUn,
    selagemMinPorUn,
    embalagemSelagemMinPorUn,
    alertas,
  };
}

/** Valores prontos para gravar no modelo comum de processo. */
export function modeloComumDeLinhaProcesso(result: LinhaProcessoIndustrialResult): {
  lavagemReaisKg: number;
  corteMinutosUn: number;
  embalagemMinutosUn: number;
} {
  return {
    lavagemReaisKg: result.processamentoReaisKg,
    corteMinutosUn: result.desfolhagemMinPorUn,
    embalagemMinutosUn: result.embalagemSelagemMinPorUn,
  };
}
