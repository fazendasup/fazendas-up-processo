/**
 * Prestação de serviços de terceiros — regras de pagamento da diária.
 *
 * Diária: R$ 90 + R$ 10 vale-transporte + R$ 25 alimentação.
 * Se entra antes das 12h, almoça na empresa → alimentação descontada (R$ 0).
 * Horas extras: além de 8h de trabalho + 1h de almoço (9h presentes se almoçou;
 * 8h se não almoçou), a R$ 90 / 8 por hora.
 */

export const TERCEIROS_DIARIA_BASE = 90;
export const TERCEIROS_VALE_TRANSPORTE = 10;
export const TERCEIROS_ALIMENTACAO = 25;
export const TERCEIROS_HORAS_JORNADA = 8;
export const TERCEIROS_HORAS_ALMOCO = 1;
export const TERCEIROS_VALOR_HORA_EXTRA =
  TERCEIROS_DIARIA_BASE / TERCEIROS_HORAS_JORNADA;

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type PagamentoDiaTerceiro = {
  minutosPresente: number;
  horasPresente: number;
  /** Entrou antes das 12:00 → almoço na empresa. */
  almocouNaEmpresa: boolean;
  /** Limite de presença sem extra (9h com almoço, 8h sem). */
  horasLimiteNormal: number;
  horasExtras: number;
  valorDiaria: number;
  valorValeTransporte: number;
  /** 0 se almoçou na empresa; senão R$ 25. */
  valorAlimentacao: number;
  valorHorasExtras: number;
  valorTotal: number;
};

/**
 * Calcula o pagamento de um dia a partir de entrada/saída.
 * Retorna null se horários inválidos ou saída ≤ entrada.
 */
export function calcularPagamentoDiaTerceiro(input: {
  horaEntrada: string;
  horaSaida: string;
}): PagamentoDiaTerceiro | null {
  const ent = horaParaMinutos(input.horaEntrada);
  const sai = horaParaMinutos(input.horaSaida);
  if (ent == null || sai == null || sai <= ent) return null;

  const minutosPresente = sai - ent;
  const horasPresente = round2(minutosPresente / 60);
  const almocouNaEmpresa = ent < 12 * 60;
  const horasLimiteNormal = almocouNaEmpresa
    ? TERCEIROS_HORAS_JORNADA + TERCEIROS_HORAS_ALMOCO
    : TERCEIROS_HORAS_JORNADA;
  const horasExtras = round2(Math.max(0, horasPresente - horasLimiteNormal));
  const valorDiaria = TERCEIROS_DIARIA_BASE;
  const valorValeTransporte = TERCEIROS_VALE_TRANSPORTE;
  const valorAlimentacao = almocouNaEmpresa ? 0 : TERCEIROS_ALIMENTACAO;
  const valorHorasExtras = round2(horasExtras * TERCEIROS_VALOR_HORA_EXTRA);
  const valorTotal = round2(
    valorDiaria + valorValeTransporte + valorAlimentacao + valorHorasExtras,
  );

  return {
    minutosPresente,
    horasPresente,
    almocouNaEmpresa,
    horasLimiteNormal,
    horasExtras,
    valorDiaria,
    valorValeTransporte,
    valorAlimentacao,
    valorHorasExtras,
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
