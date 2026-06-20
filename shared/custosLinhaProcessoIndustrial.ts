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

export const MODOS_PESSOAS_PROCESSAMENTO = ["por_etapa", "equipe_linha"] as const;
export type ModoPessoasProcessamento = (typeof MODOS_PESSOAS_PROCESSAMENTO)[number];

export const LABEL_MODO_PESSOAS_PROCESSAMENTO: Record<ModoPessoasProcessamento, string> = {
  por_etapa: "Por etapa (pessoas diferentes em cada posto)",
  equipe_linha:
    "Equipe na linha (mesmo operador ou turma fixa na sequência pré-lav → enxague → secagem)",
};

/** Etapas R$/kg em sequência na linha de lavagem — compartilham a mesma equipe. */
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
  /**
   * equipe_linha: soma MO sequencial por kg e aplica `pessoasLinhaProcessamento` na linha.
   * por_etapa: pessoas independentes (desfolhagem/embalagem sempre por etapa).
   */
  modoPessoasProcessamento: ModoPessoasProcessamento;
  /** Operadores na sequência da linha (pré-lav … secagem), quando modo = equipe_linha. */
  pessoasLinhaProcessamento: number;
  pesPorUnidadeRef: number;
  desfolhagemSegPorPe: number;
  desfolhagemPessoas: number;
  desfolhagemRegimeMo: RegimeMoEtapa;
  preLavagemKgHora: number;
  preLavagemEficienciaPct: number;
  preLavagemPessoas: number;
  preLavagemRegimeMo: RegimeMoEtapa;
  /** Sanitizante, detergente etc. (R$/kg processado). */
  preLavagemConsumiveisReaisKg: number;
  lavagemKgHora: number;
  lavagemEficienciaPct: number;
  lavagemUsaMo: boolean;
  lavagemPessoas: number;
  lavagemRegimeMo: RegimeMoEtapa;
  lavagemMaquina: CustoMaquinaInput;
  enxagueSeg: number;
  enxagueKg: number;
  enxaguePessoas: number;
  enxagueRegimeMo: RegimeMoEtapa;
  enxagueConsumiveisReaisKg: number;
  secagemSegOperador: number;
  secagemKg: number;
  secagemPessoas: number;
  secagemRegimeMo: RegimeMoEtapa;
  secagemMaquina: CustoMaquinaInput;
  embalagemMinPorUn: number;
  embalagemPessoas: number;
  embalagemRegimeMo: RegimeMoEtapa;
  selagemMinPorCiclo: number;
  selagemUnPorCiclo: number;
  selagemPessoas: number;
  selagemRegimeMo: RegimeMoEtapa;
};

export const LINHA_PROCESSO_INDUSTRIAL_PADRAO: LinhaProcessoIndustrialInput = {
  usarEquipesMo: true,
  custoHoraMo: 30,
  tarifaKwh: 0.75,
  modoPessoasProcessamento: "equipe_linha",
  pessoasLinhaProcessamento: 1,
  pesPorUnidadeRef: 1,
  desfolhagemSegPorPe: 30,
  desfolhagemPessoas: 1,
  desfolhagemRegimeMo: "qualquer",
  preLavagemKgHora: 300,
  preLavagemEficienciaPct: 70,
  preLavagemPessoas: 1,
  preLavagemRegimeMo: "qualquer",
  preLavagemConsumiveisReaisKg: 0,
  lavagemKgHora: 300,
  lavagemEficienciaPct: 70,
  lavagemUsaMo: false,
  lavagemPessoas: 1,
  lavagemRegimeMo: "qualquer",
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
  enxaguePessoas: 1,
  enxagueRegimeMo: "qualquer",
  enxagueConsumiveisReaisKg: 0,
  secagemSegOperador: 30,
  secagemKg: 3,
  secagemPessoas: 1,
  secagemRegimeMo: "qualquer",
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
  embalagemPessoas: 1,
  embalagemRegimeMo: "qualquer",
  selagemMinPorCiclo: 2,
  selagemUnPorCiclo: 4,
  selagemPessoas: 1,
  selagemRegimeMo: "qualquer",
};

const CAMPOS_PESSOAS: (keyof LinhaProcessoIndustrialInput)[] = [
  "desfolhagemPessoas",
  "preLavagemPessoas",
  "lavagemPessoas",
  "enxaguePessoas",
  "secagemPessoas",
  "embalagemPessoas",
  "selagemPessoas",
];

function normalizarMaquina(
  raw: Partial<CustoMaquinaInput> | undefined,
  fallback: CustoMaquinaInput,
): CustoMaquinaInput {
  return { ...fallback, ...raw, tarifaKwh: raw?.tarifaKwh ?? null };
}

/** Compatibilidade com JSON salvo antes das revisões. */
export function normalizarLinhaProcessoInput(
  raw: Partial<LinhaProcessoIndustrialInput> & { secagemMin?: number },
): LinhaProcessoIndustrialInput {
  const base = { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO, ...raw };
  if (raw.usarEquipesMo == null) base.usarEquipesMo = true;
  if (raw.lavagemUsaMo == null) base.lavagemUsaMo = false;
  if (raw.tarifaKwh == null || !(raw.tarifaKwh > 0)) base.tarifaKwh = 0.75;
  if (raw.secagemSegOperador == null) base.secagemSegOperador = 30;
  if (raw.modoPessoasProcessamento == null) base.modoPessoasProcessamento = "equipe_linha";
  if (raw.pessoasLinhaProcessamento == null) base.pessoasLinhaProcessamento = 1;
  if (raw.preLavagemConsumiveisReaisKg == null) base.preLavagemConsumiveisReaisKg = 0;
  if (raw.enxagueConsumiveisReaisKg == null) base.enxagueConsumiveisReaisKg = 0;
  base.pessoasLinhaProcessamento = pessoasEtapa(base.pessoasLinhaProcessamento);
  base.lavagemMaquina = normalizarMaquina(raw.lavagemMaquina, LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina);
  base.secagemMaquina = normalizarMaquina(raw.secagemMaquina, LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina);
  if (!base.lavagemUsaMo && raw.lavagemMaquina == null) base.lavagemMaquina.ativo = true;
  for (const k of CAMPOS_PESSOAS) {
    base[k] = pessoasEtapa(base[k] as number) as never;
  }
  const regimes: (keyof LinhaProcessoIndustrialInput)[] = [
    "desfolhagemRegimeMo",
    "preLavagemRegimeMo",
    "lavagemRegimeMo",
    "enxagueRegimeMo",
    "secagemRegimeMo",
    "embalagemRegimeMo",
    "selagemRegimeMo",
  ];
  for (const k of regimes) {
    if (base[k] == null) base[k] = "qualquer" as never;
  }
  return base;
}

export type EtapaLinhaBreakdown = {
  nome: string;
  modo: "por_kg" | "por_un";
  temMo: boolean;
  temMaquina: boolean;
  pessoas: number;
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

export type LinhaProcessoIndustrialResult = {
  etapas: EtapaLinhaBreakdown[];
  processamentoReaisKg: number;
  processamentoMoReaisKg: number;
  processamentoMaquinaReaisKg: number;
  processamentoConsumiveisReaisKg: number;
  desfolhagemMinPorUn: number;
  selagemMinPorUn: number;
  embalagemSelagemMinPorUn: number;
  mapaHoraUsado: CustoHoraPorRegime | null;
  alertas: string[];
};

export const LINHA_ETAPA_CAMPO_PESSOAS: Record<string, keyof LinhaProcessoIndustrialInput> = {
  Desfolhagem: "desfolhagemPessoas",
  "Pré-lavagem": "preLavagemPessoas",
  Lavagem: "lavagemPessoas",
  Enxague: "enxaguePessoas",
  "Secagem (abastecimento)": "secagemPessoas",
  Embalagem: "embalagemPessoas",
  Selagem: "selagemPessoas",
};

export const LINHA_ETAPA_CAMPO_REGIME: Record<string, keyof LinhaProcessoIndustrialInput> = {
  Desfolhagem: "desfolhagemRegimeMo",
  "Pré-lavagem": "preLavagemRegimeMo",
  Lavagem: "lavagemRegimeMo",
  Enxague: "enxagueRegimeMo",
  "Secagem (abastecimento)": "secagemRegimeMo",
  Embalagem: "embalagemRegimeMo",
  Selagem: "selagemRegimeMo",
};

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
  | "pessoas"
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

function pessoasMoEtapa(
  input: LinhaProcessoIndustrialInput,
  nomeEtapa: string,
  pessoasEtapaCampo: number,
): number {
  if (
    input.modoPessoasProcessamento === "equipe_linha" &&
    isEtapaLinhaProcessamento(nomeEtapa)
  ) {
    return 1;
  }
  return pessoasEtapa(pessoasEtapaCampo);
}

function aplicarEquipeLinhaProcessamento(
  etapas: EtapaLinhaBreakdown[],
  input: LinhaProcessoIndustrialInput,
): void {
  if (input.modoPessoasProcessamento !== "equipe_linha") return;
  const p = pessoasEtapa(input.pessoasLinhaProcessamento);
  const sufixo = p > 1 ? `${p} operadores na sequência` : "1 operador na sequência";
  for (const e of etapas) {
    if (!isEtapaLinhaProcessamento(e.nome) || !e.temMo) continue;
    if (p > 1) {
      e.moReaisPorKg =
        e.moReaisPorKg != null ? round4(e.moReaisPorKg * p) : e.moReaisPorKg;
      e.minPorKg = e.minPorKg != null ? round4(e.minPorKg * p) : e.minPorKg;
    }
    e.pessoas = p;
    e.reaisPorKg = totalReaisPorKg(e.moReaisPorKg, e.maquinaReaisPorKg, e.consumiveisReaisPorKg);
    e.nota = [e.nota?.split(" · equipe linha")[0] ?? e.nota, `equipe linha · ${sufixo}`]
      .filter(Boolean)
      .join(" · ");
  }
}

function montarEtapaMo(
  base: EtapaBase,
  pessoasRaw: number,
  moValor: number | null,
  notaBase: string | null,
): EtapaLinhaBreakdown {
  const pessoas = pessoasEtapa(pessoasRaw);
  const mult = base.temMo && pessoas > 1 ? pessoas : 1;
  const moKg = base.modo === "por_kg" && moValor != null ? round4(moValor * mult) : null;
  const moUn = base.modo === "por_un" && moValor != null ? round4(moValor * mult) : null;
  const minKg = base.minPorKg != null && base.temMo ? round4(base.minPorKg * mult) : base.minPorKg;
  const minUn = base.minPorUn != null && base.temMo ? round4(base.minPorUn * mult) : base.minPorUn;
  const maqKg = base.maquinaReaisPorKg ?? null;
  const consumKg =
    base.consumiveisReaisPorKg != null && base.consumiveisReaisPorKg > 0
      ? round4(base.consumiveisReaisPorKg)
      : base.consumiveisReaisPorKg === 0
        ? 0
        : null;
  return {
    ...base,
    pessoas: base.temMo ? pessoas : 0,
    minPorKg: minKg,
    minPorUn: minUn,
    moReaisPorKg: moKg,
    moReaisPorUn: moUn,
    maquinaReaisPorKg: maqKg,
    consumiveisReaisPorKg: consumKg,
    reaisPorKg: base.modo === "por_kg" ? totalReaisPorKg(moKg, maqKg, consumKg) : null,
    reaisPorUn: moUn,
    nota:
      pessoas > 1 && base.temMo && base.modo === "por_un"
        ? [notaBase, `${pessoas} pessoas`].filter(Boolean).join(" · ")
        : notaBase,
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
  const hDes = horaMo(input, input.desfolhagemRegimeMo, mapaUsado);
  const desMin = round4((input.desfolhagemSegPorPe / 60) * pes);
  const desfolhagemEtapa = montarEtapaMo(
    {
      nome: "Desfolhagem",
      modo: "por_un",
      temMo: true,
      temMaquina: false,
      regimeMo: input.desfolhagemRegimeMo,
      custoHoraUsado: hDes,
      nota: "Manual",
      minPorKg: null,
      minPorUn: desMin,
      maquinaReaisPorKg: null,
    },
    input.desfolhagemPessoas,
    moPorMin(hDes, desMin),
    "Manual",
  );
  etapas.push(desfolhagemEtapa);

  const preKgH = kgHoraEfetivo(input.preLavagemKgHora, input.preLavagemEficienciaPct);
  if (preKgH == null) {
    alertas.push("Pré-lavagem: informe kg/h e eficiência (%).");
  } else {
    const h = horaMo(input, input.preLavagemRegimeMo, mapaUsado);
    etapas.push(
      montarEtapaMo(
        {
          nome: "Pré-lavagem",
          modo: "por_kg",
          temMo: true,
          temMaquina: false,
          regimeMo: input.preLavagemRegimeMo,
          custoHoraUsado: h,
          nota: "Operador",
          minPorKg: minPorKgDeThroughput(preKgH),
          minPorUn: null,
          maquinaReaisPorKg: null,
          consumiveisReaisPorKg:
            input.preLavagemConsumiveisReaisKg > 0 ? input.preLavagemConsumiveisReaisKg : 0,
        },
        pessoasMoEtapa(input, "Pré-lavagem", input.preLavagemPessoas),
        reaisPorKgDeThroughput(h, preKgH),
        "Operador",
      ),
    );
  }

  const lavKgH = kgHoraEfetivo(input.lavagemKgHora, input.lavagemEficienciaPct);
  const lavMaquinaKg = calcularMaquinaReaisKg(input.lavagemMaquina, input.tarifaKwh, lavKgH);
  if (input.lavagemUsaMo) {
    if (lavKgH == null) {
      alertas.push("Lavagem com operador: informe kg/h e eficiência (%).");
    } else {
      const h = horaMo(input, input.lavagemRegimeMo, mapaUsado);
      const etapaLav = montarEtapaMo(
        {
          nome: "Lavagem",
          modo: "por_kg",
          temMo: true,
          temMaquina: input.lavagemMaquina.ativo,
          regimeMo: input.lavagemRegimeMo,
          custoHoraUsado: h,
          nota: "Operador + máquina",
          minPorKg: minPorKgDeThroughput(lavKgH),
          minPorUn: null,
          maquinaReaisPorKg: lavMaquinaKg > 0 ? lavMaquinaKg : null,
        },
        pessoasMoEtapa(input, "Lavagem", input.lavagemPessoas),
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
      pessoas: 0,
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

  const hEnx = horaMo(input, input.enxagueRegimeMo, mapaUsado);
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
          regimeMo: input.enxagueRegimeMo,
          custoHoraUsado: hEnx,
          nota: "Operador",
          minPorKg: minPorKgDeTempoOperador(input.enxagueSeg, input.enxagueKg),
          minPorUn: null,
          maquinaReaisPorKg: null,
          consumiveisReaisPorKg:
            input.enxagueConsumiveisReaisKg > 0 ? input.enxagueConsumiveisReaisKg : 0,
        },
        pessoasMoEtapa(input, "Enxague", input.enxaguePessoas),
        enxMo,
        "Operador",
      ),
    );
  }

  const hSec = horaMo(input, input.secagemRegimeMo, mapaUsado);
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
        regimeMo: input.secagemRegimeMo,
        custoHoraUsado: hSec,
        nota: "Operador abastecendo + ciclo centrífuga",
        minPorKg: minPorKgDeTempoOperador(input.secagemSegOperador, input.secagemKg),
        minPorUn: null,
        maquinaReaisPorKg: secMaq > 0 ? secMaq : null,
      },
      pessoasMoEtapa(input, "Secagem (abastecimento)", input.secagemPessoas),
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
  const hEmb = horaMo(input, input.embalagemRegimeMo, mapaUsado);
  const embalagemEtapa = montarEtapaMo(
    {
      nome: "Embalagem",
      modo: "por_un",
      temMo: true,
      temMaquina: false,
      regimeMo: input.embalagemRegimeMo,
      custoHoraUsado: hEmb,
      nota: "Manual",
      minPorKg: null,
      minPorUn: round4(input.embalagemMinPorUn),
      maquinaReaisPorKg: null,
    },
    input.embalagemPessoas,
    moPorMin(hEmb, input.embalagemMinPorUn),
    "Manual",
  );
  etapas.push(embalagemEtapa);

  const hSel = horaMo(input, input.selagemRegimeMo, mapaUsado);
  const selagemEtapa = montarEtapaMo(
    {
      nome: "Selagem",
      modo: "por_un",
      temMo: true,
      temMaquina: false,
      regimeMo: input.selagemRegimeMo,
      custoHoraUsado: hSel,
      nota: "Manual",
      minPorKg: null,
      minPorUn: selagemMinBase,
      maquinaReaisPorKg: null,
    },
    input.selagemPessoas,
    moPorMin(hSel, selagemMinBase),
    "Manual",
  );
  etapas.push(selagemEtapa);

  aplicarEquipeLinhaProcessamento(etapas, input);

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
