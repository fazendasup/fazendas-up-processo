/**
 * Prestação de serviços de terceiros — pagamento por hora.
 *
 * Valor/hora = R$ 90 ÷ 8.
 * Horas pagas = tempo presente − 1h de almoço somente se a jornada cobre o
 * intervalo de almoço: entrada antes das 11:00 e saída depois das 13:00
 * (em jornada noturna: entrada antes das 11:00, pois cruza o almoço do 1º dia).
 * + R$ 10 vale-transporte por dia (um registro = um VT, mesmo em jornada noturna).
 * + R$ 25 alimentação se NÃO almoçou na empresa.
 *
 * Jornada que cruza meia-noite: saída menor que entrada (ex.: 18:00 → 08:00)
 * conta como um único dia (data da entrada), com um VT e uma alimentação.
 */

export const TERCEIROS_DIARIA_BASE = 90;
export const TERCEIROS_VALE_TRANSPORTE = 10;
export const TERCEIROS_ALIMENTACAO = 25;
export const TERCEIROS_HORAS_JORNADA = 8;
export const TERCEIROS_HORAS_ALMOCO = 1;
/** Entrada estritamente antes deste horário para considerar almoço na empresa. */
export const TERCEIROS_ALMOCO_ENTRADA_ANTES_MIN = 11 * 60;
/** Saída estritamente depois deste horário (mesmo dia) para descontar almoço. */
export const TERCEIROS_ALMOCO_SAIDA_DEPOIS_MIN = 13 * 60;
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
  /** Cobriu 11h–13h → almoço na empresa (1h não remunerada). */
  almocouNaEmpresa: boolean;
  /** Horas remuneradas (presente − almoço se couber). */
  horasTrabalhadas: number;
  /** max(0, horasTrabalhadas − 8) — só informativo. */
  horasExtras: number;
  /** horasTrabalhadas × (90/8). */
  valorHoras: number;
  valorValeTransporte: number;
  /** 0 se almoçou na empresa; senão R$ 25. */
  valorAlimentacao: number;
  valorTotal: number;
};

/**
 * Calcula o pagamento de um dia (tudo proporcional por hora).
 * Retorna null se horários inválidos ou entrada = saída.
 * Se saída &lt; entrada, interpreta como jornada noturna (saída no dia seguinte).
 */
export function calcularPagamentoDiaTerceiro(input: {
  horaEntrada: string;
  horaSaida: string;
}): PagamentoDiaTerceiro | null {
  const ent = horaParaMinutos(input.horaEntrada);
  const sai = horaParaMinutos(input.horaSaida);
  if (ent == null || sai == null) return null;
  if (sai === ent) return null;

  const cruzaMeiaNoite = sai < ent;
  const minutosPresente = cruzaMeiaNoite
    ? 24 * 60 - ent + sai
    : sai - ent;
  const horasPresente = round2(minutosPresente / 60);
  // Só desconta almoço se entrou antes das 11h e (saiu depois das 13h ou cruzou meia-noite).
  const almocouNaEmpresa =
    ent < TERCEIROS_ALMOCO_ENTRADA_ANTES_MIN &&
    (cruzaMeiaNoite || sai > TERCEIROS_ALMOCO_SAIDA_DEPOIS_MIN);
  const descontoAlmocoHoras = almocouNaEmpresa
    ? Math.min(TERCEIROS_HORAS_ALMOCO, horasPresente)
    : 0;
  const horasTrabalhadas = round2(
    Math.max(0, horasPresente - descontoAlmocoHoras),
  );
  const horasExtras = round2(
    Math.max(0, horasTrabalhadas - TERCEIROS_HORAS_JORNADA),
  );
  const valorHoras = round2(horasTrabalhadas * TERCEIROS_VALOR_HORA);
  const valorValeTransporte = TERCEIROS_VALE_TRANSPORTE;
  const valorAlimentacao = almocouNaEmpresa ? 0 : TERCEIROS_ALIMENTACAO;
  const valorTotal = round2(
    valorHoras + valorValeTransporte + valorAlimentacao,
  );

  return {
    minutosPresente,
    horasPresente,
    cruzaMeiaNoite,
    almocouNaEmpresa,
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
