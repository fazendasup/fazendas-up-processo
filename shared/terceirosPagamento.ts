/**
 * Prestação de serviços de terceiros — pagamento por hora.
 *
 * Valor/hora = R$ 90 ÷ 8.
 * Horas pagas = tempo presente − 1h de refeição quando a jornada cobre o intervalo.
 * Almoço na empresa (11h–13h): desconta 1h e não paga os R$ 25.
 * Fora desse horário, se a jornada cobre a janta (18h–20h): desconta 1h,
 * porque o intervalo é cumprido, e mantém os R$ 25 — a pessoa traz a janta.
 * + R$ 10 vale-transporte por dia (um registro = um VT, mesmo em jornada noturna).
 * + R$ 25 alimentação se não almoçou na empresa e esteve pelo menos 6h.
 *   Abaixo de 6h conta só a hora (e o VT).
 *
 * Jornada que cruza meia-noite: saída menor que entrada (ex.: 18:00 → 08:00)
 * conta como um único dia (data da entrada), com um VT e uma alimentação.
 */

export const TERCEIROS_DIARIA_BASE = 90;
export const TERCEIROS_VALE_TRANSPORTE = 10;
export const TERCEIROS_ALIMENTACAO = 25;
/** Abaixo disto não há vale refeição — só hora (e VT). */
export const TERCEIROS_HORAS_MIN_ALIMENTACAO = 6;
export const TERCEIROS_HORAS_JORNADA = 8;
export const TERCEIROS_HORAS_ALMOCO = 1;
/** Entrada estritamente antes deste horário para considerar almoço na empresa. */
export const TERCEIROS_ALMOCO_ENTRADA_ANTES_MIN = 11 * 60;
/** Saída estritamente depois deste horário (mesmo dia) para descontar almoço. */
export const TERCEIROS_ALMOCO_SAIDA_DEPOIS_MIN = 13 * 60;
/** Entrada antes das 18h e saída depois das 20h: desconta 1h de janta. */
export const TERCEIROS_JANTA_ENTRADA_ANTES_MIN = 18 * 60;
/** Saída estritamente depois das 20h (mesmo dia) para descontar a janta. */
export const TERCEIROS_JANTA_SAIDA_DEPOIS_MIN = 20 * 60;
/** R$ 90 / 8 — usado para qualquer quantidade de horas (a menos ou a mais). */
export const TERCEIROS_VALOR_HORA =
  TERCEIROS_DIARIA_BASE / TERCEIROS_HORAS_JORNADA;
/** @deprecated use TERCEIROS_VALOR_HORA */
export const TERCEIROS_VALOR_HORA_EXTRA = TERCEIROS_VALOR_HORA;

/** Normaliza CPF para só dígitos. */
export function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/** Máscara visual 000.000.000-00 (não valida). */
export function formatarCpf(cpf: string): string {
  const d = normalizarCpf(cpf).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Validação de CPF (dígitos verificadores). */
export function validarCpf(cpf: string): boolean {
  const d = normalizarCpf(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factor - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(d.slice(0, 9), 10);
  const d2 = calc(d.slice(0, 10), 11);
  return d1 === Number(d[9]) && d2 === Number(d[10]);
}

/**
 * Máscara enquanto a pessoa digita a hora (24h).
 * "0730" vira "07:30". Não abre o relógio do celular.
 */
export function mascaraHoraDigitada(raw: string): string {
  if (raw.includes(":")) {
    const [hRaw, mRaw = ""] = raw.split(":");
    const hh = hRaw.replace(/\D/g, "").slice(0, 2);
    const mm = mRaw.replace(/\D/g, "").slice(0, 2);
    if (raw.endsWith(":") || mm.length > 0) {
      return mm.length ? `${hh}:${mm}` : `${hh}:`;
    }
    return hh;
  }
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** "7:30" ou "0730" já mascarado → "07:30". Null se inválido. */
export function normalizarHora24h(raw: string): string | null {
  const min = horaParaMinutos(raw);
  if (min == null) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:mm" ou "HH:mm:ss" → minutos desde 00:00. */
export function horaParaMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** True quando saída é no dia seguinte (hora de saída &lt; hora de entrada). */
export function jornadaCruzaMeiaNoite(
  horaEntrada: string,
  horaSaida: string,
): boolean {
  const ent = horaParaMinutos(horaEntrada);
  const sai = horaParaMinutos(horaSaida);
  if (ent == null || sai == null) return false;
  return sai < ent;
}

/**
 * Data civil da saída (AAAA-MM-DD), a partir da data do serviço (entrada).
 * Se a jornada cruza meia-noite, retorna o dia seguinte.
 */
export function dataSaidaServico(
  dataServico: string,
  horaEntrada: string,
  horaSaida: string,
): string {
  if (!jornadaCruzaMeiaNoite(horaEntrada, horaSaida)) return dataServico;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataServico.trim());
  if (!m) return dataServico;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type PagamentoDiaTerceiro = {
  minutosPresente: number;
  /** Tempo no local (entrada → saída; pode cruzar meia-noite). */
  horasPresente: number;
  /** Saída no dia civil seguinte à data do serviço. */
  cruzaMeiaNoite: boolean;
  /** Cobriu 11h–13h → almoço na empresa (1h não remunerada, sem R$ 25). */
  almocouNaEmpresa: boolean;
  /** Cobriu 18h–20h fora do almoço da empresa: 1h de janta, com os R$ 25. */
  jantou: boolean;
  /** true se o admin forçou o flag de almoço (não veio só do horário). */
  almocouNaEmpresaManual: boolean;
  /** Horas remuneradas (presente − almoço se couber). */
  horasTrabalhadas: number;
  /** max(0, horasTrabalhadas − 8) — só informativo. */
  horasExtras: number;
  /** horasTrabalhadas × (90/8). */
  valorHoras: number;
  valorValeTransporte: number;
  /** 0 se almoçou na empresa ou esteve menos de 6h; senão R$ 25. */
  valorAlimentacao: number;
  valorTotal: number;
};

/**
 * Calcula o pagamento de um dia (tudo proporcional por hora).
 * Retorna null se horários inválidos ou entrada = saída.
 * Se saída &lt; entrada, interpreta como jornada noturna (saída no dia seguinte).
 *
 * @param diariaBase — diária combinada para 8h (padrão {@link TERCEIROS_DIARIA_BASE}).
 * @param almocouNaEmpresaOverride — null/undefined = automático pelo horário;
 *   true = desconta o almoço deste dia (desconta 1h, sem R$ 25);
 *   false = não desconta a hora (vale R$ 25 só se trabalhou pelo menos 6h).
 */
export function calcularPagamentoDiaTerceiro(input: {
  horaEntrada: string;
  horaSaida: string;
  diariaBase?: number | null;
  almocouNaEmpresaOverride?: boolean | null;
}): PagamentoDiaTerceiro | null {
  const ent = horaParaMinutos(input.horaEntrada);
  const sai = horaParaMinutos(input.horaSaida);
  if (ent == null || sai == null) return null;
  if (sai === ent) return null;

  const diaria =
    input.diariaBase != null &&
    Number.isFinite(input.diariaBase) &&
    input.diariaBase > 0
      ? input.diariaBase
      : TERCEIROS_DIARIA_BASE;
  const valorHora = diaria / TERCEIROS_HORAS_JORNADA;

  const cruzaMeiaNoite = sai < ent;
  const minutosPresente = cruzaMeiaNoite
    ? 24 * 60 - ent + sai
    : sai - ent;
  const horasPresente = round2(minutosPresente / 60);
  // Almoço na empresa: entrou antes das 11h e (saiu depois das 13h ou cruzou meia-noite).
  const almocouAuto =
    ent < TERCEIROS_ALMOCO_ENTRADA_ANTES_MIN &&
    (cruzaMeiaNoite || sai > TERCEIROS_ALMOCO_SAIDA_DEPOIS_MIN);
  // Janta: a hora é cumprida, mas a pessoa traz a refeição (mantém os R$ 25).
  // No mesmo dia, entrada antes das 18h e saída depois das 20h.
  // Na virada do dia, só se começou antes das 20h — depois disso a janta já passou.
  const jantouAuto =
    !almocouAuto &&
    (cruzaMeiaNoite
      ? ent < TERCEIROS_JANTA_SAIDA_DEPOIS_MIN
      : ent < TERCEIROS_JANTA_ENTRADA_ANTES_MIN &&
        sai > TERCEIROS_JANTA_SAIDA_DEPOIS_MIN);
  const almocouNaEmpresaManual =
    input.almocouNaEmpresaOverride === true ||
    input.almocouNaEmpresaOverride === false;
  const almocouNaEmpresa = almocouNaEmpresaManual
    ? Boolean(input.almocouNaEmpresaOverride)
    : almocouAuto;
  const jantou = almocouNaEmpresaManual ? false : jantouAuto;
  const descontoRefeicaoHoras =
    almocouNaEmpresa || jantou
      ? Math.min(TERCEIROS_HORAS_ALMOCO, horasPresente)
      : 0;
  const horasTrabalhadas = round2(
    Math.max(0, horasPresente - descontoRefeicaoHoras),
  );
  const horasExtras = round2(
    Math.max(0, horasTrabalhadas - TERCEIROS_HORAS_JORNADA),
  );
  const valorHoras = round2(horasTrabalhadas * valorHora);
  const valorValeTransporte = TERCEIROS_VALE_TRANSPORTE;
  const horasParaVale = jantou ? horasPresente : horasTrabalhadas;
  const recebeAlimentacao =
    !almocouNaEmpresa &&
    horasParaVale >= TERCEIROS_HORAS_MIN_ALIMENTACAO;
  const valorAlimentacao = recebeAlimentacao ? TERCEIROS_ALIMENTACAO : 0;
  const valorTotal = round2(
    valorHoras + valorValeTransporte + valorAlimentacao,
  );

  return {
    minutosPresente,
    horasPresente,
    cruzaMeiaNoite,
    almocouNaEmpresa,
    jantou,
    almocouNaEmpresaManual,
    horasTrabalhadas,
    horasExtras,
    valorHoras,
    valorValeTransporte,
    valorAlimentacao,
    valorTotal,
  };
}

export function formatarHorasDecimais(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (m === 0) return `${h}h`;
  if (m === 60) return `${h + 1}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
