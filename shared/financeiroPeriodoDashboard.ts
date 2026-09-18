/**
 * Período do dashboard financeiro (dia / semana / mês / ano).
 * Calendário America/Sao_Paulo.
 */
import {
  diaIsoAmericaSp,
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
  mesIsoAmericaSp,
} from "./comercial/periodo-america-sp";

export const DASHBOARD_GRANULARIDADES = [
  "dia",
  "semana",
  "mes",
  "ano",
] as const;

export type DashboardGranularidade =
  (typeof DASHBOARD_GRANULARIDADES)[number];

export type PeriodoDashboardResolvido = {
  granularidade: DashboardGranularidade;
  /** Referência bruta enviada pela UI. */
  ref: string;
  inicioIso: string;
  fimIso: string;
  inicio: Date;
  fim: Date;
  /**
   * Mês âncora da grade de desembolso / projeções mensais.
   * Dia/semana → mês da ref; ano → mês atual se ano corrente, senão dez/AAAA.
   */
  mesYmAncora: string;
  label: string;
  /** true = caixa e plano usam o mesmo recorte mensal clássico. */
  planoAlinhadoAoPeriodo: boolean;
};

function isoValidoDia(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isoValidoMes(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s);
}

function isoValidoAno(s: string): boolean {
  return /^\d{4}$/.test(s);
}

/** Segunda-feira da semana civil (America/Sao_Paulo) que contém o dia. */
export function inicioSemanaIsoSp(isoDia: string): string {
  const d = new Date(`${isoDia}T12:00:00-03:00`);
  const dow = d.getDay(); // 0=dom
  const diff = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - diff);
  return diaIsoAmericaSp(d);
}

export function fimSemanaIsoSp(isoDia: string): string {
  const seg = inicioSemanaIsoSp(isoDia);
  const d = new Date(`${seg}T12:00:00-03:00`);
  d.setDate(d.getDate() + 6);
  return diaIsoAmericaSp(d);
}

function ultimoDiaDoMes(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return `${ym}-${String(ultimo).padStart(2, "0")}`;
}

function labelPeriodo(
  g: DashboardGranularidade,
  inicioIso: string,
  fimIso: string,
  mesYm: string,
  ano: string,
): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  if (g === "dia") return fmt(inicioIso);
  if (g === "semana") return `${fmt(inicioIso)} – ${fmt(fimIso)}`;
  if (g === "ano") return ano;
  const [y, m] = mesYm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Resolve granularidade + ref → intervalo SP e mês âncora.
 * ref:
 *  - dia/semana: YYYY-MM-DD (qualquer dia da semana)
 *  - mes: YYYY-MM
 *  - ano: YYYY
 */
export function resolverPeriodoDashboard(
  granularidade: DashboardGranularidade,
  ref: string,
  agora: Date = new Date(),
): PeriodoDashboardResolvido {
  const hojeIso = diaIsoAmericaSp(agora);
  const hojeYm = mesIsoAmericaSp(agora);
  const anoHoje = hojeIso.slice(0, 4);

  if (granularidade === "dia") {
    const dia = isoValidoDia(ref) ? ref : hojeIso;
    return {
      granularidade,
      ref: dia,
      inicioIso: dia,
      fimIso: dia,
      inicio: inicioDiaAmericaSp(dia),
      fim: fimDiaAmericaSp(dia),
      mesYmAncora: dia.slice(0, 7),
      label: labelPeriodo("dia", dia, dia, dia.slice(0, 7), dia.slice(0, 4)),
      planoAlinhadoAoPeriodo: false,
    };
  }

  if (granularidade === "semana") {
    const dia = isoValidoDia(ref) ? ref : hojeIso;
    const inicioIso = inicioSemanaIsoSp(dia);
    let fimIso = fimSemanaIsoSp(dia);
    // Semana corrente: caixa até hoje (não inventa futuro).
    if (fimIso > hojeIso) fimIso = hojeIso;
    return {
      granularidade,
      ref: dia,
      inicioIso,
      fimIso,
      inicio: inicioDiaAmericaSp(inicioIso),
      fim: fimDiaAmericaSp(fimIso),
      mesYmAncora: dia.slice(0, 7),
      label: labelPeriodo(
        "semana",
        inicioIso,
        fimIso,
        dia.slice(0, 7),
        dia.slice(0, 4),
      ),
      planoAlinhadoAoPeriodo: false,
    };
  }

  if (granularidade === "ano") {
    const ano = isoValidoAno(ref) ? ref : anoHoje;
    const inicioIso = `${ano}-01-01`;
    let fimIso = `${ano}-12-31`;
    if (ano === anoHoje) fimIso = hojeIso;
    else if (ano > anoHoje) fimIso = hojeIso;
    const mesYmAncora = ano === anoHoje ? hojeYm : `${ano}-12`;
    return {
      granularidade,
      ref: ano,
      inicioIso,
      fimIso,
      inicio: inicioDiaAmericaSp(inicioIso),
      fim: fimDiaAmericaSp(fimIso),
      mesYmAncora,
      label: labelPeriodo("ano", inicioIso, fimIso, mesYmAncora, ano),
      planoAlinhadoAoPeriodo: false,
    };
  }

  // mes — mantém o mês civil inteiro (mesmo contrato Conta Azul de antes)
  const mesYm = isoValidoMes(ref) ? ref : hojeYm;
  const inicioIso = `${mesYm}-01`;
  const fimIso = ultimoDiaDoMes(mesYm);
  return {
    granularidade: "mes",
    ref: mesYm,
    inicioIso,
    fimIso,
    inicio: inicioDiaAmericaSp(inicioIso),
    fim: fimDiaAmericaSp(fimIso),
    mesYmAncora: mesYm,
    label: labelPeriodo("mes", inicioIso, fimIso, mesYm, mesYm.slice(0, 4)),
    planoAlinhadoAoPeriodo: true,
  };
}

export function isDashboardGranularidade(
  v: string,
): v is DashboardGranularidade {
  return (DASHBOARD_GRANULARIDADES as readonly string[]).includes(v);
}

/** ref default conforme granularidade (hoje / mês atual / ano atual). */
export function refDefaultDashboard(
  granularidade: DashboardGranularidade,
  agora: Date = new Date(),
): string {
  const hoje = diaIsoAmericaSp(agora);
  if (granularidade === "dia" || granularidade === "semana") return hoje;
  if (granularidade === "ano") return hoje.slice(0, 4);
  return mesIsoAmericaSp(agora);
}
