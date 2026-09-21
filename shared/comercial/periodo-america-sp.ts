/** Limites de período no calendário America/Sao_Paulo (alinhado ao relatório Conta Azul). */

export function diaIsoAmericaSp(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function mesIsoAmericaSp(d: Date = new Date()): string {
  return diaIsoAmericaSp(d).slice(0, 7);
}

export function inicioDiaAmericaSp(isoDia: string): Date {
  return new Date(`${isoDia}T00:00:00-03:00`);
}

export function fimDiaAmericaSp(isoDia: string): Date {
  return new Date(`${isoDia}T23:59:59.999-03:00`);
}

export function inicioMesAmericaSp(ref: Date = new Date()): Date {
  const mes = mesIsoAmericaSp(ref);
  return inicioDiaAmericaSp(`${mes}-01`);
}

export function fimMesAteHojeAmericaSp(ref: Date = new Date()): Date {
  return fimDiaAmericaSp(diaIsoAmericaSp(ref));
}

/** Mesmo dia civil no mês anterior (America/Sao_Paulo). 31/mar → 28/fev em ano não bissexto. */
export function diaIsoMesAnterior(isoDia: string): string {
  const [y, m, d] = isoDia.split("-").map(Number);
  let ano = y;
  let mes = m - 1;
  if (mes <= 0) {
    mes = 12;
    ano -= 1;
  }
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(d, ultimoDia);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Intervalo equivalente no mês anterior: mesmos dias de início e fim (calendário SP). */
export function periodoMesAnterior(inicio: Date, fim: Date): { inicio: Date; fim: Date } {
  const inicioIso = diaIsoAmericaSp(inicio);
  const fimIso = diaIsoAmericaSp(fim);
  return {
    inicio: inicioDiaAmericaSp(diaIsoMesAnterior(inicioIso)),
    fim: fimDiaAmericaSp(diaIsoMesAnterior(fimIso)),
  };
}

/** Meses YYYY-MM cobertos pelo intervalo (calendário America/Sao_Paulo), inclusive. */
export function listarMesesYmEntre(inicio: Date, fim: Date): string[] {
  const start = mesIsoAmericaSp(inicio);
  const end = mesIsoAmericaSp(fim);
  if (start > end) return [];
  const out: string[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const yEnd = Number(end.slice(0, 4));
  const mEnd = Number(end.slice(5, 7));
  while (y < yEnd || (y === yEnd && m <= mEnd)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** N meses civis imediatamente após `mesYm` (ex.: 2025-08 + 3 → 2025-09..11). */
export function listarMesesProjecaoAFrente(mesYm: string, nMeses: number): string[] {
  const n = Math.min(Math.max(Math.floor(nMeses), 0), 24);
  if (n <= 0 || !/^\d{4}-\d{2}$/.test(mesYm)) return [];
  let y = Number(mesYm.slice(0, 4));
  let m = Number(mesYm.slice(5, 7));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

/** Rótulo curto pt-BR: "set/2025". */
export function labelMesYmCurto(mesYm: string): string {
  if (!/^\d{4}-\d{2}$/.test(mesYm)) return mesYm;
  const [y, m] = mesYm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const mes = d
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .replace(".", "")
    .toLowerCase();
  return `${mes}/${y}`;
}
