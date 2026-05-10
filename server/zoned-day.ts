/**
 * Datas “de operação” no fuso da fazenda (não no TZ do processo Node / Docker).
 * Evita tarefas duplicadas quando o servidor está em UTC e o usuário em America/*.
 */

const WEEKDAY_SHORT_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Valida IANA; se inválido, cai no padrão. */
export function resolveIanaTimeZone(raw: string | undefined, fallback: string): string {
  const tz = (raw ?? "").trim() || fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return fallback;
  }
}

/** yyyy-mm-dd no relógio de parede em `timeZone`. */
export function ymdInTimeZone(d: Date | string, timeZone: string): string {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(x);
}

/** Instante UTC em que o relógio em `timeZone` marca 00:00:00 no dia `ymd` (yyyy-mm-dd). */
export function startOfYmdInTimeZone(ymd: string, timeZone: string): Date {
  const parts = ymd.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  if (!y || !m || !d) throw new Error(`Invalid ymd: ${ymd}`);

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const readDate = (t: number) => {
    const p = Object.fromEntries(
      dateFmt.formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]),
    ) as { year: number; month: number; day: number };
    return { y: p.year, mo: p.month, da: p.day };
  };
  const readTime = (t: number) => {
    const p = Object.fromEntries(
      timeFmt.formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]),
    ) as { hour: number; minute: number; second: number };
    return { hh: p.hour, mi: p.minute, ss: p.second };
  };

  let t = Date.UTC(y, m - 1, d, 12, 0, 0);
  for (let i = 0; i < 48; i++) {
    const rd = readDate(t);
    const rt = readTime(t);
    if (rd.y === y && rd.mo === m && rd.da === d) {
      if (rt.hh === 0 && rt.mi === 0 && rt.ss === 0) return new Date(t);
      t -= (rt.hh * 3600 + rt.mi * 60 + rt.ss) * 1000;
    } else {
      const tn = rd.y * 10000 + rd.mo * 100 + rd.da;
      const want = y * 10000 + m * 100 + d;
      t += (tn < want ? 1 : -1) * 3600 * 1000;
    }
  }
  throw new Error(`Could not resolve midnight for ${ymd} in ${timeZone}`);
}

/** Início do dia civil de `ref` em `timeZone`. */
export function zonedStartOfDay(ref: Date, timeZone: string): Date {
  return startOfYmdInTimeZone(ymdInTimeZone(ref, timeZone), timeZone);
}

/** 0 = domingo … 6 = sábado, no calendário de `timeZone` na data de `ref`. */
export function zonedDayOfWeek(ref: Date, timeZone: string): number {
  const midnight = zonedStartOfDay(ref, timeZone);
  const w = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(midnight);
  return WEEKDAY_SHORT_TO_DOW[w] ?? 0;
}
