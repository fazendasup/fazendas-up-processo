/**
 * Prestação de serviços de terceiros — pagamento por hora.
 *
 * Valor/hora = R$ 90 ÷ 8.
 * Horas pagas = tempo presente − pausa (30 min ou 1h). Padrão da pessoa: 1h;
 * o admin pode escolher 30 min no cadastro ou no dia, ou não descontar.
 * Quem está na empresa das 11h às 13h pode almoçar na empresa: nesse caso
 * não recebe os R$ 25. Em qualquer outro horário os R$ 25 ficam.
 * + R$ 10 vale-transporte por dia (um registro = um VT, mesmo em jornada noturna).
 * + R$ 25 alimentação se não almoçou na empresa e esteve pelo menos 6h.
 *   Abaixo de 6h conta só a hora (e o VT). A pausa não tira os R$ 25.
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
/** @deprecated use TERCEIROS_PAUSA_MINUTOS_1H — mantido para compat. */
export const TERCEIROS_HORAS_ALMOCO = 1;
export const TERCEIROS_PAUSA_MINUTOS_30 = 30;
export const TERCEIROS_PAUSA_MINUTOS_1H = 60;
/** Pausa padrão quando o prestador não tem preferência. */
export const TERCEIROS_PAUSA_MINUTOS_PADRAO = TERCEIROS_PAUSA_MINUTOS_1H;
/** Entrada estritamente antes deste horário para considerar almoço na empresa. */
export const TERCEIROS_ALMOCO_ENTRADA_ANTES_MIN = 11 * 60;
/** Saída estritamente depois deste horário (mesmo dia) para considerar almoço na empresa. */
export const TERCEIROS_ALMOCO_SAIDA_DEPOIS_MIN = 13 * 60;
/** R$ 90 / 8 — usado para qualquer quantidade de horas (a menos ou a mais). */
export const TERCEIROS_VALOR_HORA =
  TERCEIROS_DIARIA_BASE / TERCEIROS_HORAS_JORNADA;
/** @deprecated use TERCEIROS_VALOR_HORA */
export const TERCEIROS_VALOR_HORA_EXTRA = TERCEIROS_VALOR_HORA;

export type TerceirosPausaMinutos = 30 | 60;

/** Normaliza minutos de pausa do cadastro (só 30 ou 60). */
export function normalizarPausaMinutos(
  v: number | null | undefined,
): TerceirosPausaMinutos {
  return v === TERCEIROS_PAUSA_MINUTOS_30
    ? TERCEIROS_PAUSA_MINUTOS_30
    : TERCEIROS_PAUSA_MINUTOS_1H;
}

/**
 * Minutos descontados no dia.
 * Override do dia (0 / 30 / 60) vence; senão boolean legado; senão padrão da pessoa.
 */
export function resolverMinutosDescanso(input: {
  pausaMinutosPadrao?: number | null;
  /** null = padrão da pessoa; 0 = não descontar; 30 | 60 = forçar. */
  minutosDescansoOverride?: number | null;
  /** Legado: false = 0; true = 60; null = padrão. */
  descontaDescansoOverride?: boolean | null;
}): number {
  const ov = input.minutosDescansoOverride;
  if (ov === 0 || ov === 30 || ov === 60) return ov;
  if (input.descontaDescansoOverride === false) return 0;
  if (input.descontaDescansoOverride === true) return TERCEIROS_PAUSA_MINUTOS_1H;
  return normalizarPausaMinutos(input.pausaMinutosPadrao);
}

export function rotuloPausaMinutos(minutos: number): string {
  if (minutos <= 0) return "sem pausa";
  if (minutos === 30) return "30 min";
  if (minutos === 60) return "1h";
  return `${minutos} min`;
}

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
 * A pessoa estava na empresa no intervalo do almoço:
 * entrou antes das 11h e saiu depois das 13h (ou a jornada cruza a meia-noite).
 * Nesse caso o almoço na empresa é descontado, salvo marcação em contrário.
 */
export function horarioNaRegraAlmocoEmpresa(
  horaEntrada: string,
  horaSaida: string,
): boolean {
  const ent = horaParaMinutos(horaEntrada);
  const sai = horaParaMinutos(horaSaida);
  if (ent == null || sai == null || sai === ent) return false;
  const cruzaMeiaNoite = sai < ent;
  return (
    ent < TERCEIROS_ALMOCO_ENTRADA_ANTES_MIN &&
    (cruzaMeiaNoite || sai > TERCEIROS_ALMOCO_SAIDA_DEPOIS_MIN)
  );
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
  /** Almoço na empresa: não paga os R$ 25. */
  almocouNaEmpresa: boolean;
  /** true se o admin definiu o almoço (não veio só do horário 11h–13h). */
  almocouNaEmpresaManual: boolean;
  /** Pausa não remunerada aplicada (minutos &gt; 0). */
  descontaDescanso: boolean;
  /** true se o admin definiu a pausa neste dia. */
  descontaDescansoManual: boolean;
  /** Minutos de pausa descontados (0, 30 ou 60). */
  minutosDescanso: number;
  /** Horas remuneradas (presente − pausa). */
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
 * @param almocouNaEmpresaOverride — null = automático (11h–13h);
 *   true = almoçou na empresa (sem R$ 25); false = não almoçou (mantém os R$ 25).
 * @param pausaMinutosPadrao — 30 ou 60 (cadastro do prestador); padrão 60.
 * @param minutosDescansoOverride — null = padrão; 0 = não descontar; 30 | 60 = forçar.
 * @param descontaDescansoOverride — legado: null/true/false (usado se minutos não veio).
 */
export function calcularPagamentoDiaTerceiro(input: {
  horaEntrada: string;
  horaSaida: string;
  diariaBase?: number | null;
  almocouNaEmpresaOverride?: boolean | null;
  pausaMinutosPadrao?: number | null;
  minutosDescansoOverride?: number | null;
  descontaDescansoOverride?: boolean | null;
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
  const almocouAuto = horarioNaRegraAlmocoEmpresa(
    input.horaEntrada,
    input.horaSaida,
  );
  const almocouNaEmpresaManual =
    input.almocouNaEmpresaOverride === true ||
    input.almocouNaEmpresaOverride === false;
  const almocouNaEmpresa = almocouNaEmpresaManual
    ? Boolean(input.almocouNaEmpresaOverride)
    : almocouAuto;

  const minutosDescansoRaw = resolverMinutosDescanso({
    pausaMinutosPadrao: input.pausaMinutosPadrao,
    minutosDescansoOverride: input.minutosDescansoOverride,
    descontaDescansoOverride: input.descontaDescansoOverride,
  });
  const descontaDescansoManual =
    input.minutosDescansoOverride === 0 ||
    input.minutosDescansoOverride === 30 ||
    input.minutosDescansoOverride === 60 ||
    input.descontaDescansoOverride === true ||
    input.descontaDescansoOverride === false;
  const horasDescanso = minutosDescansoRaw / 60;
  const descontoRefeicaoHoras = Math.min(horasDescanso, horasPresente);
  const minutosDescanso = round2(descontoRefeicaoHoras * 60);
  const descontaDescanso = minutosDescanso > 0;
  const horasTrabalhadas = round2(
    Math.max(0, horasPresente - descontoRefeicaoHoras),
  );
  const horasExtras = round2(
    Math.max(0, horasTrabalhadas - TERCEIROS_HORAS_JORNADA),
  );
  const valorHoras = round2(horasTrabalhadas * valorHora);
  const valorValeTransporte = TERCEIROS_VALE_TRANSPORTE;
  const recebeAlimentacao =
    !almocouNaEmpresa &&
    horasPresente >= TERCEIROS_HORAS_MIN_ALIMENTACAO;
  const valorAlimentacao = recebeAlimentacao ? TERCEIROS_ALIMENTACAO : 0;
  const valorTotal = round2(
    valorHoras + valorValeTransporte + valorAlimentacao,
  );

  return {
    minutosPresente,
    horasPresente,
    cruzaMeiaNoite,
    almocouNaEmpresa,
    almocouNaEmpresaManual,
    descontaDescanso,
    descontaDescansoManual,
    minutosDescanso,
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
