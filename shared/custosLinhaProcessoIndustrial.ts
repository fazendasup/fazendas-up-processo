/**
 * Linha industrial — MO (com regime CLT/PJ), máquina (energia + deprec. + consumíveis) e pessoas por etapa.
 */

import {
  resolverCustoHoraEtapa,
  type CustoHoraPorRegime,
  type RegimeMoEtapa,
} from "./custosMoEquipe";

export type CustoMaquinaInput = {
  ativo: boolean;
  potenciaKw: number;
  /** true = vazão kg/h (linha contínua); false = ciclo min + kg/carga (centrífuga). */
  modoContinuo: boolean;
  minutosCiclo: number;
  kgPorCiclo: number;
  tarifaKwh: number | null;
  depreciacaoReaisKg: number;
  consumiveisReaisKg: number;
};

export const CUSTO_MAQUINA_PADRAO: CustoMaquinaInput = {
  ativo: false,
  potenciaKw: 0,
  modoContinuo: false,
  minutosCiclo: 0,
  kgPorCiclo: 1,
  tarifaKwh: null,
  depreciacaoReaisKg: 0,
  consumiveisReaisKg: 0,
};

export type OperadorLinhaProcesso = {
  id: string;
  nome: string;
  regimeMo: RegimeMoEtapa;
};

export const OPERADORES_LINHA_PADRAO: OperadorLinhaProcesso[] = [
  { id: "1", nome: "Operador 1", regimeMo: "qualquer" },
];

/** Etapas R$/kg em sequência na linha de lavagem. */
export const NOMES_ETAPAS_LINHA_PROCESSAMENTO = new Set([
  "Pré-lavagem",
  "Lavagem",
  "Enxague",
  "Secagem (abastecimento)",
]);

export function isEtapaLinhaProcessamento(nome: string): boolean {
  return NOMES_ETAPAS_LINHA_PROCESSAMENTO.has(nome);
}

export type LinhaProcessoIndustrialInput = {
  /** Se true, usa R$/h das equipes MO por regime; senão `custoHoraMo` manual. */
  usarEquipesMo: boolean;
  /** Fallback quando equipes não cadastradas ou etapa sem mapa. */
  custoHoraMo: number;
  tarifaKwh: number;
  /** Cadastro de operadores deste modelo — o mesmo id pode atuar em várias etapas. */
  operadores: OperadorLinhaProcesso[];
  pesPorUnidadeRef: number;
  desfolhagemSegPorPe: number;
  desfolhagemOperadorId: string;
  preLavagemKgHora: number;
  preLavagemEficienciaPct: number;
  preLavagemOperadorId: string;
  /** Sanitizante, detergente etc. (R$/kg processado). */
  preLavagemConsumiveisReaisKg: number;
  lavagemKgHora: number;
  lavagemEficienciaPct: number;
  lavagemUsaMo: boolean;
  lavagemOperadorId: string;
  lavagemMaquina: CustoMaquinaInput;
  enxagueSeg: number;
  enxagueKg: number;
  enxagueOperadorId: string;
  enxagueConsumiveisReaisKg: number;
  secagemSegOperador: number;
  secagemKg: number;
  secagemOperadorId: string;
  secagemMaquina: CustoMaquinaInput;
  embalagemMinPorUn: number;
  embalagemOperadorId: string;
  selagemMinPorCiclo: number;
  selagemUnPorCiclo: number;
  selagemOperadorId: string;
};

export const LINHA_PROCESSO_INDUSTRIAL_PADRAO: LinhaProcessoIndustrialInput = {
  usarEquipesMo: true,
  custoHoraMo: 30,
  tarifaKwh: 0.75,
  operadores: [...OPERADORES_LINHA_PADRAO],
  pesPorUnidadeRef: 1,
  desfolhagemSegPorPe: 30,
  desfolhagemOperadorId: "1",
  preLavagemKgHora: 300,
  preLavagemEficienciaPct: 70,
  preLavagemOperadorId: "1",
  preLavagemConsumiveisReaisKg: 0,
  lavagemKgHora: 300,
  lavagemEficienciaPct: 70,
  lavagemUsaMo: false,
  lavagemOperadorId: "1",
  lavagemMaquina: {
    ativo: true,
    potenciaKw: 8,
    modoContinuo: true,
    minutosCiclo: 0,
    kgPorCiclo: 3,
    tarifaKwh: null,
    depreciacaoReaisKg: 0,
    consumiveisReaisKg: 0,
  },
  enxagueSeg: 30,
  enxagueKg: 3,
  enxagueOperadorId: "1",
  enxagueConsumiveisReaisKg: 0,
  secagemSegOperador: 30,
  secagemKg: 3,
  secagemOperadorId: "1",
  secagemMaquina: {
    ativo: true,
    potenciaKw: 3,
    modoContinuo: false,
    minutosCiclo: 2,
    kgPorCiclo: 3,
    tarifaKwh: null,
    depreciacaoReaisKg: 0,
    consumiveisReaisKg: 0,
  },
  embalagemMinPorUn: 3,
  embalagemOperadorId: "1",
  selagemMinPorCiclo: 2,
  selagemUnPorCiclo: 4,
  selagemOperadorId: "1",
};

export const LINHA_ETAPA_CAMPO_OPERADOR: Record<string, keyof LinhaProcessoIndustrialInput> = {
  Desfolhagem: "desfolhagemOperadorId",
  "Pré-lavagem": "preLavagemOperadorId",
  Lavagem: "lavagemOperadorId",
  Enxague: "enxagueOperadorId",
  "Secagem (abastecimento)": "secagemOperadorId",
  Embalagem: "embalagemOperadorId",
  Selagem: "selagemOperadorId",
};

type LinhaProcessoIndustrialInputLegado = Partial<LinhaProcessoIndustrialInput> & {
  secagemMin?: number;
  modoPessoasProcessamento?: string;
  pessoasLinhaProcessamento?: number;
  desfolhagemPessoas?: number;
  desfolhagemRegimeMo?: RegimeMoEtapa;
  preLavagemPessoas?: number;
  preLavagemRegimeMo?: RegimeMoEtapa;
  lavagemPessoas?: number;
  lavagemRegimeMo?: RegimeMoEtapa;
  enxaguePessoas?: number;
  enxagueRegimeMo?: RegimeMoEtapa;
  secagemPessoas?: number;
  secagemRegimeMo?: RegimeMoEtapa;
  embalagemPessoas?: number;
  embalagemRegimeMo?: RegimeMoEtapa;
  selagemPessoas?: number;
  selagemRegimeMo?: RegimeMoEtapa;
};

export function normalizarOperadoresLinha(
  raw: OperadorLinhaProcesso[] | undefined,
  legado?: LinhaProcessoIndustrialInputLegado,
): OperadorLinhaProcesso[] {
  if (raw?.length) {
    return raw.map((o, i) => ({
      id: String(o.id || i + 1).trim() || String(i + 1),
      nome: String(o.nome || `Operador ${i + 1}`).trim() || `Operador ${i + 1}`,
      regimeMo: o.regimeMo ?? "qualquer",
    }));
  }
  const ops: OperadorLinhaProcesso[] = [{ ...OPERADORES_LINHA_PADRAO[0] }];
  const precisaSegundo =
    (legado?.pessoasLinhaProcessamento ?? 1) > 1 || legado?.modoPessoasProcessamento === "por_etapa";
  if (precisaSegundo) {
    ops.push({ id: "2", nome: "Operador 2", regimeMo: "qualquer" });
  }
  return ops;
}

export function resolverOperadorLinha(
  input: LinhaProcessoIndustrialInput,
  operadorId: string | null | undefined,
): OperadorLinhaProcesso {
  const id = String(operadorId ?? "1").trim() || "1";
  return (
    input.operadores.find((o) => o.id === id) ??
    input.operadores[0] ??
    OPERADORES_LINHA_PADRAO[0]
  );
}

function normalizarMaquina(
  raw: Partial<CustoMaquinaInput> | undefined,
  fallback: CustoMaquinaInput,
): CustoMaquinaInput {
  return { ...fallback, ...raw, tarifaKwh: raw?.tarifaKwh ?? null };
}

/** Compatibilidade com JSON salvo antes das revisões. */
export function normalizarLinhaProcessoInput(raw: LinhaProcessoIndustrialInputLegado): LinhaProcessoIndustrialInput {
  const operadores = normalizarOperadoresLinha(raw.operadores, raw);
  const opDefault = operadores[0]?.id ?? "1";
  const base: LinhaProcessoIndustrialInput = {
    ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
    ...raw,
    operadores,
    desfolhagemOperadorId: raw.desfolhagemOperadorId ?? opDefault,
    preLavagemOperadorId: raw.preLavagemOperadorId ?? opDefault,
    lavagemOperadorId: raw.lavagemOperadorId ?? opDefault,
    enxagueOperadorId: raw.enxagueOperadorId ?? opDefault,
    secagemOperadorId: raw.secagemOperadorId ?? opDefault,
    embalagemOperadorId: raw.embalagemOperadorId ?? opDefault,
    selagemOperadorId: raw.selagemOperadorId ?? opDefault,
  };
  if (raw.usarEquipesMo == null) base.usarEquipesMo = true;
  if (raw.lavagemUsaMo == null) base.lavagemUsaMo = false;
  if (raw.tarifaKwh == null || !(raw.tarifaKwh > 0)) base.tarifaKwh = 0.75;
  if (raw.secagemSegOperador == null) base.secagemSegOperador = 30;
  if (raw.preLavagemConsumiveisReaisKg == null) base.preLavagemConsumiveisReaisKg = 0;
  if (raw.enxagueConsumiveisReaisKg == null) base.enxagueConsumiveisReaisKg = 0;
  base.lavagemMaquina = normalizarMaquina(raw.lavagemMaquina, LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina);
  base.secagemMaquina = normalizarMaquina(raw.secagemMaquina, LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina);
  if (!base.lavagemUsaMo && raw.lavagemMaquina == null) base.lavagemMaquina.ativo = true;
  for (const op of base.operadores) {
    if (!op.regimeMo) op.regimeMo = "qualquer";
  }
  return base;
}

export type EtapaLinhaBreakdown = {
  nome: string;
  modo: "por_kg" | "por_un";
  temMo: boolean;
  temMaquina: boolean;
  operadorId: string | null;
  operadorNome: string | null;
  regimeMo: RegimeMoEtapa | null;
  custoHoraUsado: number | null;
  nota: string | null;
  minPorKg: number | null;
  minPorUn: number | null;
  moReaisPorKg: number | null;
  maquinaReaisPorKg: number | null;
  consumiveisReaisPorKg: number | null;
  moReaisPorUn: number | null;
  reaisPorKg: number | null;
  reaisPorUn: number | null;
};

export type ResumoCapacidadeLinha = {
  /** Soma dos min MO/kg de todos os operadores (carga total da linha). */
  minMoPorKgLinha: number;
  /** Operador com maior carga (soma min/kg nas etapas dele). */
  operadorGargalo: string | null;
  /** Capacidade estimada do operador gargalo (kg/h). */
  kgHoraMaxMo: number | null;
  operadores: Array<{ id: string; nome: string; minPorKg: number; etapas: string[] }>;
  etapas: Array<{ nome: string; minPorKg: number | null; kgHoraEfetivo: number | null }>;
};

export type LinhaProcessoIndustrialResult = {
  etapas: EtapaLinhaBreakdown[];
  processamentoReaisKg: number;
  processamentoMoReaisKg: number;
  processamentoMaquinaReaisKg: number;
  processamentoConsumiveisReaisKg: number;
  desfolhagemMinPorUn: number;
  selagemMinPorUn: number;
  embalagemSelagemMinPorUn: number;
  resumoCapacidade: ResumoCapacidadeLinha;
  mapaHoraUsado: CustoHoraPorRegime | null;
  alertas: string[];
};

export function calcularResumoCapacidadeLinha(etapas: EtapaLinhaBreakdown[]): ResumoCapacidadeLinha {
  const linha = etapas.filter((e) => isEtapaLinhaProcessamento(e.nome) && e.temMo);
  const detalhe = linha.map((e) => {
    const min = e.minPorKg;
    const kgH = min != null && min > 0 ? round4(60 / min) : null;
    return { nome: e.nome, minPorKg: min, kgHoraEfetivo: kgH };
  });

  const porOperador = new Map<string, { id: string; nome: string; minPorKg: number; etapas: string[] }>();
  for (const e of etapas) {
    if (!e.temMo || !e.operadorId) continue;
    const min = e.minPorKg ?? e.minPorUn;
    if (min == null || !(min > 0)) continue;
    const cur = porOperador.get(e.operadorId) ?? {
      id: e.operadorId,
      nome: e.operadorNome ?? e.operadorId,
      minPorKg: 0,
      etapas: [],
    };
    cur.minPorKg = round4(cur.minPorKg + min);
    cur.etapas.push(e.nome);
    porOperador.set(e.operadorId, cur);
  }

  const operadores = Array.from(porOperador.values());
  const minTotal = round4(operadores.reduce((s, o) => s + o.minPorKg, 0));
  if (!operadores.length) {
    return {
      minMoPorKgLinha: minTotal,
      operadorGargalo: null,
      kgHoraMaxMo: null,
      operadores: [],
      etapas: detalhe,
    };
  }
  const gargalo = operadores.reduce((a, b) => (a.minPorKg > b.minPorKg ? a : b));
  return {
    minMoPorKgLinha: minTotal,
    operadorGargalo: gargalo.nome,
    kgHoraMaxMo: gargalo.minPorKg > 0 ? round4(60 / gargalo.minPorKg) : null,
    operadores,
    etapas: detalhe,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function pessoasEtapa(n: number | null | undefined): number {
  const p = Math.floor(Number(n));
  return Number.isFinite(p) && p >= 1 ? p : 1;
}

function kgHoraEfetivo(nominal: number, eficienciaPct: number): number | null {
  if (!(nominal > 0) || !(eficienciaPct > 0) || eficienciaPct > 100) return null;
  return (nominal * eficienciaPct) / 100;
}

function horaMo(
  input: LinhaProcessoIndustrialInput,
  regime: RegimeMoEtapa,
  mapa: CustoHoraPorRegime | null | undefined,
): number {
  if (input.usarEquipesMo && mapa) {
    const h = resolverCustoHoraEtapa(regime, mapa);
    if (h != null && h > 0) return h;
  }
  return input.custoHoraMo;
}

function reaisPorKgDeThroughput(custoHoraMo: number, kgHoraEfetivo: number): number {
  return round4(custoHoraMo / kgHoraEfetivo);
}

function reaisPorKgDeTempoOperador(
  custoHoraMo: number,
  segundosOperador: number,
  kgReferencia: number,
): number | null {
  if (!(segundosOperador > 0) || !(kgReferencia > 0) || !(custoHoraMo >= 0)) return null;
  const minPorKg = segundosOperador / 60 / kgReferencia;
  return round4((minPorKg / 60) * custoHoraMo);
}

function minPorKgDeTempoOperador(segundosOperador: number, kgReferencia: number): number | null {
  if (!(segundosOperador > 0) || !(kgReferencia > 0)) return null;
  return round4(segundosOperador / 60 / kgReferencia);
}

function minPorKgDeThroughput(kgHoraEfetivo: number): number {
  return round4(60 / kgHoraEfetivo);
}

function moPorMin(custoHoraMo: number, minutos: number): number {
  return round4((minutos / 60) * custoHoraMo);
}

export function calcularMaquinaReaisKg(
  maquina: CustoMaquinaInput,
  tarifaDefault: number,
  kgHoraContinuo?: number | null,
): number {
  if (!maquina.ativo) return 0;
  const tarifa = maquina.tarifaKwh ?? tarifaDefault;
  let minPorKg: number | null = null;
  if (maquina.modoContinuo && kgHoraContinuo != null && kgHoraContinuo > 0) {
    minPorKg = 60 / kgHoraContinuo;
  } else if (maquina.kgPorCiclo > 0 && maquina.minutosCiclo > 0) {
    minPorKg = maquina.minutosCiclo / 60 / maquina.kgPorCiclo;
  }
  const fixos = maquina.depreciacaoReaisKg + maquina.consumiveisReaisKg;
  if (minPorKg == null) return round4(fixos);
  const energia = maquina.potenciaKw * minPorKg * tarifa;
  return round4(energia + fixos);
}

type EtapaBase = Omit<
  EtapaLinhaBreakdown,
  | "operadorId"
  | "operadorNome"
  | "moReaisPorKg"
  | "maquinaReaisPorKg"
  | "consumiveisReaisPorKg"
  | "moReaisPorUn"
  | "reaisPorKg"
  | "reaisPorUn"
> & {
  maquinaReaisPorKg?: number | null;
  consumiveisReaisPorKg?: number | null;
};

function totalReaisPorKg(
  mo: number | null,
  maq: number | null,
  consum: number | null,
): number | null {
  const t = (mo ?? 0) + (maq ?? 0) + (consum ?? 0);
  return t > 0 || mo === 0 ? round4(t) : null;
}

function montarEtapaMo(
  base: EtapaBase,
  operador: OperadorLinhaProcesso,
  moValor: number | null,
  notaBase: string | null,
): EtapaLinhaBreakdown {
  const moKg = base.modo === "por_kg" && moValor != null ? round4(moValor) : null;
  const moUn = base.modo === "por_un" && moValor != null ? round4(moValor) : null;
  const maqKg = base.maquinaReaisPorKg ?? null;
  const consumKg =
    base.consumiveisReaisPorKg != null && base.consumiveisReaisPorKg > 0
      ? round4(base.consumiveisReaisPorKg)
      : base.consumiveisReaisPorKg === 0
        ? 0
        : null;
  return {
    ...base,
    operadorId: base.temMo ? operador.id : null,
    operadorNome: base.temMo ? operador.nome : null,
    minPorKg: base.minPorKg,
    minPorUn: base.minPorUn,
    moReaisPorKg: moKg,
    moReaisPorUn: moUn,
    maquinaReaisPorKg: maqKg,
    consumiveisReaisPorKg: consumKg,
    reaisPorKg: base.modo === "por_kg" ? totalReaisPorKg(moKg, maqKg, consumKg) : null,
    reaisPorUn: moUn,
    nota: notaBase,
  };
}

export function calcularLinhaProcessoIndustrial(
  input: LinhaProcessoIndustrialInput,
  mapaHora?: CustoHoraPorRegime | null,
): LinhaProcessoIndustrialResult {
  const alertas: string[] = [];
  const etapas: EtapaLinhaBreakdown[] = [];
  const mapaUsado = input.usarEquipesMo ? (mapaHora ?? null) : null;

  if (input.usarEquipesMo && !mapaHora) {
    alertas.push("Equipes MO não carregadas — usando R$/h manual como fallback.");
  }

  const pes = Math.max(0, input.pesPorUnidadeRef);
  const opDes = resolverOperadorLinha(input, input.desfolhagemOperadorId);
  const hDes = horaMo(input, opDes.regimeMo, mapaUsado);
  const desMin = round4((input.desfolhagemSegPorPe / 60) * pes);
  const desfolhagemEtapa = montarEtapaMo(
    {
      nome: "Desfolhagem",
      modo: "por_un",
      temMo: true,
      temMaquina: false,
      regimeMo: opDes.regimeMo,
      custoHoraUsado: hDes,
      nota: "Manual",
      minPorKg: null,
      minPorUn: desMin,
      maquinaReaisPorKg: null,
    },
    opDes,
    moPorMin(hDes, desMin),
    "Manual",
  );
  etapas.push(desfolhagemEtapa);

  const preKgH = kgHoraEfetivo(input.preLavagemKgHora, input.preLavagemEficienciaPct);
  if (preKgH == null) {
    alertas.push("Pré-lavagem: informe kg/h e eficiência (%).");
  } else {
    const opPre = resolverOperadorLinha(input, input.preLavagemOperadorId);
    const h = horaMo(input, opPre.regimeMo, mapaUsado);
    etapas.push(
      montarEtapaMo(
        {
          nome: "Pré-lavagem",
          modo: "por_kg",
          temMo: true,
          temMaquina: false,
          regimeMo: opPre.regimeMo,
          custoHoraUsado: h,
          nota: null,
          minPorKg: minPorKgDeThroughput(preKgH),
          minPorUn: null,
          maquinaReaisPorKg: null,
          consumiveisReaisPorKg:
            input.preLavagemConsumiveisReaisKg > 0 ? input.preLavagemConsumiveisReaisKg : 0,
        },
        opPre,
        reaisPorKgDeThroughput(h, preKgH),
        null,
      ),
    );
  }

  const lavKgH = kgHoraEfetivo(input.lavagemKgHora, input.lavagemEficienciaPct);
  const lavMaquinaKg = calcularMaquinaReaisKg(input.lavagemMaquina, input.tarifaKwh, lavKgH);
  if (input.lavagemUsaMo) {
    if (lavKgH == null) {
      alertas.push("Lavagem com operador: informe kg/h e eficiência (%).");
    } else {
      const opLav = resolverOperadorLinha(input, input.lavagemOperadorId);
      const h = horaMo(input, opLav.regimeMo, mapaUsado);
      const etapaLav = montarEtapaMo(
        {
          nome: "Lavagem",
          modo: "por_kg",
          temMo: true,
          temMaquina: input.lavagemMaquina.ativo,
          regimeMo: opLav.regimeMo,
          custoHoraUsado: h,
          nota: "Operador + máquina",
          minPorKg: minPorKgDeThroughput(lavKgH),
          minPorUn: null,
          maquinaReaisPorKg: lavMaquinaKg > 0 ? lavMaquinaKg : null,
        },
        opLav,
        reaisPorKgDeThroughput(h, lavKgH),
        "Operador + máquina",
      );
      etapaLav.reaisPorKg = totalReaisPorKg(
        etapaLav.moReaisPorKg,
        etapaLav.maquinaReaisPorKg,
        etapaLav.consumiveisReaisPorKg,
      );
      etapas.push(etapaLav);
    }
  } else {
    etapas.push({
      nome: "Lavagem",
      modo: "por_kg",
      temMo: false,
      temMaquina: input.lavagemMaquina.ativo,
      operadorId: null,
      operadorNome: null,
      regimeMo: null,
      custoHoraUsado: null,
      nota:
        lavKgH != null
          ? `Automática (~${round4(lavKgH)} kg/h) · MO zero`
          : "Automática · MO zero",
      minPorKg: null,
      minPorUn: null,
      moReaisPorKg: 0,
      maquinaReaisPorKg: lavMaquinaKg > 0 ? lavMaquinaKg : null,
      consumiveisReaisPorKg: null,
      moReaisPorUn: null,
      reaisPorKg: lavMaquinaKg,
      reaisPorUn: null,
    });
  }

  const opEnx = resolverOperadorLinha(input, input.enxagueOperadorId);
  const hEnx = horaMo(input, opEnx.regimeMo, mapaUsado);
  const enxMo = reaisPorKgDeTempoOperador(hEnx, input.enxagueSeg, input.enxagueKg);
  if (enxMo == null) {
    alertas.push("Enxague: informe segundos do operador e kg de referência.");
  } else {
    etapas.push(
      montarEtapaMo(
        {
          nome: "Enxague",
          modo: "por_kg",
          temMo: true,
          temMaquina: false,
          regimeMo: opEnx.regimeMo,
          custoHoraUsado: hEnx,
          nota: null,
          minPorKg: minPorKgDeTempoOperador(input.enxagueSeg, input.enxagueKg),
          minPorUn: null,
          maquinaReaisPorKg: null,
          consumiveisReaisPorKg:
            input.enxagueConsumiveisReaisKg > 0 ? input.enxagueConsumiveisReaisKg : 0,
        },
        opEnx,
        enxMo,
        null,
      ),
    );
  }

  const opSec = resolverOperadorLinha(input, input.secagemOperadorId);
  const hSec = horaMo(input, opSec.regimeMo, mapaUsado);
  const secMo = reaisPorKgDeTempoOperador(hSec, input.secagemSegOperador, input.secagemKg);
  const secMaq = calcularMaquinaReaisKg(input.secagemMaquina, input.tarifaKwh, null);
  if (secMo == null) {
    alertas.push("Secagem: informe segundos do operador abastecendo e kg por carga.");
  } else {
    const etapaSec = montarEtapaMo(
      {
        nome: "Secagem (abastecimento)",
        modo: "por_kg",
        temMo: true,
        temMaquina: input.secagemMaquina.ativo,
        regimeMo: opSec.regimeMo,
        custoHoraUsado: hSec,
        nota: "Operador abastecendo + ciclo centrífuga",
        minPorKg: minPorKgDeTempoOperador(input.secagemSegOperador, input.secagemKg),
        minPorUn: null,
        maquinaReaisPorKg: secMaq > 0 ? secMaq : null,
      },
      opSec,
      secMo,
      "Operador + centrífuga",
    );
    etapaSec.reaisPorKg = totalReaisPorKg(
      etapaSec.moReaisPorKg,
      etapaSec.maquinaReaisPorKg,
      etapaSec.consumiveisReaisPorKg,
    );
    etapas.push(etapaSec);
  }

  const selagemMinBase =
    input.selagemUnPorCiclo > 0 ? round4(input.selagemMinPorCiclo / input.selagemUnPorCiclo) : 0;
  const opEmb = resolverOperadorLinha(input, input.embalagemOperadorId);
  const hEmb = horaMo(input, opEmb.regimeMo, mapaUsado);
  const embalagemEtapa = montarEtapaMo(
    {
      nome: "Embalagem",
      modo: "por_un",
      temMo: true,
      temMaquina: false,
      regimeMo: opEmb.regimeMo,
      custoHoraUsado: hEmb,
      nota: "Manual",
      minPorKg: null,
      minPorUn: round4(input.embalagemMinPorUn),
      maquinaReaisPorKg: null,
    },
    opEmb,
    moPorMin(hEmb, input.embalagemMinPorUn),
    "Manual",
  );
  etapas.push(embalagemEtapa);

  const opSel = resolverOperadorLinha(input, input.selagemOperadorId);
  const hSel = horaMo(input, opSel.regimeMo, mapaUsado);
  const selagemEtapa = montarEtapaMo(
    {
      nome: "Selagem",
      modo: "por_un",
      temMo: true,
      temMaquina: false,
      regimeMo: opSel.regimeMo,
      custoHoraUsado: hSel,
      nota: "Manual",
      minPorKg: null,
      minPorUn: selagemMinBase,
      maquinaReaisPorKg: null,
    },
    opSel,
    moPorMin(hSel, selagemMinBase),
    "Manual",
  );
  etapas.push(selagemEtapa);

  const resumoCapacidade = calcularResumoCapacidadeLinha(etapas);
  if (resumoCapacidade.kgHoraMaxMo != null) {
    for (const [nome, kgNominal, efPct] of [
      ["Pré-lavagem", input.preLavagemKgHora, input.preLavagemEficienciaPct],
      ["Lavagem", input.lavagemKgHora, input.lavagemEficienciaPct],
    ] as const) {
      const kgEf = kgHoraEfetivo(kgNominal, efPct);
      if (kgEf != null && kgEf > resumoCapacidade.kgHoraMaxMo * 1.15) {
        alertas.push(
          `${nome} (~${round4(kgEf)} kg/h) pode exceder a capacidade de ${resumoCapacidade.operadorGargalo} (~${resumoCapacidade.kgHoraMaxMo} kg/h).`,
        );
      }
    }
  }

  const porKg = etapas.filter((e) => e.modo === "por_kg");
  const processamentoMoReaisKg = round4(
    porKg.reduce((s, e) => s + (e.moReaisPorKg ?? 0), 0),
  );
  const processamentoMaquinaReaisKg = round4(
    porKg.reduce((s, e) => s + (e.maquinaReaisPorKg ?? 0), 0),
  );
  const processamentoConsumiveisReaisKg = round4(
    porKg.reduce((s, e) => s + (e.consumiveisReaisPorKg ?? 0), 0),
  );
  const processamentoReaisKg = round4(
    processamentoMoReaisKg + processamentoMaquinaReaisKg + processamentoConsumiveisReaisKg,
  );

  return {
    etapas,
    processamentoReaisKg,
    processamentoMoReaisKg,
    processamentoMaquinaReaisKg,
    processamentoConsumiveisReaisKg,
    desfolhagemMinPorUn: desfolhagemEtapa.minPorUn ?? 0,
    selagemMinPorUn: selagemEtapa.minPorUn ?? 0,
    embalagemSelagemMinPorUn: round4((embalagemEtapa.minPorUn ?? 0) + (selagemEtapa.minPorUn ?? 0)),
    resumoCapacidade,
    mapaHoraUsado: mapaUsado,
    alertas,
  };
}

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

/** R$/kg depreciação a partir do valor do equipamento e kg/mês de referência. */
export function depreciacaoReaisKgDeEquipamento(
  valorEquipamento: number,
  vidaUtilMeses: number,
  kgProcessadosMes: number,
): number {
  if (!(valorEquipamento > 0) || !(vidaUtilMeses > 0) || !(kgProcessadosMes > 0)) return 0;
  return round4(valorEquipamento / vidaUtilMeses / kgProcessadosMes);
}

export const FAMILIAS_PROCESSO_MODELO = ["folhosas", "legumes", "microverdes", "outros"] as const;
export type FamiliaProcessoModelo = (typeof FAMILIAS_PROCESSO_MODELO)[number];

export const LABEL_FAMILIA_PROCESSO_MODELO: Record<FamiliaProcessoModelo, string> = {
  folhosas: "Folhosas (alface, rúcula…)",
  legumes: "Legumes / hortaliças de raiz",
  microverdes: "Microverdes",
  outros: "Outros / misto",
};

export type ProcessoModeloRecord = {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  familia: FamiliaProcessoModelo;
  isDefault: boolean;
  kgReferenciaMes: number | null;
  embalagemMicroverdeUn: number;
  embalagemOutrosUn: number;
  lavagemReaisKg: number | null;
  corteMinutosUn: number | null;
  embalagemMinutosUn: number | null;
  adesivoCustoUn: number | null;
  regimeMoPadrao: RegimeMoEtapa;
  incluirAdesivo: boolean;
  linhaProcesso: LinhaProcessoIndustrialInput;
};

export function slugifyProcessoModelo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "modelo";
}

export function configFromProcessoModelo(
  modelo: ProcessoModeloRecord,
): import("./custosProdutoProcessoPadrao").CustosProdutoProcessoConfig {
  return {
    embalagemMicroverdeUn: modelo.embalagemMicroverdeUn,
    embalagemOutrosUn: modelo.embalagemOutrosUn,
    lavagemReaisKg: modelo.lavagemReaisKg,
    lavagemMinutosUn: null,
    embalagemMinutosUn: modelo.embalagemMinutosUn,
    corteMinutosUn: modelo.corteMinutosUn,
    adesivoCustoUn: modelo.adesivoCustoUn,
    regimeMoPadrao: modelo.regimeMoPadrao,
    incluirAdesivo: modelo.incluirAdesivo,
    linhaProcesso: modelo.linhaProcesso,
  };
}

export function derivarProcessoModelo(
  partial: Omit<ProcessoModeloRecord, "lavagemReaisKg" | "corteMinutosUn" | "embalagemMinutosUn"> & {
    lavagemReaisKg?: number | null;
    corteMinutosUn?: number | null;
    embalagemMinutosUn?: number | null;
  },
  mapaHora?: CustoHoraPorRegime | null,
): ProcessoModeloRecord {
  const linha = normalizarLinhaProcessoInput(partial.linhaProcesso);
  const calc = calcularLinhaProcessoIndustrial(linha, mapaHora);
  const derived = modeloComumDeLinhaProcesso(calc);
  return {
    ...partial,
    linhaProcesso: linha,
    lavagemReaisKg: derived.lavagemReaisKg,
    corteMinutosUn: derived.corteMinutosUn,
    embalagemMinutosUn: derived.embalagemMinutosUn,
  };
}
