/**
 * IDs dos KPIs clicáveis do dashboard financeiro.
 */
export const DASHBOARD_KPI_IDS = [
  "plano",
  "executado",
  "ainda-cabe",
  "nao-planejado",
  "saldo-liberado",
  "saldo-conta-azul",
  "saldo-projetado",
  "entrou",
  "a-receber",
  "em-atraso",
  "proj-vendas",
  "faturado",
  "orcamentos",
  "impostos-atrasados",
] as const;

export type DashboardKpiId = (typeof DASHBOARD_KPI_IDS)[number];

export function isDashboardKpiId(v: string): v is DashboardKpiId {
  return (DASHBOARD_KPI_IDS as readonly string[]).includes(v);
}

export type DashboardKpiLinha = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  valor: number;
  meta: string | null;
  grupo: string | null;
};

export type DashboardKpiDetalhe = {
  kpi: DashboardKpiId;
  titulo: string;
  descricao: string;
  mesYm: string;
  labelMes: string;
  total: number;
  linhas: DashboardKpiLinha[];
};
