export type PeriodoPreset =
  | "semana_atual"
  | "mes_atual"
  | "todo_periodo"
  | "ultimos_12_meses"
  | "personalizado";

export type IntervaloPeriodo = { inicio: Date; fim: Date };

const INICIO_HISTORICO = new Date("2000-01-01T00:00:00-03:00");

function fimDoDia(d: Date): Date {
  const f = new Date(d);
  f.setHours(23, 59, 59, 999);
  return f;
}

function inicioDoDia(d: Date): Date {
  const i = new Date(d);
  i.setHours(0, 0, 0, 0);
  return i;
}

/** Segunda-feira da semana civil corrente (horário local). */
function inicioSemanaAtual(ref: Date): Date {
  const d = inicioDoDia(ref);
  const dow = d.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function intervaloDoPreset(
  preset: PeriodoPreset,
  custom?: { inicio: string; fim: string },
): IntervaloPeriodo {
  const agora = new Date();
  const fim = fimDoDia(agora);

  if (preset === "personalizado" && custom?.inicio && custom?.fim) {
    const inicio = inicioDoDia(new Date(`${custom.inicio}T12:00:00`));
    const fimCustom = fimDoDia(new Date(`${custom.fim}T12:00:00`));
    if (inicio.getTime() > fimCustom.getTime()) {
      return { inicio: fimCustom, fim: inicio };
    }
    return { inicio, fim: fimCustom };
  }

  if (preset === "todo_periodo") {
    return { inicio: INICIO_HISTORICO, fim };
  }

  if (preset === "ultimos_12_meses") {
    const inicio = new Date(fim);
    inicio.setMonth(inicio.getMonth() - 12);
    return { inicio: inicioDoDia(inicio), fim };
  }

  if (preset === "semana_atual") {
    return { inicio: inicioSemanaAtual(agora), fim };
  }

  const inicio = new Date(fim);
  inicio.setDate(1);
  return { inicio: inicioDoDia(inicio), fim };
}

export function labelPreset(p: PeriodoPreset, custom?: { inicio: string; fim: string }): string {
  if (p === "semana_atual") return "Esta semana";
  if (p === "mes_atual") return "Este mês";
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
