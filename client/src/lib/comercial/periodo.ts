export type PeriodoPreset = "hoje" | "semana" | "mes";

export function intervaloDoPreset(preset: PeriodoPreset): { inicio: Date; fim: Date } {
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);
  const inicio = new Date();

  if (preset === "hoje") {
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim };
  }

  if (preset === "semana") {
    inicio.setDate(fim.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim };
  }

  inicio.setDate(1);
  inicio.setMonth(fim.getMonth());
  inicio.setFullYear(fim.getFullYear());
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fim };
}

export function labelPreset(p: PeriodoPreset) {
  if (p === "hoje") return "Hoje";
  if (p === "semana") return "Últimos 7 dias";
  return "Mês atual";
}
