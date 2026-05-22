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
