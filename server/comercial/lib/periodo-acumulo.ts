/**
 * Período de faturamento acumulado dentro do mês civil.
 * Ex.: diasAcumulo=15 → blocos 1–15, 16–30 (e resto do mês).
 */

function ymdLocal(d: Date): { y: number; m: number; day: number } {
  return {
    y: d.getFullYear(),
    m: d.getMonth(),
    day: d.getDate(),
  };
}

function dataLocal(y: number, m: number, day: number): Date {
  return new Date(y, m, day, 12, 0, 0, 0);
}

function diasNoMes(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

export type PeriodoAcumulo = {
  inicio: Date;
  fim: Date;
  /** True se `data` é o último dia civil do bloco. */
  ehUltimoDiaDoPeriodo: boolean;
};

export function periodoAcumuloContendo(
  data: Date,
  diasAcumulo: number | null | undefined,
): PeriodoAcumulo {
  const dias = Math.max(1, Math.floor(diasAcumulo ?? 15));
  const { y, m, day } = ymdLocal(data);
  const maxDia = diasNoMes(y, m);
  const bloco = Math.floor((day - 1) / dias);
  const inicioDay = bloco * dias + 1;
  const fimDay = Math.min(bloco * dias + dias, maxDia);
  const inicio = dataLocal(y, m, inicioDay);
  const fim = dataLocal(y, m, fimDay);
  return {
    inicio,
    fim,
    ehUltimoDiaDoPeriodo: day === fimDay,
  };
}

/** YYYY-MM-DD civil (fuso local do processo). */
export function isoDataCivil(d: Date): string {
  const { y, m, day } = ymdLocal(d);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDiasCivil(d: Date, dias: number): Date {
  const { y, m, day } = ymdLocal(d);
  return dataLocal(y, m, day + dias);
}
