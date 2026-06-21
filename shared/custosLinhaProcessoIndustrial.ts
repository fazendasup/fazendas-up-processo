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
  /** Peso da unidade vendida (kg) — converte MO R$/un em R$/kg de referência (ex.: pote 30g = 0,03). */
  kgPorUnidadeRef: number;
  /** Colheita pós-cultivo (min/un) — microverdes e rotas sem lavagem. */
  colheitaMinPorUn: number;
  colheitaOperadorIds: string[];
  desfolhagemSegPorPe: number;
  /** Um ou mais operadores em paralelo na etapa (MO soma). */
  desfolhagemOperadorIds: string[];
  preLavagemKgHora: number;
  preLavagemEficienciaPct: number;
  preLavagemOperadorIds: string[];
  /** Sanitizante, detergente etc. (R$/kg processado). */
  preLavagemConsumiveisReaisKg: number;
  lavagemKgHora: number;
  lavagemEficienciaPct: number;
  lavagemUsaMo: boolean;
  lavagemOperadorIds: string[];
  lavagemMaquina: CustoMaquinaInput;
  enxagueSeg: number;
  enxagueKg: number;
  enxagueOperadorIds: string[];
  enxagueConsumiveisReaisKg: number;
  secagemSegOperador: number;
  secagemKg: number;
  secagemOperadorIds: string[];
  secagemMaquina: CustoMaquinaInput;
  embalagemMinPorUn: number;
  embalagemOperadorIds: string[];
  selagemMinPorCiclo: number;
  selagemUnPorCiclo: number;
  selagemOperadorIds: string[];
};

export const LINHA_PROCESSO_INDUSTRIAL_PADRAO: LinhaProcessoIndustrialInput = {
  usarEquipesMo: true,
  custoHoraMo: 30,
  tarifaKwh: 0.75,
  operadores: [...OPERADORES_LINHA_PADRAO],
  pesPorUnidadeRef: 1,
  kgPorUnidadeRef: 0,
  colheitaMinPorUn: 0,
  colheitaOperadorIds: ["1"],
  desfolhagemSegPorPe: 30,
  desfolhagemOperadorIds: ["1"],
  preLavagemKgHora: 300,
  preLavagemEficienciaPct: 70,
  preLavagemOperadorIds: ["1"],
  preLavagemConsumiveisReaisKg: 0,
  lavagemKgHora: 300,
  lavagemEficienciaPct: 70,
  lavagemUsaMo: false,
  lavagemOperadorIds: ["1"],
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
  enxagueOperadorIds: ["1"],
  enxagueConsumiveisReaisKg: 0,
  secagemSegOperador: 30,
  secagemKg: 3,
  secagemOperadorIds: ["1"],
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
  embalagemOperadorIds: ["1"],
  selagemMinPorCiclo: 2,
  selagemUnPorCiclo: 4,
  selagemOperadorIds: ["1"],
};

const MAQUINA_INATIVA: CustoMaquinaInput = {
  ativo: false,
  potenciaKw: 0,
  modoContinuo: false,
  minutosCiclo: 0,
  kgPorCiclo: 1,
  tarifaKwh: null,
  depreciacaoReaisKg: 0,
  consumiveisReaisKg: 0,
};

/** Linha enxuta: colheita + embalagem (sem lavagem, selagem nem máquinas). */
export const LINHA_PROCESSO_MICROVERDES_PADRAO: LinhaProcessoIndustrialInput = {
  ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
  kgPorUnidadeRef: 0.03,
  colheitaMinPorUn: 1.5,
  colheitaOperadorIds: ["1"],
  desfolhagemSegPorPe: 0,
  desfolhagemOperadorIds: ["1"],
  preLavagemKgHora: 0,
  preLavagemEficienciaPct: 0,
  preLavagemConsumiveisReaisKg: 0,
  lavagemKgHora: 0,
  lavagemEficienciaPct: 0,
  lavagemUsaMo: false,
  lavagemMaquina: { ...MAQUINA_INATIVA },
  enxagueSeg: 0,
  enxagueConsumiveisReaisKg: 0,
  secagemSegOperador: 0,
  secagemMaquina: { ...MAQUINA_INATIVA },
  embalagemMinPorUn: 1,
  embalagemOperadorIds: ["1"],
  selagemMinPorCiclo: 0,
  selagemUnPorCiclo: 1,
  selagemOperadorIds: ["1"],
};

export function linhaPresetParaFamilia(
  familia: FamiliaProcessoModelo,
  atual?: LinhaProcessoIndustrialInput,
): LinhaProcessoIndustrialInput {
  const base = normalizarLinhaProcessoInput(atual ?? LINHA_PROCESSO_INDUSTRIAL_PADRAO);
  if (familia !== "microverdes") return base;
  return normalizarLinhaProcessoInput({
    ...LINHA_PROCESSO_MICROVERDES_PADRAO,
    usarEquipesMo: base.usarEquipesMo,
    custoHoraMo: base.custoHoraMo,
    operadores: base.operadores,
    colheitaMinPorUn: base.colheitaMinPorUn > 0 ? base.colheitaMinPorUn : 1.5,
    embalagemMinPorUn: base.embalagemMinPorUn > 0 ? base.embalagemMinPorUn : 1,
    kgPorUnidadeRef: base.kgPorUnidadeRef > 0 ? base.kgPorUnidadeRef : 0.03,
  });
}

export const LINHA_ETAPAS_OPERADOR_MICROVERDES = new Set(["Colheita", "Embalagem"]);

export function etapasLinhaComMoVisiveis(familia: FamiliaProcessoModelo): Set<string> | null {
  return familia === "microverdes" ? LINHA_ETAPAS_OPERADOR_MICROVERDES : null;
}

export const LINHA_ETAPA_CAMPO_OPERADOR: Record<
  string,
  | "colheitaOperadorIds"
  | "desfolhagemOperadorIds"
  | "preLavagemOperadorIds"
  | "lavagemOperadorIds"
  | "enxagueOperadorIds"
  | "secagemOperadorIds"
  | "embalagemOperadorIds"
  | "selagemOperadorIds"
> = {
  Colheita: "colheitaOperadorIds",
  Desfolhagem: "desfolhagemOperadorIds",
  "Pré-lavagem": "preLavagemOperadorIds",
  Lavagem: "lavagemOperadorIds",
  Enxague: "enxagueOperadorIds",
  "Secagem (abastecimento)": "secagemOperadorIds",
  Embalagem: "embalagemOperadorIds",
  Selagem: "selagemOperadorIds",
};

type LinhaProcessoIndustrialInputLegado = Partial<LinhaProcessoIndustrialInput> & {
  secagemMin?: number;
  modoPessoasProcessamento?: string;
  pessoasLinhaProcessamento?: number;
  desfolhagemOperadorId?: string;
  preLavagemOperadorId?: string;
  lavagemOperadorId?: string;
  enxagueOperadorId?: string;
  secagemOperadorId?: string;
  embalagemOperadorId?: string;
  selagemOperadorId?: string;
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

export function normalizarOperadorIdsEtapa(
  rawIds: string[] | undefined,
  rawId: string | undefined,
  legadoPessoas: number | undefined,
  opDefault: string,
): string[] {
  if (rawIds?.length) {
    const ids = rawIds.map((id) => String(id).trim()).filter(Boolean);
    if (ids.length) return ids;
  }
  const id = String(rawId ?? opDefault).trim() || opDefault;
  const n = pessoasEtapa(legadoPessoas);
  return Array.from({ length: n }, () => id);
}

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

export function resolverOperadoresLinha(
  input: LinhaProcessoIndustrialInput,
  operadorIds: string[] | null | undefined,
): OperadorLinhaProcesso[] {
  const ids = operadorIds?.length ? operadorIds : ["1"];
  return ids.map((id) => resolverOperadorLinha(input, id));
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
    colheitaOperadorIds: normalizarOperadorIdsEtapa(
      raw.colheitaOperadorIds,
      undefined,
      undefined,
      opDefault,
    ),
    desfolhagemOperadorIds: normalizarOperadorIdsEtapa(
      raw.desfolhagemOperadorIds,
      raw.desfolhagemOperadorId,
      raw.desfolhagemPessoas,
      opDefault,
    ),
    preLavagemOperadorIds: normalizarOperadorIdsEtapa(
      raw.preLavagemOperadorIds,
      raw.preLavagemOperadorId,
      raw.preLavagemPessoas,
      opDefault,
    ),
    lavagemOperadorIds: normalizarOperadorIdsEtapa(
      raw.lavagemOperadorIds,
      raw.lavagemOperadorId,
      raw.lavagemPessoas,
      opDefault,
    ),
    enxagueOperadorIds: normalizarOperadorIdsEtapa(
      raw.enxagueOperadorIds,
      raw.enxagueOperadorId,
      raw.enxaguePessoas,
      opDefault,
    ),
    secagemOperadorIds: normalizarOperadorIdsEtapa(
      raw.secagemOperadorIds,
      raw.secagemOperadorId,
      raw.secagemPessoas,
      opDefault,
    ),
    embalagemOperadorIds: normalizarOperadorIdsEtapa(
      raw.embalagemOperadorIds,
      raw.embalagemOperadorId,
      raw.embalagemPessoas,
      opDefault,
    ),
    selagemOperadorIds: normalizarOperadorIdsEtapa(
      raw.selagemOperadorIds,
      raw.selagemOperadorId,
      raw.selagemPessoas,
      opDefault,
    ),
  };
  if (raw.usarEquipesMo == null) base.usarEquipesMo = true;
  if (raw.lavagemUsaMo == null) base.lavagemUsaMo = false;
  if (raw.tarifaKwh == null || !(raw.tarifaKwh > 0)) base.tarifaKwh = 0.75;
  if (raw.secagemSegOperador == null) base.secagemSegOperador = 30;
  if (raw.preLavagemConsumiveisReaisKg == null) base.preLavagemConsumiveisReaisKg = 0;
  if (raw.enxagueConsumiveisReaisKg == null) base.enxagueConsumiveisReaisKg = 0;
  if (raw.colheitaMinPorUn == null) base.colheitaMinPorUn = 0;
  if (raw.kgPorUnidadeRef == null) base.kgPorUnidadeRef = 0;
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
  operadorIds: string[];
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
  processamentoMoReaisUn: number;
  processamentoReaisUn: number;
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
    if (!e.temMo) continue;
    const ids = e.operadorIds?.length ? e.operadorIds : e.operadorId ? [e.operadorId] : [];
    const min = e.minPorKg ?? e.minPorUn;
    if (min == null || !(min > 0)) continue;
    for (const opId of ids) {
      const cur = porOperador.get(opId) ?? {
        id: opId,
        nome: e.operadorNome ?? opId,
        minPorKg: 0,
        etapas: [],
      };
      cur.minPorKg = round4(cur.minPorKg + min);
      if (!cur.etapas.includes(e.nome)) cur.etapas.push(e.nome);
      porOperador.set(opId, cur);
    }
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

function etapaPreLavagemHabilitada(input: LinhaProcessoIndustrialInput): boolean {
  return (
    input.preLavagemKgHora > 0 ||
    input.preLavagemEficienciaPct > 0 ||
    input.preLavagemConsumiveisReaisKg > 0
  );
}

function etapaLavagemMoHabilitada(input: LinhaProcessoIndustrialInput): boolean {
  return (
    input.lavagemUsaMo &&
    (input.lavagemKgHora > 0 || input.lavagemEficienciaPct > 0 || input.lavagemMaquina.ativo)
  );
}

function etapaLavagemMaquinaHabilitada(input: LinhaProcessoIndustrialInput): boolean {
  return !input.lavagemUsaMo && input.lavagemMaquina.ativo;
}

function etapaEnxagueHabilitada(input: LinhaProcessoIndustrialInput): boolean {
  return input.enxagueSeg > 0 || input.enxagueConsumiveisReaisKg > 0;
}

function etapaSecagemHabilitada(input: LinhaProcessoIndustrialInput): boolean {
  return input.secagemSegOperador > 0 || input.secagemMaquina.ativo;
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
  | "operadorIds"
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

type MoEtapaParalela = {
  mo: number | null;
  custoHoraUsado: number | null;
  regimeMo: RegimeMoEtapa | null;
};

function moTotalOperadoresParalelos(
  input: LinhaProcessoIndustrialInput,
  operadores: OperadorLinhaProcesso[],
  mapa: CustoHoraPorRegime | null | undefined,
  moDeUm: (custoHora: number) => number | null,
): MoEtapaParalela {
  if (!operadores.length) return { mo: null, custoHoraUsado: null, regimeMo: null };
  let total = 0;
  const horas: number[] = [];
  const regimes = new Set<RegimeMoEtapa>();
  for (const op of operadores) {
    const h = horaMo(input, op.regimeMo, mapa);
    const m = moDeUm(h);
    if (m == null) return { mo: null, custoHoraUsado: null, regimeMo: null };
    total += m;
    horas.push(h);
    regimes.add(op.regimeMo);
  }
  return {
    mo: round4(total),
    custoHoraUsado: horas.every((h) => h === horas[0]) ? horas[0]! : null,
    regimeMo: regimes.size === 1 ? [...regimes][0]! : null,
  };
}

function montarEtapaMo(
  base: EtapaBase,
  operadores: OperadorLinhaProcesso[],
  moParalelo: MoEtapaParalela,
  notaBase: string | null,
): EtapaLinhaBreakdown {
  const moValor = moParalelo.mo;
  const moKg = base.modo === "por_kg" && moValor != null ? round4(moValor) : null;
  const moUn = base.modo === "por_un" && moValor != null ? round4(moValor) : null;
  const maqKg = base.maquinaReaisPorKg ?? null;
  const consumKg =
    base.consumiveisReaisPorKg != null && base.consumiveisReaisPorKg > 0
      ? round4(base.consumiveisReaisPorKg)
      : base.consumiveisReaisPorKg === 0
        ? 0
        : null;
  const nomes = operadores.map((o) => o.nome);
  return {
    ...base,
    operadorIds: operadores.map((o) => o.id),
    operadorId: operadores[0]?.id ?? null,
    operadorNome: nomes.length ? nomes.join(" + ") : null,
    regimeMo: moParalelo.regimeMo ?? operadores[0]?.regimeMo ?? null,
    custoHoraUsado: moParalelo.custoHoraUsado,
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

  let colheitaEtapa: EtapaLinhaBreakdown | null = null;
  if (input.colheitaMinPorUn > 0) {
    const opsCol = resolverOperadoresLinha(input, input.colheitaOperadorIds);
    const moCol = moTotalOperadoresParalelos(input, opsCol, mapaUsado, (h) =>
      moPorMin(h, input.colheitaMinPorUn),
    );
    colheitaEtapa = montarEtapaMo(
      {
        nome: "Colheita",
        modo: "por_un",
        temMo: true,
        temMaquina: false,
        regimeMo: moCol.regimeMo,
        custoHoraUsado: moCol.custoHoraUsado,
        nota: "Bandeja → tray",
        minPorKg: null,
        minPorUn: round4(input.colheitaMinPorUn),
        maquinaReaisPorKg: null,
      },
      opsCol,
      moCol,
      "Bandeja → tray",
    );
    etapas.push(colheitaEtapa);
  }

  let desfolhagemEtapa: EtapaLinhaBreakdown = {
    nome: "Desfolhagem",
    modo: "por_un",
    temMo: false,
    temMaquina: false,
    operadorId: null,
    operadorIds: [],
    operadorNome: null,
    regimeMo: null,
    custoHoraUsado: null,
    nota: null,
    minPorKg: null,
    minPorUn: 0,
    moReaisPorKg: null,
    maquinaReaisPorKg: null,
    consumiveisReaisPorKg: null,
    moReaisPorUn: null,
    reaisPorKg: null,
    reaisPorUn: null,
  };
  if (input.desfolhagemSegPorPe > 0 && pes > 0) {
    const opsDes = resolverOperadoresLinha(input, input.desfolhagemOperadorIds);
    const desMin = round4((input.desfolhagemSegPorPe / 60) * pes);
    const moDes = moTotalOperadoresParalelos(input, opsDes, mapaUsado, (h) => moPorMin(h, desMin));
    desfolhagemEtapa = montarEtapaMo(
      {
        nome: "Desfolhagem",
        modo: "por_un",
        temMo: true,
        temMaquina: false,
        regimeMo: moDes.regimeMo,
        custoHoraUsado: moDes.custoHoraUsado,
        nota: "Manual",
        minPorKg: null,
        minPorUn: desMin,
        maquinaReaisPorKg: null,
      },
      opsDes,
      moDes,
      "Manual",
    );
    etapas.push(desfolhagemEtapa);
  }

  const preKgH = kgHoraEfetivo(input.preLavagemKgHora, input.preLavagemEficienciaPct);
  if (etapaPreLavagemHabilitada(input)) {
    if (preKgH == null) {
      alertas.push("Pré-lavagem: informe kg/h e eficiência (%).");
    } else {
      const opsPre = resolverOperadoresLinha(input, input.preLavagemOperadorIds);
      const moPre = moTotalOperadoresParalelos(input, opsPre, mapaUsado, (h) =>
        reaisPorKgDeThroughput(h, preKgH),
      );
      etapas.push(
        montarEtapaMo(
          {
            nome: "Pré-lavagem",
            modo: "por_kg",
            temMo: true,
            temMaquina: false,
            regimeMo: moPre.regimeMo,
            custoHoraUsado: moPre.custoHoraUsado,
            nota: null,
            minPorKg: minPorKgDeThroughput(preKgH),
            minPorUn: null,
            maquinaReaisPorKg: null,
            consumiveisReaisPorKg:
              input.preLavagemConsumiveisReaisKg > 0 ? input.preLavagemConsumiveisReaisKg : 0,
          },
          opsPre,
          moPre,
          null,
        ),
      );
    }
  }

  const lavKgH = kgHoraEfetivo(input.lavagemKgHora, input.lavagemEficienciaPct);
  const lavMaquinaKg = calcularMaquinaReaisKg(input.lavagemMaquina, input.tarifaKwh, lavKgH);
  if (etapaLavagemMoHabilitada(input)) {
    if (lavKgH == null) {
      alertas.push("Lavagem com operador: informe kg/h e eficiência (%).");
    } else {
      const opsLav = resolverOperadoresLinha(input, input.lavagemOperadorIds);
      const moLav = moTotalOperadoresParalelos(input, opsLav, mapaUsado, (h) =>
        reaisPorKgDeThroughput(h, lavKgH),
      );
      const etapaLav = montarEtapaMo(
        {
          nome: "Lavagem",
          modo: "por_kg",
          temMo: true,
          temMaquina: input.lavagemMaquina.ativo,
          regimeMo: moLav.regimeMo,
          custoHoraUsado: moLav.custoHoraUsado,
          nota: "Operador + máquina",
          minPorKg: minPorKgDeThroughput(lavKgH),
          minPorUn: null,
          maquinaReaisPorKg: lavMaquinaKg > 0 ? lavMaquinaKg : null,
        },
        opsLav,
        moLav,
        "Operador + máquina",
      );
      etapaLav.reaisPorKg = totalReaisPorKg(
        etapaLav.moReaisPorKg,
        etapaLav.maquinaReaisPorKg,
        etapaLav.consumiveisReaisPorKg,
      );
      etapas.push(etapaLav);
    }
  } else if (etapaLavagemMaquinaHabilitada(input) && lavMaquinaKg > 0) {
    etapas.push({
      nome: "Lavagem",
      modo: "por_kg",
      temMo: false,
      temMaquina: input.lavagemMaquina.ativo,
      operadorId: null,
      operadorIds: [],
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

  if (etapaEnxagueHabilitada(input)) {
    const opsEnx = resolverOperadoresLinha(input, input.enxagueOperadorIds);
    const moEnx = moTotalOperadoresParalelos(input, opsEnx, mapaUsado, (h) =>
      reaisPorKgDeTempoOperador(h, input.enxagueSeg, input.enxagueKg),
    );
    if (moEnx.mo == null) {
      alertas.push("Enxague: informe segundos do operador e kg de referência.");
    } else {
      etapas.push(
        montarEtapaMo(
          {
            nome: "Enxague",
            modo: "por_kg",
            temMo: true,
            temMaquina: false,
            regimeMo: moEnx.regimeMo,
            custoHoraUsado: moEnx.custoHoraUsado,
            nota: null,
            minPorKg: minPorKgDeTempoOperador(input.enxagueSeg, input.enxagueKg),
            minPorUn: null,
            maquinaReaisPorKg: null,
            consumiveisReaisPorKg:
              input.enxagueConsumiveisReaisKg > 0 ? input.enxagueConsumiveisReaisKg : 0,
          },
          opsEnx,
          moEnx,
          null,
        ),
      );
    }
  }

  if (etapaSecagemHabilitada(input)) {
    const opsSec = resolverOperadoresLinha(input, input.secagemOperadorIds);
    const moSec = moTotalOperadoresParalelos(input, opsSec, mapaUsado, (h) =>
      reaisPorKgDeTempoOperador(h, input.secagemSegOperador, input.secagemKg),
    );
    const secMaq = calcularMaquinaReaisKg(input.secagemMaquina, input.tarifaKwh, null);
    if (moSec.mo == null && input.secagemSegOperador > 0) {
      alertas.push("Secagem: informe segundos do operador abastecendo e kg por carga.");
    } else if (moSec.mo != null || secMaq > 0) {
      const etapaSec = montarEtapaMo(
        {
          nome: "Secagem (abastecimento)",
          modo: "por_kg",
          temMo: moSec.mo != null,
          temMaquina: input.secagemMaquina.ativo,
          regimeMo: moSec.regimeMo,
          custoHoraUsado: moSec.custoHoraUsado,
          nota: "Operador abastecendo + ciclo centrífuga",
          minPorKg: minPorKgDeTempoOperador(input.secagemSegOperador, input.secagemKg),
          minPorUn: null,
          maquinaReaisPorKg: secMaq > 0 ? secMaq : null,
        },
        opsSec,
        moSec,
        "Operador + centrífuga",
      );
      etapaSec.reaisPorKg = totalReaisPorKg(
        etapaSec.moReaisPorKg,
        etapaSec.maquinaReaisPorKg,
        etapaSec.consumiveisReaisPorKg,
      );
      etapas.push(etapaSec);
    }
  }

  const selagemMinBase =
    input.selagemUnPorCiclo > 0 ? round4(input.selagemMinPorCiclo / input.selagemUnPorCiclo) : 0;
  const opsEmb = resolverOperadoresLinha(input, input.embalagemOperadorIds);
  const moEmb = moTotalOperadoresParalelos(input, opsEmb, mapaUsado, (h) =>
    moPorMin(h, input.embalagemMinPorUn),
  );
  const embalagemEtapa = montarEtapaMo(
    {
      nome: "Embalagem",
      modo: "por_un",
      temMo: true,
      temMaquina: false,
      regimeMo: moEmb.regimeMo,
      custoHoraUsado: moEmb.custoHoraUsado,
      nota: "Manual",
      minPorKg: null,
      minPorUn: round4(input.embalagemMinPorUn),
      maquinaReaisPorKg: null,
    },
    opsEmb,
    moEmb,
    "Manual",
  );
  etapas.push(embalagemEtapa);

  let selagemEtapa: EtapaLinhaBreakdown = {
    nome: "Selagem",
    modo: "por_un",
    temMo: false,
    temMaquina: false,
    operadorId: null,
    operadorIds: [],
    operadorNome: null,
    regimeMo: null,
    custoHoraUsado: null,
    nota: null,
    minPorKg: null,
    minPorUn: 0,
    moReaisPorKg: null,
    maquinaReaisPorKg: null,
    consumiveisReaisPorKg: null,
    moReaisPorUn: null,
    reaisPorKg: null,
    reaisPorUn: null,
  };
  if (selagemMinBase > 0) {
    const opsSel = resolverOperadoresLinha(input, input.selagemOperadorIds);
    const moSel = moTotalOperadoresParalelos(input, opsSel, mapaUsado, (h) =>
      moPorMin(h, selagemMinBase),
    );
    selagemEtapa = montarEtapaMo(
      {
        nome: "Selagem",
        modo: "por_un",
        temMo: true,
        temMaquina: false,
        regimeMo: moSel.regimeMo,
        custoHoraUsado: moSel.custoHoraUsado,
        nota: "Manual",
        minPorKg: null,
        minPorUn: selagemMinBase,
        maquinaReaisPorKg: null,
      },
      opsSel,
      moSel,
      "Manual",
    );
    etapas.push(selagemEtapa);
  }

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
  const porUn = etapas.filter((e) => e.modo === "por_un");
  const processamentoMoReaisUn = round4(
    porUn.reduce((s, e) => s + (e.moReaisPorUn ?? 0), 0),
  );
  const processamentoReaisUn = round4(
    porUn.reduce((s, e) => s + (e.reaisPorUn ?? 0), 0),
  );
  const kgRef = input.kgPorUnidadeRef > 0 ? input.kgPorUnidadeRef : null;
  const moKgFromUn =
    kgRef != null && processamentoMoReaisUn > 0
      ? round4(processamentoMoReaisUn / kgRef)
      : 0;
  const totalKgFromUn =
    kgRef != null && processamentoReaisUn > 0
      ? round4(processamentoReaisUn / kgRef)
      : 0;
  const processamentoMoReaisKg = round4(
    porKg.reduce((s, e) => s + (e.moReaisPorKg ?? 0), 0) + moKgFromUn,
  );
  const processamentoMaquinaReaisKg = round4(
    porKg.reduce((s, e) => s + (e.maquinaReaisPorKg ?? 0), 0),
  );
  const processamentoConsumiveisReaisKg = round4(
    porKg.reduce((s, e) => s + (e.consumiveisReaisPorKg ?? 0), 0),
  );
  const processamentoReaisKg = round4(
    totalKgFromUn > 0
      ? totalKgFromUn + processamentoMaquinaReaisKg + processamentoConsumiveisReaisKg
      : processamentoMoReaisKg + processamentoMaquinaReaisKg + processamentoConsumiveisReaisKg,
  );

  const homemMinPorUnEtapa = (etapa: EtapaLinhaBreakdown) => {
    if (etapa.minPorUn == null) return 0;
    const n = etapa.operadorIds.length || (etapa.operadorId ? 1 : 0);
    return round4(etapa.minPorUn * Math.max(1, n));
  };

  return {
    etapas,
    processamentoReaisKg,
    processamentoMoReaisKg,
    processamentoMoReaisUn,
    processamentoReaisUn,
    processamentoMaquinaReaisKg,
    processamentoConsumiveisReaisKg,
    desfolhagemMinPorUn: homemMinPorUnEtapa(desfolhagemEtapa),
    selagemMinPorUn: homemMinPorUnEtapa(selagemEtapa),
    embalagemSelagemMinPorUn: round4(
      homemMinPorUnEtapa(embalagemEtapa) + homemMinPorUnEtapa(selagemEtapa),
    ),
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
    logisticaPercentualPadrao: 10,
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
