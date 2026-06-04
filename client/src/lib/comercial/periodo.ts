export type PeriodoPreset =
  | "semana_atual"
  | "mes_atual"
  | "ano_atual"
  | "todo_periodo"
  | "ultimos_12_meses"
  | "personalizado";

import {
  diaIsoAmericaSp,
  fimDiaAmericaSp,
  fimMesAteHojeAmericaSp,
  inicioDiaAmericaSp,
  inicioMesAmericaSp,
} from "@shared/comercial/periodo-america-sp";

export type IntervaloPeriodo = { inicio: Date; fim: Date };

const INICIO_HISTORICO = new Date("2000-01-01T00:00:00-03:00");

/** Segunda-feira da semana civil corrente (calendário America/Sao_Paulo). */
function inicioSemanaAtualSp(ref: Date): Date {
  const hoje = diaIsoAmericaSp(ref);
  const d = new Date(`${hoje}T12:00:00-03:00`);
  const dow = d.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - diff);
  return inicioDiaAmericaSp(diaIsoAmericaSp(d));
}

export function intervaloDoPreset(
  preset: PeriodoPreset,
  custom?: { inicio: string; fim: string },
): IntervaloPeriodo {
  const agora = new Date();
  const fim = fimMesAteHojeAmericaSp(agora);

  if (preset === "personalizado" && custom?.inicio && custom?.fim) {
    const inicio = inicioDiaAmericaSp(custom.inicio);
    const fimCustom = fimDiaAmericaSp(custom.fim);
    if (inicio.getTime() > fimCustom.getTime()) {
      return { inicio: fimCustom, fim: inicio };
    }
    return { inicio, fim: fimCustom };
  }

  if (preset === "todo_periodo") {
    return { inicio: INICIO_HISTORICO, fim };
  }

  if (preset === "ultimos_12_meses") {
    const fimDia = diaIsoAmericaSp(agora);
    const [y, m] = fimDia.split("-").map(Number);
    let mesInicio = m - 11;
    let anoInicio = y;
    while (mesInicio <= 0) {
      mesInicio += 12;
      anoInicio -= 1;
    }
    return { inicio: inicioDiaAmericaSp(`${anoInicio}-${String(mesInicio).padStart(2, "0")}-01`), fim };
  }

  if (preset === "semana_atual") {
    return { inicio: inicioSemanaAtualSp(agora), fim };
  }

  if (preset === "ano_atual") {
    const hoje = diaIsoAmericaSp(agora);
    const [ano] = hoje.split("-").map(Number);
    return { inicio: inicioDiaAmericaSp(`${ano}-01-01`), fim };
  }

  return { inicio: inicioMesAmericaSp(agora), fim };
}

export function labelPreset(p: PeriodoPreset, custom?: { inicio: string; fim: string }): string {
  if (p === "semana_atual") return "Esta semana";
  if (p === "mes_atual") return "Este mês";
  if (p === "ano_atual") return "Este ano";
  if (p === "todo_periodo") return "Todo o período";
  if (p === "ultimos_12_meses") return "Últimos 12 meses";
  if (p === "personalizado" && custom?.inicio && custom?.fim) {
    const fmt = (iso: string) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    return `${fmt(custom.inicio)} — ${fmt(custom.fim)}`;
  }
  return "Período personalizado";
}

export function hojeIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
