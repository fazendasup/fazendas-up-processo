import { useMemo, useState, type ReactNode } from "react";
import { Download, FileBarChart, Info, Search } from "lucide-react";
import {
  AbcChart,
  AbcParetoChart,
  ChartCard,
  ClienteLink,
  DeltaBadge,
  DrillBanner,
  EmptyChart,
  fmtMoney,
  fmtNumber,
  fmtPct,
  fmtVariacao,
  MargemChart,
  MixChart,
  RiscoChart,
  shortLabel,
} from "./RelatoriosSections";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { PeriodoFiltro } from "@/components/comercial/ui/PeriodoFiltro";
import {
  hojeIsoLocal,
  intervaloDoPreset,
  labelPreset,
  type PeriodoPreset,
} from "@/lib/comercial/periodo";
import { trpc } from "@/lib/trpc";

const REPORTS = [
  { id: "vendas-cliente", label: "Vendas por cliente" },
  { id: "cmv", label: "CMV" },
  { id: "clientes-sem-vendas", label: "Clientes sem vendas" },
  { id: "lucro-margem", label: "Lucro e margem" },
  { id: "maiores-clientes", label: "Maiores clientes" },
  { id: "abc-clientes", label: "ABC clientes" },
  { id: "abc-produtos", label: "ABC produtos" },
  { id: "clientes-risco", label: "Clientes em risco" },
  { id: "margem", label: "Margem por cliente" },
  { id: "mix-produtos", label: "Mix e cross-sell" },
  { id: "impostos", label: "Impostos" },
  { id: "clientes", label: "Relação de clientes" },
  { id: "vendas-detalhadas", label: "Vendas detalhadas" },
  { id: "produtos-vendidos", label: "Produtos vendidos" },
  { id: "servicos", label: "Serviços" },
  { id: "contratos", label: "Contratos" },
  { id: "orcamentos", label: "Orçamentos" },
  { id: "financeiro-servico", label: "Financeiro cliente/serviço" },
  { id: "vendas-mes", label: "Vendas por mês" },
  { id: "vendedores", label: "Vendas por vendedor" },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

const CHART_COLORS = [
  "#059669",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
] as const;

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function csvEscape(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] ?? {});
  const body = [
    headers.join(","),
    ...rows.map(row => headers.map(h => csvEscape(row[h])).join(",")),
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rowToSearchText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(rowToSearchText).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(rowToSearchText)
      .join(" ");
  }
  return String(value);
}

function TableFilter({
  value,
  onChange,
  total,
  filtered,
  placeholder = "Filtrar planilha...",
}: {
  value: string;
  onChange: (value: string) => void;
  total: number;
  filtered: number;
  placeholder?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <label className="relative min-w-64 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
        />
      </label>
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {filtered === total
          ? `${fmtNumber(total)} linhas`
          : `${fmtNumber(filtered)} de ${fmtNumber(total)} linhas`}
      </span>
    </div>
  );
}

type ColumnFilterDef<T> = {
  key: string;
  label: string;
  value: (row: T) => unknown;
};

type TotalDef<T> = {
  key: string;
  label: string;
  value: (row: T) => number | null | undefined;
  format?: (value: number) => string;
};

function ColumnFiltersBar<T>({
  reportId,
  filters,
  columns,
  onChange,
  onClear,
}: {
  reportId: string;
  filters: Record<string, Record<string, string>>;
  columns: ColumnFilterDef<T>[];
  onChange: (reportId: string, column: string, value: string) => void;
  onClear: (reportId: string) => void;
}) {
  const current = filters[reportId] ?? {};
  const hasAny = Object.values(current).some(value => value.trim());

  if (!columns.length) return null;

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Filtros por coluna
        </span>
        {hasAny ? (
          <button
            type="button"
            onClick={() => onClear(reportId)}
            className="text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Limpar filtros das colunas
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map(column => (
          <label key={column.key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {column.label}
            <input
              value={current[column.key] ?? ""}
              onChange={e => onChange(reportId, column.key, e.target.value)}
              placeholder={`Filtrar ${column.label.toLowerCase()}`}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function TotalsBar<T>({
  rows,
  totals,
}: {
  rows: T[];
  totals: TotalDef<T>[];
}) {
  if (!totals.length) return null;

  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {totals.map(total => {
        const value = rows.reduce((sum, row) => sum + Number(total.value(row) ?? 0), 0);
        return (
          <div
            key={total.key}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-400/25 dark:bg-emerald-950/20"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Total {total.label}
            </div>
            <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
              {total.format ? total.format(value) : fmtNumber(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Section({
  title,
  description,
  children,
  rows,
}: {
  title: string;
  description: string;
  children: ReactNode;
  rows?: Record<string, unknown>[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
        {rows?.length ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
            onClick={() =>
              exportCsv(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, rows)
            }
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      {children}
    </div>
  );
}

export function Relatorios() {
  const [preset, setPreset] = useState<PeriodoPreset>("mes_atual");
  const [customInicio, setCustomInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customFim, setCustomFim] = useState(hojeIsoLocal);
  const [active, setActive] = useState<ReportId>("vendas-cliente");
  const [metricaCliente, setMetricaCliente] = useState<
    "valorBruto" | "valorLiquido" | "totalVendido" | "ticketMedio"
  >("valorBruto");
  const [metricaMes, setMetricaMes] = useState<
    "valorBruto" | "valorLiquido" | "frete" | "desconto"
  >("valorLiquido");
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({});
  const [columnFilters, setColumnFilters] = useState<
    Record<string, Record<string, string>>
  >({});
  const [drill, setDrill] = useState<{ report: ReportId; value: string } | null>(
    null
  );
  const { inicio, fim } = useMemo(
    () => intervaloDoPreset(preset, { inicio: customInicio, fim: customFim }),
    [preset, customInicio, customFim]
  );
  const q = trpc.comercial.relatorios.resumo.useQuery(
    { inicio, fim },
    { staleTime: 30_000 }
  );
  const data = q.data;

  const topClientesChart = useMemo(
    () =>
      (data?.maioresClientes ?? []).slice(0, 12).map((r: any) => ({
        cliente: shortLabel(r.cliente),
        valor: Number(r[metricaCliente] ?? 0),
      })),
    [data?.maioresClientes, metricaCliente]
  );
  const chartVendasCliente = useMemo(
    () =>
      (data?.vendasPorCliente ?? []).slice(0, 12).map((r: any) => ({
        cliente: shortLabel(r.cliente),
        nome: r.cliente,
        valorBruto: Number(r.valorBruto ?? 0),
        itens: Number(r.quantidadeItens ?? 0),
      })),
    [data?.vendasPorCliente]
  );
  const chartCmv = useMemo(
    () =>
      (data?.cmv.linhas ?? []).slice(0, 12).map((r: any) => ({
        produto: shortLabel(r.produto),
        receita: Number(r.valorBruto ?? 0),
        custo: Number(r.custoTotal ?? 0),
        margem: Number(r.margemLucro ?? 0),
      })),
    [data?.cmv.linhas]
  );
  const chartClientesSemVenda = useMemo(
    () =>
      (data?.clientesSemVendas ?? [])
        .filter((r: any) => r.diasSemVenda != null)
        .slice(0, 15)
        .map((r: any) => ({
          cliente: shortLabel(r.cliente),
          dias: Number(r.diasSemVenda ?? 0),
        })),
    [data?.clientesSemVendas]
  );
  const chartClientesSituacao = useMemo(() => {
    const totals = new Map<string, number>();
    for (const cliente of data?.clientes ?? []) {
      const key = (cliente as any).situacao ?? "Sem situação";
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
    return Array.from(totals.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [data?.clientes]);
  const chartProdutosVendidos = useMemo(
    () =>
      (data?.produtosVendidosDetalhados ?? [])
        .reduce((acc: any[], item: any) => {
          const found = acc.find(row => row.produto === item.produto);
          if (found) {
            found.quantidade += Number(item.quantidade ?? 0);
            found.valorTotal += Number(item.valorTotal ?? 0);
            return acc;
          }
          acc.push({
            produto: item.produto,
            label: shortLabel(item.produto),
            quantidade: Number(item.quantidade ?? 0),
            valorTotal: Number(item.valorTotal ?? 0),
          });
          return acc;
        }, [])
        .sort((a: any, b: any) => b.valorTotal - a.valorTotal)
        .slice(0, 12),
    [data?.produtosVendidosDetalhados]
  );
  const chartVendasDetalhadas = useMemo(
    () =>
      (data?.vendasPorMes ?? []).map((r: any) => ({
        mes: r.mes,
        bruto: Number(r.valorBruto ?? 0),
        liquido: Number(r.valorLiquido ?? 0),
        pedidos: Number(r.vendas ?? 0),
      })),
    [data?.vendasPorMes]
  );
  const chartOrcamentos = useMemo(
    () =>
      (data?.orcamentos ?? [])
        .reduce((acc: any[], item: any) => {
          const status = item.status ?? "Sem status";
          const found = acc.find(row => row.status === status);
          if (found) {
            found.valorBruto += Number(item.valorBruto ?? 0);
            found.quantidade += 1;
            return acc;
          }
          acc.push({
            status,
            valorBruto: Number(item.valorBruto ?? 0),
            quantidade: 1,
          });
          return acc;
        }, [])
        .sort((a: any, b: any) => b.valorBruto - a.valorBruto),
    [data?.orcamentos]
  );
  const chartLucroMargem = useMemo(
    () =>
      (data?.lucroMargemMes ?? []).map((r: any) => ({
        ...r,
        receita: Number(r.valorLiquido ?? r.valorBruto ?? 0),
      })),
    [data?.lucroMargemMes]
  );

  const setTableFilter = (id: string, value: string) => {
    setTableFilters(current => ({ ...current, [id]: value }));
  };
  const setColumnFilter = (id: string, column: string, value: string) => {
    setColumnFilters(current => ({
      ...current,
      [id]: { ...(current[id] ?? {}), [column]: value },
    }));
  };
  const clearColumnFilters = (id: string) => {
    setColumnFilters(current => ({ ...current, [id]: {} }));
  };
  const filterRows = <T,>(id: string, rows: T[]): T[] => {
    const needle = (tableFilters[id] ?? "").trim().toLowerCase();
    const afterGlobal = needle
      ? rows.filter(row =>
          rowToSearchText(row).toLowerCase().includes(needle)
        )
      : rows;
    return filterRowsColumns(
      id,
      afterGlobal,
      (columnsByReport[id] ?? []) as ColumnFilterDef<T>[]
    );
  };
  const filterRowsColumns = <T,>(
    id: string,
    rows: T[],
    columns: ColumnFilterDef<T>[]
  ): T[] => {
    const current = columnFilters[id] ?? {};
    const activeColumns = columns
      .map(column => ({
        ...column,
        needle: (current[column.key] ?? "").trim().toLowerCase(),
      }))
      .filter(column => column.needle);

    if (!activeColumns.length) return rows;

    return rows.filter(row =>
      activeColumns.every(column =>
        rowToSearchText(column.value(row)).toLowerCase().includes(column.needle)
      )
    );
  };
  const filterRowsDrill = <T,>(
    id: ReportId,
    rows: T[],
    match: (row: T) => string,
    columns: ColumnFilterDef<T>[] = []
  ): T[] => {
    let out = filterRows(id, rows);
    if (drill?.report === id && drill.value) {
      const v = drill.value.toLowerCase();
      out = out.filter(row => match(row).toLowerCase() === v);
    }
    return out;
  };
  const setDrillFor = (report: ReportId, value: string) => {
    setDrill({ report, value });
    setActive(report);
  };
  const renderTableFilter = (id: string, total: number, filtered: number) => (
    <>
      <TableFilter
        value={tableFilters[id] ?? ""}
        onChange={value => setTableFilter(id, value)}
        total={total}
        filtered={filtered}
      />
      <ColumnFiltersBar
        reportId={id}
        filters={columnFilters}
        columns={columnsByReport[id] ?? []}
        onChange={setColumnFilter}
        onClear={clearColumnFilters}
      />
      <TotalsBar
        rows={totalRowsByReport[id] ?? []}
        totals={totalsByReport[id] ?? []}
      />
    </>
  );
  const renderColumnFilters = <T,>(
    id: string,
    columns: ColumnFilterDef<T>[]
  ) => (
    <ColumnFiltersBar
      reportId={id}
      filters={columnFilters}
      columns={columns}
      onChange={setColumnFilter}
      onClear={clearColumnFilters}
    />
  );
  const renderTotals = <T,>(rows: T[], totals: TotalDef<T>[]) => (
    <TotalsBar rows={rows} totals={totals} />
  );
  const vendasClienteColumns: ColumnFilterDef<any>[] = [
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "produtos", label: "Produtos", value: r => r.produtos },
    { key: "vendas", label: "Vendas", value: r => r.vendas },
    { key: "valorBruto", label: "Valor bruto", value: r => r.valorBruto },
  ];
  const cmvColumns: ColumnFilterDef<any>[] = [
    { key: "produto", label: "Produto", value: r => r.produto },
    { key: "categoria", label: "Categoria", value: r => r.categoria },
    { key: "valorBruto", label: "Valor bruto", value: r => r.valorBruto },
    { key: "margem", label: "Margem", value: r => fmtPct(r.margemLucro) },
  ];
  const clientesSemVendasColumns: ColumnFilterDef<any>[] = [
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "tipo", label: "Tipo", value: r => r.tipo },
    { key: "situacao", label: "Situação", value: r => r.situacao },
    { key: "dias", label: "Dias", value: r => r.diasSemVenda },
  ];
  const lucroMargemColumns: ColumnFilterDef<any>[] = [
    { key: "mes", label: "Mês", value: r => r.mes },
    { key: "receita", label: "Receita", value: r => r.valorLiquido ?? r.valorBruto },
    { key: "lucro", label: "Lucro", value: r => r.lucroBruto },
    { key: "margem", label: "Margem", value: r => fmtPct(r.margemLucro) },
  ];
  const maioresClientesColumns: ColumnFilterDef<any>[] = [
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "tipo", label: "Tipo", value: r => r.tipoItem },
    { key: "vendas", label: "Vendas", value: r => r.vendas },
    { key: "valorLiquido", label: "Valor líquido", value: r => r.valorLiquido },
  ];
  const abcColumns: ColumnFilterDef<any>[] = [
    { key: "nome", label: "Nome", value: r => r.nome },
    { key: "classe", label: "Classe", value: r => r.classe },
    { key: "valor", label: "Valor", value: r => r.valor },
  ];
  const clientesRiscoColumns: ColumnFilterDef<any>[] = [
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "motivo", label: "Motivo", value: r => r.motivo },
    { key: "score", label: "Score", value: r => r.score },
    { key: "acao", label: "Ação", value: r => r.acaoSugerida },
  ];
  const margemColumns: ColumnFilterDef<any>[] = [
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "receita", label: "Receita", value: r => r.valorLiquido },
    { key: "lucro", label: "Lucro", value: r => r.lucroBruto },
    { key: "margem", label: "Margem", value: r => fmtPct(r.margemLucro) },
  ];
  const mixColumns: ColumnFilterDef<any>[] = [
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "topProdutos", label: "Já compra", value: r => r.topProdutos },
    {
      key: "oportunidades",
      label: "Cross-sell",
      value: r => r.oportunidadesCrossSell,
    },
  ];
  const clientesColumns: ColumnFilterDef<any>[] = [
    { key: "nome", label: "Nome", value: r => r.nome },
    { key: "tipo", label: "Tipo", value: r => r.tipo },
    { key: "situacao", label: "Situação", value: r => r.situacao },
    { key: "contato", label: "Contato", value: r => r.email ?? r.telefone },
  ];
  const vendasDetalhadasColumns: ColumnFilterDef<any>[] = [
    { key: "data", label: "Data", value: r => fmtDate(r.dataVenda) },
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "vendedor", label: "Vendedor", value: r => r.vendedor },
    { key: "status", label: "Status", value: r => r.status },
  ];
  const produtosVendidosColumns: ColumnFilterDef<any>[] = [
    { key: "data", label: "Data", value: r => fmtDate(r.dataVenda) },
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "produto", label: "Produto", value: r => r.produto },
    { key: "tipo", label: "Tipo", value: r => r.tipoItem },
  ];
  const vendasMesColumns: ColumnFilterDef<any>[] = [
    { key: "mes", label: "Mês", value: r => r.mes },
    { key: "vendas", label: "Vendas", value: r => r.vendas },
    { key: "bruto", label: "Bruto", value: r => r.valorBruto },
    { key: "liquido", label: "Líquido", value: r => r.valorLiquido },
  ];
  const orcamentosColumns: ColumnFilterDef<any>[] = [
    { key: "data", label: "Data", value: r => fmtDate(r.dataOrcamento) },
    { key: "cliente", label: "Cliente", value: r => r.cliente },
    { key: "status", label: "Status", value: r => r.status },
    { key: "valor", label: "Valor", value: r => r.valorBruto },
  ];
  const columnsByReport: Record<string, ColumnFilterDef<any>[]> = {
    "vendas-cliente": vendasClienteColumns,
    cmv: cmvColumns,
    "clientes-sem-vendas": clientesSemVendasColumns,
    "lucro-margem": lucroMargemColumns,
    "maiores-clientes": maioresClientesColumns,
    "abc-clientes": abcColumns,
    "abc-produtos": abcColumns,
    "clientes-risco": clientesRiscoColumns,
    margem: margemColumns,
    "mix-produtos": mixColumns,
    clientes: clientesColumns,
    "vendas-detalhadas": vendasDetalhadasColumns,
    "produtos-vendidos": produtosVendidosColumns,
    "vendas-mes": vendasMesColumns,
    orcamentos: orcamentosColumns,
  };
  const totalRowsByReport: Record<string, any[]> = data
    ? {
        "vendas-cliente": filterRowsDrill(
          "vendas-cliente",
          data.vendasPorCliente,
          (r: any) => r.cliente
        ),
        cmv: filterRows("cmv", data.cmv.linhas),
        "clientes-sem-vendas": filterRows(
          "clientes-sem-vendas",
          data.clientesSemVendas
        ),
        "lucro-margem": filterRows("lucro-margem", data.lucroMargemMes),
        "maiores-clientes": filterRows("maiores-clientes", data.maioresClientes),
        "abc-clientes": filterRowsDrill(
          "abc-clientes",
          data.abcClientes ?? [],
          (r: any) => r.nome
        ),
        "abc-produtos": filterRowsDrill(
          "abc-produtos",
          data.abcProdutos ?? [],
          (r: any) => r.nome
        ),
        "clientes-risco": filterRowsDrill(
          "clientes-risco",
          data.clientesRisco ?? [],
          (r: any) => r.cliente
        ),
        margem: filterRowsDrill(
          "margem",
          data.margemPorCliente ?? [],
          (r: any) => r.cliente
        ),
        "mix-produtos": filterRowsDrill(
          "mix-produtos",
          data.mixProdutosCliente ?? [],
          (r: any) => r.cliente
        ),
        clientes: filterRows("clientes", data.clientes),
        "vendas-detalhadas": filterRows(
          "vendas-detalhadas",
          data.vendasDetalhadas
        ),
        "produtos-vendidos": filterRows(
          "produtos-vendidos",
          data.produtosVendidosDetalhados
        ),
        "vendas-mes": filterRows("vendas-mes", data.vendasPorMes),
        orcamentos: filterRows("orcamentos", data.orcamentos),
      }
    : {};
  const totalsByReport: Record<string, TotalDef<any>[]> = {
    "vendas-cliente": [
      { key: "vendas", label: "vendas", value: r => r.vendas },
      { key: "itens", label: "itens", value: r => r.quantidadeItens },
      {
        key: "valorBruto",
        label: "valor bruto",
        value: r => r.valorBruto,
        format: fmtMoney,
      },
    ],
    cmv: [
      { key: "quantidade", label: "quantidade", value: r => r.quantidade },
      {
        key: "custoTotal",
        label: "custo",
        value: r => r.custoTotal,
        format: fmtMoney,
      },
      {
        key: "valorBruto",
        label: "valor bruto",
        value: r => r.valorBruto,
        format: fmtMoney,
      },
    ],
    "clientes-sem-vendas": [
      { key: "clientes", label: "clientes", value: () => 1 },
      { key: "dias", label: "dias sem venda", value: r => r.diasSemVenda },
    ],
    "lucro-margem": [
      {
        key: "receita",
        label: "receita",
        value: r => r.valorLiquido ?? r.valorBruto,
        format: fmtMoney,
      },
      {
        key: "cmv",
        label: "CMV",
        value: r => r.custoTotal,
        format: fmtMoney,
      },
      {
        key: "lucro",
        label: "lucro bruto",
        value: r => r.lucroBruto,
        format: fmtMoney,
      },
    ],
    "maiores-clientes": [
      { key: "vendas", label: "vendas", value: r => r.vendas },
      {
        key: "bruto",
        label: "valor bruto",
        value: r => r.valorBruto,
        format: fmtMoney,
      },
      {
        key: "liquido",
        label: "valor líquido",
        value: r => r.valorLiquido,
        format: fmtMoney,
      },
      { key: "itens", label: "itens", value: r => r.totalVendido },
    ],
    "abc-clientes": [
      { key: "valor", label: "valor", value: r => r.valor, format: fmtMoney },
      { key: "participacao", label: "participação", value: r => r.participacao, format: fmtPct },
    ],
    "abc-produtos": [
      { key: "valor", label: "valor", value: r => r.valor, format: fmtMoney },
      { key: "participacao", label: "participação", value: r => r.participacao, format: fmtPct },
    ],
    "clientes-risco": [
      { key: "clientes", label: "clientes", value: () => 1 },
      {
        key: "anterior",
        label: "valor anterior",
        value: r => r.valorAnterior,
        format: fmtMoney,
      },
      {
        key: "atual",
        label: "valor atual",
        value: r => r.valorAtual,
        format: fmtMoney,
      },
    ],
    margem: [
      {
        key: "receita",
        label: "receita líquida",
        value: r => r.valorLiquido,
        format: fmtMoney,
      },
      { key: "custo", label: "custo", value: r => r.custoTotal, format: fmtMoney },
      { key: "lucro", label: "lucro", value: r => r.lucroBruto, format: fmtMoney },
    ],
    "mix-produtos": [
      { key: "clientes", label: "clientes", value: () => 1 },
      {
        key: "faturamento",
        label: "faturamento",
        value: r => r.valorBruto,
        format: fmtMoney,
      },
      {
        key: "oportunidades",
        label: "sugestões",
        value: r => r.oportunidadesCrossSell?.length ?? 0,
      },
    ],
    clientes: [{ key: "clientes", label: "clientes", value: () => 1 }],
    "vendas-detalhadas": [
      { key: "vendas", label: "vendas", value: () => 1 },
      {
        key: "bruto",
        label: "bruto",
        value: r => r.valorBruto,
        format: fmtMoney,
      },
      {
        key: "liquido",
        label: "líquido",
        value: r => r.valorLiquido,
        format: fmtMoney,
      },
      { key: "frete", label: "frete", value: r => r.frete, format: fmtMoney },
      {
        key: "desconto",
        label: "desconto",
        value: r => r.desconto,
        format: fmtMoney,
      },
    ],
    "produtos-vendidos": [
      { key: "itens", label: "itens", value: r => r.quantidade },
      {
        key: "valor",
        label: "valor total",
        value: r => r.valorTotal,
        format: fmtMoney,
      },
      {
        key: "desconto",
        label: "desconto",
        value: r => r.descontoAplicado,
        format: fmtMoney,
      },
    ],
    "vendas-mes": [
      { key: "vendas", label: "vendas", value: r => r.vendas },
      { key: "itens", label: "itens", value: r => r.quantidadeItens },
      {
        key: "bruto",
        label: "bruto",
        value: r => r.valorBruto,
        format: fmtMoney,
      },
      {
        key: "liquido",
        label: "líquido",
        value: r => r.valorLiquido,
        format: fmtMoney,
      },
      { key: "frete", label: "frete", value: r => r.frete, format: fmtMoney },
      {
        key: "desconto",
        label: "desconto",
        value: r => r.desconto,
        format: fmtMoney,
      },
    ],
    orcamentos: [
      { key: "orcamentos", label: "orçamentos", value: () => 1 },
      {
        key: "valor",
        label: "valor bruto",
        value: r => r.valorBruto,
        format: fmtMoney,
      },
    ],
  };

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <PageHeader
        kicker="Relatórios"
        title="Relatórios comerciais"
        subtitle="Vendas, clientes, produtos, custos, margens e dados financeiros calculados a partir da Conta Azul sincronizada."
        actions={
          <PeriodoFiltro
            preset={preset}
            onPresetChange={setPreset}
            customInicio={customInicio}
            customFim={customFim}
            onCustomInicio={setCustomInicio}
            onCustomFim={setCustomFim}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {REPORTS.map(r => (
          <button
            key={r.id}
            type="button"
            className={[
              "rounded-full px-3 py-1.5 text-xs font-bold transition",
              active === r.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300",
            ].join(" ")}
            onClick={() => {
              setActive(r.id);
              setDrill(null);
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {data?.comparacaoPeriodo ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/25 dark:bg-emerald-950/20">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Receita líquida
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {fmtMoney(data.comparacaoPeriodo.valorLiquido.atual)}
            </div>
            <div className="mt-2">
              <DeltaBadge value={data.comparacaoPeriodo.valorLiquido.variacao} />
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Anterior: {fmtMoney(data.comparacaoPeriodo.valorLiquido.anterior)}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-400/25 dark:bg-sky-950/20">
            <div className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
              Valor bruto
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {fmtMoney(data.comparacaoPeriodo.valorBruto.atual)}
            </div>
            <div className="mt-2">
              <DeltaBadge value={data.comparacaoPeriodo.valorBruto.variacao} />
            </div>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-400/25 dark:bg-violet-950/20">
            <div className="text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300">
              Pedidos (vendas)
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {fmtNumber(data.comparacaoPeriodo.vendas.atual)}
            </div>
            <div className="mt-2">
              <DeltaBadge value={data.comparacaoPeriodo.vendas.variacao} />
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-950/20">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              Clientes ativos
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {fmtNumber(data.comparacaoPeriodo.clientesAtivos.atual)}
            </div>
            <div className="mt-2">
              <DeltaBadge
                value={data.comparacaoPeriodo.clientesAtivos.variacao}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/25 dark:bg-emerald-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Período
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {labelPreset(preset, { inicio: customInicio, fim: customFim })}
          </div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-400/25 dark:bg-sky-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            Vendas detalhadas
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data?.vendasDetalhadas.length ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Clientes
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data?.clientes.length ?? "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-400/25 dark:bg-violet-950/20">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300">
            Produtos vendidos
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data?.produtosVendidosDetalhados.length ?? "—"}
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          Carregando relatórios...
        </div>
      ) : !data ? (
        <Notice>Não foi possível carregar os relatórios comerciais.</Notice>
      ) : (
        <>
          {active === "vendas-cliente" ? (
            <Section
              title="Análise das vendas por cliente"
              description="Produtos mais comprados por cliente no período, com quantidade de itens e valor bruto."
              rows={filterRowsDrill(
                "vendas-cliente",
                data.vendasPorCliente,
                (r: any) => r.cliente
              ).map((r: any) => ({
                cliente: r.cliente,
                vendas: r.vendas,
                quantidadeItens: r.quantidadeItens,
                valorBruto: r.valorBruto,
                produtos: r.produtos
                  .map((p: any) => `${p.produto} (${fmtNumber(p.quantidade)})`)
                  .join(" | "),
              }))}
            >
              <ChartCard
                title="Top clientes por receita e volume"
                description="Clique em uma barra para filtrar a planilha abaixo (drill-down)."
              >
                {chartVendasCliente.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartVendasCliente}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cliente" />
                      <YAxis yAxisId="left" tickFormatter={v => fmtMoney(Number(v), 0)} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(v: any, name) =>
                          name === "itens" ? fmtNumber(v) : fmtMoney(v)
                        }
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="valorBruto"
                        name="Valor bruto"
                        fill="#059669"
                        cursor="pointer"
                        onClick={d =>
                          setDrillFor(
                            "vendas-cliente",
                            (d as { payload?: { nome?: string } })?.payload
                              ?.nome ?? ""
                          )
                        }
                      />
                      <Line
                        yAxisId="right"
                        dataKey="itens"
                        name="Itens"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Sem vendas por cliente no período." />
                )}
              </ChartCard>
              {drill?.report === "vendas-cliente" ? (
                <DrillBanner
                  label={drill.value}
                  onClear={() => setDrill(null)}
                />
              ) : null}
              {renderTableFilter(
                "vendas-cliente",
                data.vendasPorCliente.length,
                filterRowsDrill(
                  "vendas-cliente",
                  data.vendasPorCliente,
                  (r: any) => r.cliente
                ).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-right">Vendas</th>
                      <th className="px-3 py-2 text-right">Itens</th>
                      <th className="px-3 py-2 text-right">Valor bruto</th>
                      <th className="px-3 py-2 text-left">
                        Produtos mais comprados
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRowsDrill(
                      "vendas-cliente",
                      data.vendasPorCliente,
                      (r: any) => r.cliente
                    )
                      .slice(0, 50)
                      .map((r: any) => (
                      <tr key={r.clienteId}>
                        <td className="px-3 py-2">
                          <ClienteLink id={r.clienteId} nome={r.cliente} />
                        </td>
                        <td className="px-3 py-2 text-right">{r.vendas}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtNumber(r.quantidadeItens)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {r.produtos
                            .map(
                              (p: any) =>
                                `${p.produto} (${fmtNumber(p.quantidade)})`
                            )
                            .join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "cmv" ? (
            <Section
              title="Análise do custo da mercadoria vendida (CMV)"
              description="Custo médio, custo total, valor bruto e valor unitário médio por produto."
              rows={filterRows("cmv", data.cmv.linhas)}
            >
              {!data.disponibilidade.cmv ? (
                <Notice>
                  Os itens existem, mas custo unitário ainda não está preenchido
                  para calcular CMV real.
                </Notice>
              ) : null}
              <ChartCard
                title="Receita, custo e margem por produto"
                description="Prioriza produtos com maior receita para evidenciar margem e custo total."
              >
                {chartCmv.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartCmv}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="produto" />
                      <YAxis yAxisId="left" tickFormatter={v => fmtMoney(Number(v), 0)} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={v => `${Math.round(Number(v) * 100)}%`}
                      />
                      <Tooltip
                        formatter={(v: any, name) =>
                          name === "margem" ? fmtPct(v) : fmtMoney(v)
                        }
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="receita"
                        name="Receita"
                        fill="#0ea5e9"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="custo"
                        name="Custo"
                        fill="#f59e0b"
                      />
                      <Line
                        yAxisId="right"
                        dataKey="margem"
                        name="Margem"
                        stroke="#059669"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Sem itens para calcular CMV no período." />
                )}
              </ChartCard>
              {renderTableFilter(
                "cmv",
                data.cmv.linhas.length,
                filterRows("cmv", data.cmv.linhas).length
              )}
              <Table>
                <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Categoria</th>
                      <th className="px-3 py-2 text-right">Qtd.</th>
                      <th className="px-3 py-2 text-right">Custo médio</th>
                      <th className="px-3 py-2 text-right">Custo total</th>
                      <th className="px-3 py-2 text-right">Valor bruto</th>
                      <th className="px-3 py-2 text-right">
                        Valor unit. médio
                      </th>
                      <th className="px-3 py-2 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("cmv", data.cmv.linhas).slice(0, 80).map((r: any) => (
                      <tr key={r.produto}>
                        <td className="px-3 py-2 font-semibold">{r.produto}</td>
                        <td className="px-3 py-2">{r.categoria ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtNumber(r.quantidade)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.custoMedio)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.custoTotal)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorUnitarioMedio)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtPct(r.margemLucro)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "clientes-sem-vendas" ? (
            <Section
              title="Clientes sem vendas há mais tempo"
              description="Clientes ordenados pelo maior tempo desde a última venda."
              rows={filterRows("clientes-sem-vendas", data.clientesSemVendas)}
            >
              <ChartCard
                title="Clientes com maior tempo sem recompra"
                description="Ajuda a priorizar reativação comercial."
              >
                {chartClientesSemVenda.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartClientesSemVenda} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="cliente" type="category" width={130} />
                      <Tooltip formatter={(v: any) => `${fmtNumber(v)} dias`} />
                      <Bar dataKey="dias" name="Dias sem venda" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Sem histórico suficiente para calcular inatividade." />
                )}
              </ChartCard>
              {renderTableFilter(
                "clientes-sem-vendas",
                data.clientesSemVendas.length,
                filterRows("clientes-sem-vendas", data.clientesSemVendas).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                      <th className="px-3 py-2 text-right">Última venda</th>
                      <th className="px-3 py-2 text-right">Dias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("clientes-sem-vendas", data.clientesSemVendas).slice(0, 100).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2">{r.tipo}</td>
                        <td className="px-3 py-2">{r.situacao}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtDate(r.ultimaVenda)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.diasSemVenda ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "lucro-margem" ? (
            <Section
              title="Gráfico de lucro bruto e margem por mês"
              description="Lucro bruto e margem mês a mês, considerando CMV quando disponível."
              rows={filterRows("lucro-margem", data.lucroMargemMes)}
            >
              <ChartCard
                title="Receita, lucro bruto e margem"
                description="Combina valor vendido, lucro bruto e margem para enxergar qualidade da receita."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartLucroMargem}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis yAxisId="left" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={v => `${Math.round(Number(v) * 100)}%`}
                    />
                    <Tooltip
                      formatter={(v: any, name) =>
                        String(name).includes("margem")
                          ? fmtPct(v)
                          : fmtMoney(v)
                      }
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="receita"
                      name="Receita"
                      fill="#d1fae5"
                      stroke="#10b981"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="lucroBruto"
                      name="Lucro bruto"
                      fill="#10b981"
                    />
                    <Line
                      yAxisId="right"
                      dataKey="margemLucro"
                      name="Margem"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>
              {renderTableFilter(
                "lucro-margem",
                data.lucroMargemMes.length,
                filterRows("lucro-margem", data.lucroMargemMes).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Mês</th>
                      <th className="px-3 py-2 text-right">Receita</th>
                      <th className="px-3 py-2 text-right">CMV</th>
                      <th className="px-3 py-2 text-right">Lucro bruto</th>
                      <th className="px-3 py-2 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("lucro-margem", data.lucroMargemMes).map((r: any) => (
                      <tr key={r.mes}>
                        <td className="px-3 py-2 font-semibold">{r.mes}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorLiquido ?? r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.custoTotal)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.lucroBruto)}</td>
                        <td className="px-3 py-2 text-right">{fmtPct(r.margemLucro)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "maiores-clientes" ? (
            <Section
              title="Gráfico de maiores clientes"
              description="Compare clientes por valor bruto, valor líquido, total vendido ou ticket médio por venda."
              rows={filterRows("maiores-clientes", data.maioresClientes)}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    "valorBruto",
                    "valorLiquido",
                    "totalVendido",
                    "ticketMedio",
                  ] as const
                ).map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${metricaCliente === m ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}
                    onClick={() => setMetricaCliente(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <ChartCard
                title="Ranking de clientes"
                description="Use as métricas para alternar entre faturamento, volume e ticket."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientesChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cliente" />
                    <YAxis />
                    <Tooltip
                      formatter={(v: any) =>
                        metricaCliente === "totalVendido"
                          ? fmtNumber(v)
                          : fmtMoney(v)
                      }
                    />
                    <Bar dataKey="valor" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              {renderTableFilter(
                "maiores-clientes",
                data.maioresClientes.length,
                filterRows("maiores-clientes", data.maioresClientes).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Vendas</th>
                      <th className="px-3 py-2 text-right">Valor bruto</th>
                      <th className="px-3 py-2 text-right">Valor líquido</th>
                      <th className="px-3 py-2 text-right">Itens</th>
                      <th className="px-3 py-2 text-right">Ticket médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("maiores-clientes", data.maioresClientes).slice(0, 80).map((r: any) => (
                      <tr key={r.clienteId}>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2">{r.tipoItem ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{fmtNumber(r.vendas)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.valorBruto)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.valorLiquido)}</td>
                        <td className="px-3 py-2 text-right">{fmtNumber(r.totalVendido)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.ticketMedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "abc-clientes" ? (
            <Section
              title="Curva ABC de clientes"
              description="Classificação A/B/C pela receita líquida acumulada. Clique no gráfico para filtrar."
              rows={filterRowsDrill(
                "abc-clientes",
                data.abcClientes ?? [],
                (r: any) => r.nome
              ).map((r: any) => ({
                cliente: r.nome,
                classe: r.classe,
                valor: r.valor,
                participacao: r.participacao,
                acumulado: r.acumulado,
              }))}
            >
              <ChartCard title="Ranking ABC" description="Barras por receita líquida.">
                <AbcChart
                  rows={data.abcClientes ?? []}
                  labelKey="Receita líquida"
                  onPick={nome => setDrillFor("abc-clientes", nome)}
                />
              </ChartCard>
              <ChartCard title="Pareto acumulado" description="Participação acumulada da carteira.">
                <AbcParetoChart rows={data.abcClientes ?? []} />
              </ChartCard>
              {drill?.report === "abc-clientes" ? (
                <DrillBanner label={drill.value} onClear={() => setDrill(null)} />
              ) : null}
              {renderTableFilter(
                "abc-clientes",
                (data.abcClientes ?? []).length,
                filterRowsDrill(
                  "abc-clientes",
                  data.abcClientes ?? [],
                  (r: any) => r.nome
                ).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-center">Classe</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-right">Participação</th>
                      <th className="px-3 py-2 text-right">Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRowsDrill(
                      "abc-clientes",
                      data.abcClientes ?? [],
                      (r: any) => r.nome
                    )
                      .slice(0, 100)
                      .map((r: any) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 font-semibold">{r.nome}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                r.classe === "A"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.classe === "B"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {r.classe}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{fmtMoney(r.valor)}</td>
                          <td className="px-3 py-2 text-right">{fmtPct(r.participacao)}</td>
                          <td className="px-3 py-2 text-right">{fmtPct(r.acumulado)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "abc-produtos" ? (
            <Section
              title="Curva ABC de produtos"
              description="Produtos que mais contribuem para o faturamento bruto."
              rows={filterRows("abc-produtos", data.abcProdutos ?? []).map(
                (r: any) => ({
                  produto: r.nome,
                  classe: r.classe,
                  valor: r.valor,
                  participacao: r.participacao,
                  acumulado: r.acumulado,
                })
              )}
            >
              <ChartCard title="Ranking ABC de produtos">
                <AbcChart
                  rows={data.abcProdutos ?? []}
                  labelKey="Receita bruta"
                  onPick={nome => setDrillFor("abc-produtos", nome)}
                />
              </ChartCard>
              {drill?.report === "abc-produtos" ? (
                <DrillBanner label={drill.value} onClear={() => setDrill(null)} />
              ) : null}
              {renderTableFilter(
                "abc-produtos",
                (data.abcProdutos ?? []).length,
                filterRowsDrill(
                  "abc-produtos",
                  data.abcProdutos ?? [],
                  (r: any) => r.nome
                ).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-center">Classe</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-right">Participação</th>
                      <th className="px-3 py-2 text-right">Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRowsDrill(
                      "abc-produtos",
                      data.abcProdutos ?? [],
                      (r: any) => r.nome
                    ).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-semibold">{r.nome}</td>
                        <td className="px-3 py-2 text-center">{r.classe}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.valor)}</td>
                        <td className="px-3 py-2 text-right">{fmtPct(r.participacao)}</td>
                        <td className="px-3 py-2 text-right">{fmtPct(r.acumulado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "clientes-risco" ? (
            <Section
              title="Clientes em risco"
              description="Queda ou parada de compra vs período anterior equivalente."
              rows={filterRowsDrill(
                "clientes-risco",
                data.clientesRisco ?? [],
                (r: any) => r.cliente
              )}
            >
              <ChartCard title="Score de risco" description="Clique para filtrar a lista.">
                <RiscoChart
                  rows={data.clientesRisco ?? []}
                  onPick={nome => setDrillFor("clientes-risco", nome)}
                />
              </ChartCard>
              {drill?.report === "clientes-risco" ? (
                <DrillBanner label={drill.value} onClear={() => setDrill(null)} />
              ) : null}
              {renderTableFilter(
                "clientes-risco",
                (data.clientesRisco ?? []).length,
                filterRowsDrill(
                  "clientes-risco",
                  data.clientesRisco ?? [],
                  (r: any) => r.cliente
                ).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-right">Score</th>
                      <th className="px-3 py-2 text-left">Motivo</th>
                      <th className="px-3 py-2 text-right">Valor anterior</th>
                      <th className="px-3 py-2 text-right">Valor atual</th>
                      <th className="px-3 py-2 text-right">Variação</th>
                      <th className="px-3 py-2 text-left">Ação sugerida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRowsDrill(
                      "clientes-risco",
                      data.clientesRisco ?? [],
                      (r: any) => r.cliente
                    ).map((r: any) => (
                      <tr key={r.clienteId}>
                        <td className="px-3 py-2">
                          <ClienteLink id={r.clienteId} nome={r.cliente} />
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-red-600">
                          {r.score}
                        </td>
                        <td className="px-3 py-2">{r.motivo}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorAnterior)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorAtual)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtVariacao(r.variacaoValor)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {r.acaoSugerida}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "margem" ? (
            <Section
              title="Margem por cliente"
              description="Lucro bruto e margem quando custo unitário está preenchido nos itens."
              rows={filterRowsDrill(
                "margem",
                data.margemPorCliente ?? [],
                (r: any) => r.cliente
              )}
            >
              {!data.disponibilidade.cmv ? (
                <Notice>
                  Preencha custo unitário nos itens (sync Conta Azul) para ver margem real.
                </Notice>
              ) : null}
              <ChartCard title="Margem e lucro por cliente">
                <MargemChart
                  rows={data.margemPorCliente ?? []}
                  onPick={nome => setDrillFor("margem", nome)}
                />
              </ChartCard>
              {drill?.report === "margem" ? (
                <DrillBanner label={drill.value} onClear={() => setDrill(null)} />
              ) : null}
              {renderTableFilter(
                "margem",
                (data.margemPorCliente ?? []).length,
                filterRowsDrill(
                  "margem",
                  data.margemPorCliente ?? [],
                  (r: any) => r.cliente
                ).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-right">Receita líquida</th>
                      <th className="px-3 py-2 text-right">Custo</th>
                      <th className="px-3 py-2 text-right">Lucro</th>
                      <th className="px-3 py-2 text-right">Margem</th>
                      <th className="px-3 py-2 text-right">Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRowsDrill(
                      "margem",
                      data.margemPorCliente ?? [],
                      (r: any) => r.cliente
                    ).map((r: any) => (
                      <tr key={r.clienteId}>
                        <td className="px-3 py-2">
                          <ClienteLink id={r.clienteId} nome={r.cliente} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorLiquido)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.custoTotal)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.lucroBruto)}
                        </td>
                        <td className="px-3 py-2 text-right">{fmtPct(r.margemLucro)}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.ticketMedio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "mix-produtos" ? (
            <Section
              title="Mix de produtos e cross-sell"
              description="Produtos populares que clientes relevantes ainda não compram no período."
              rows={filterRowsDrill(
                "mix-produtos",
                data.mixProdutosCliente ?? [],
                (r: any) => r.cliente
              ).map((r: any) => ({
                cliente: r.cliente,
                valorBruto: r.valorBruto,
                topProdutos: r.topProdutos,
                oportunidades: r.oportunidadesCrossSell.join(" | "),
              }))}
            >
              <ChartCard title="Oportunidades por cliente">
                <MixChart
                  rows={(data.mixProdutosCliente ?? []).map((r: any) => ({
                    cliente: r.cliente,
                    oportunidades: r.oportunidadesCrossSell?.length ?? 0,
                  }))}
                />
              </ChartCard>
              {drill?.report === "mix-produtos" ? (
                <DrillBanner label={drill.value} onClear={() => setDrill(null)} />
              ) : null}
              {renderTableFilter(
                "mix-produtos",
                (data.mixProdutosCliente ?? []).length,
                filterRowsDrill(
                  "mix-produtos",
                  data.mixProdutosCliente ?? [],
                  (r: any) => r.cliente
                ).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-right">Faturamento</th>
                      <th className="px-3 py-2 text-left">Já compra</th>
                      <th className="px-3 py-2 text-left">Sugestões cross-sell</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRowsDrill(
                      "mix-produtos",
                      data.mixProdutosCliente ?? [],
                      (r: any) => r.cliente
                    ).map((r: any) => (
                      <tr key={r.clienteId}>
                        <td className="px-3 py-2">
                          <ClienteLink id={r.clienteId} nome={r.cliente} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {r.topProdutos || "—"}
                        </td>
                        <td className="px-3 py-2 font-medium text-violet-700 dark:text-violet-300">
                          {r.oportunidadesCrossSell?.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "impostos" ? (
            <Section
              title="Relatório de Impostos"
              description="Nota fiscal, valores e impostos por venda/serviço."
              rows={data.impostos.linhas}
            >
              <ChartCard
                title="Impostos por período"
                description="Será preenchido quando notas e tributos estiverem sincronizados."
              >
                <EmptyChart message="Dados fiscais ainda indisponíveis na base comercial." />
              </ChartCard>
              <Notice>{data.impostos.observacao}</Notice>
            </Section>
          ) : null}

          {active === "clientes" ? (
            <Section
              title="Relação de clientes"
              description="Lista completa dos clientes cadastrados com dados básicos."
              rows={filterRows("clientes", data.clientes)}
            >
              <ChartCard
                title="Distribuição da carteira por situação"
                description="Mostra a composição da base cadastrada."
              >
                {chartClientesSituacao.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartClientesSituacao}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        label
                      >
                        {chartClientesSituacao.map((_, idx) => (
                          <Cell
                            key={`clientes-situacao-${idx}`}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtNumber(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Sem clientes cadastrados." />
                )}
              </ChartCard>
              {renderTableFilter(
                "clientes",
                data.clientes.length,
                filterRows("clientes", data.clientes).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                      <th className="px-3 py-2 text-left">CNPJ/CPF</th>
                      <th className="px-3 py-2 text-left">Contato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("clientes", data.clientes).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-semibold">{r.nome}</td>
                        <td className="px-3 py-2">{r.tipo}</td>
                        <td className="px-3 py-2">{r.situacao}</td>
                        <td className="px-3 py-2">{r.cnpjCpf ?? "—"}</td>
                        <td className="px-3 py-2">
                          {r.email ?? r.telefone ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "vendas-detalhadas" ? (
            <Section
              title="Relação detalhada das vendas"
              description="Cliente, vendedor, data, valor bruto, líquido, frete e desconto aplicado."
              rows={filterRows("vendas-detalhadas", data.vendasDetalhadas)}
            >
              <ChartCard
                title="Evolução mensal de vendas"
                description="Compara valor bruto, líquido e quantidade de pedidos."
              >
                {chartVendasDetalhadas.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartVendasDetalhadas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis yAxisId="left" tickFormatter={v => fmtMoney(Number(v), 0)} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(v: any, name) =>
                          name === "pedidos" ? fmtNumber(v) : fmtMoney(v)
                        }
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="bruto" name="Bruto" fill="#0ea5e9" />
                      <Bar yAxisId="left" dataKey="liquido" name="Líquido" fill="#059669" />
                      <Line
                        yAxisId="right"
                        dataKey="pedidos"
                        name="Pedidos"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Sem vendas no período." />
                )}
              </ChartCard>
              {renderTableFilter(
                "vendas-detalhadas",
                data.vendasDetalhadas.length,
                filterRows("vendas-detalhadas", data.vendasDetalhadas).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Vendedor</th>
                      <th className="px-3 py-2 text-right">Bruto</th>
                      <th className="px-3 py-2 text-right">Líquido</th>
                      <th className="px-3 py-2 text-right">Frete</th>
                      <th className="px-3 py-2 text-right">Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("vendas-detalhadas", data.vendasDetalhadas).slice(0, 150).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2">{fmtDate(r.dataVenda)}</td>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2">{r.vendedor}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorLiquido)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.frete)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.desconto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "produtos-vendidos" ? (
            <Section
              title="Relação detalhada de produtos vendidos"
              description="Produto, quantidade, valor total, cliente, data, tipo de item e desconto aplicado."
              rows={filterRows("produtos-vendidos", data.produtosVendidosDetalhados)}
            >
              <ChartCard
                title="Produtos mais vendidos por valor"
                description="Ranking dos produtos com maior receita no período."
              >
                {chartProdutosVendidos.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartProdutosVendidos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis yAxisId="left" tickFormatter={v => fmtMoney(Number(v), 0)} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(v: any, name) =>
                          name === "quantidade" ? fmtNumber(v) : fmtMoney(v)
                        }
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="valorTotal"
                        name="Valor total"
                        fill="#059669"
                      />
                      <Line
                        yAxisId="right"
                        dataKey="quantidade"
                        name="Quantidade"
                        stroke="#f59e0b"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Sem produtos vendidos no período." />
                )}
              </ChartCard>
              {renderTableFilter(
                "produtos-vendidos",
                data.produtosVendidosDetalhados.length,
                filterRows("produtos-vendidos", data.produtosVendidosDetalhados).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Qtd.</th>
                      <th className="px-3 py-2 text-right">Valor total</th>
                      <th className="px-3 py-2 text-right">Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("produtos-vendidos", data.produtosVendidosDetalhados)
                      .slice(0, 200)
                      .map((r: any, idx: number) => (
                        <tr key={`${r.pedidoId}-${r.produto}-${idx}`}>
                          <td className="px-3 py-2">{fmtDate(r.dataVenda)}</td>
                          <td className="px-3 py-2 font-semibold">
                            {r.cliente}
                          </td>
                          <td className="px-3 py-2">{r.produto}</td>
                          <td className="px-3 py-2">{r.tipoItem}</td>
                          <td className="px-3 py-2 text-right">
                            {fmtNumber(r.quantidade)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {fmtMoney(r.valorTotal)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {fmtMoney(r.descontoAplicado)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "vendas-mes" ? (
            <Section
              title="Total de vendas por mês"
              description="Valor total vendido em cada mês, alternando entre bruto, líquido, frete e desconto."
              rows={filterRows("vendas-mes", data.vendasPorMes)}
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {(
                  ["valorBruto", "valorLiquido", "frete", "desconto"] as const
                ).map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${metricaMes === m ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
                    onClick={() => setMetricaMes(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <ChartCard
                title="Série mensal de vendas"
                description="Alterne a métrica para analisar receita, frete e descontos."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.vendasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => fmtMoney(v)} />
                    <Bar dataKey={metricaMes} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              {renderTableFilter(
                "vendas-mes",
                data.vendasPorMes.length,
                filterRows("vendas-mes", data.vendasPorMes).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Mês</th>
                      <th className="px-3 py-2 text-right">Vendas</th>
                      <th className="px-3 py-2 text-right">Itens</th>
                      <th className="px-3 py-2 text-right">Bruto</th>
                      <th className="px-3 py-2 text-right">Líquido</th>
                      <th className="px-3 py-2 text-right">Frete</th>
                      <th className="px-3 py-2 text-right">Desconto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("vendas-mes", data.vendasPorMes).map((r: any) => (
                      <tr key={r.mes}>
                        <td className="px-3 py-2 font-semibold">{r.mes}</td>
                        <td className="px-3 py-2 text-right">{fmtNumber(r.vendas)}</td>
                        <td className="px-3 py-2 text-right">{fmtNumber(r.quantidadeItens)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.valorBruto)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.valorLiquido)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.frete)}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(r.desconto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "servicos" ? (
            <Section
              title="Relação detalhada de serviços prestados"
              description="Cliente, serviço, data, valor bruto, líquido e desconto aplicado."
              rows={data.servicosPrestados.linhas}
            >
              <ChartCard
                title="Serviços prestados por cliente"
                description="Será preenchido quando a Conta Azul disponibilizar serviços na sincronização."
              >
                <EmptyChart message="Dados de serviços ainda indisponíveis." />
              </ChartCard>
              <Notice>{data.servicosPrestados.observacao}</Notice>
            </Section>
          ) : null}

          {active === "contratos" ? (
            <Section
              title="Situação dos Contratos"
              description="Contratos ativos ou encerrados, datas e valores em aberto/pagos/vencidos."
              rows={data.contratos.linhas}
            >
              <ChartCard
                title="Contratos por situação"
                description="Será preenchido quando contratos estiverem persistidos na base comercial."
              >
                <EmptyChart message="Dados de contratos ainda indisponíveis." />
              </ChartCard>
              <Notice>{data.contratos.observacao}</Notice>
            </Section>
          ) : null}

          {active === "orcamentos" ? (
            <Section
              title="Situação dos orçamentos"
              description="Orçamentos em andamento, cliente, data e valor bruto."
              rows={filterRows("orcamentos", data.orcamentos)}
            >
              <ChartCard
                title="Orçamentos por status"
                description="Mostra quantidade e valor bruto em cada situação."
              >
                {chartOrcamentos.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartOrcamentos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis yAxisId="left" tickFormatter={v => fmtMoney(Number(v), 0)} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(v: any, name) =>
                          name === "quantidade" ? fmtNumber(v) : fmtMoney(v)
                        }
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="valorBruto"
                        name="Valor bruto"
                        fill="#8b5cf6"
                      />
                      <Line
                        yAxisId="right"
                        dataKey="quantidade"
                        name="Quantidade"
                        stroke="#059669"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Sem orçamentos no período." />
                )}
              </ChartCard>
              {renderTableFilter(
                "orcamentos",
                data.orcamentos.length,
                filterRows("orcamentos", data.orcamentos).length
              )}
              <Table>
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Valor bruto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {filterRows("orcamentos", data.orcamentos).map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2">
                          {fmtDate(r.dataOrcamento)}
                        </td>
                        <td className="px-3 py-2 font-semibold">{r.cliente}</td>
                        <td className="px-3 py-2">{r.status}</td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(r.valorBruto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            </Section>
          ) : null}

          {active === "financeiro-servico" ? (
            <Section
              title="Situação financeira por cliente e serviço"
              description="Valores em aberto, pagos e vencidos por cliente/serviço."
              rows={data.financeiraClienteServico.linhas}
            >
              <ChartCard
                title="Financeiro por cliente e serviço"
                description="Será preenchido quando aberto, pago e vencido forem sincronizados."
              >
                <EmptyChart message="Dados financeiros detalhados ainda indisponíveis." />
              </ChartCard>
              <Notice>{data.financeiraClienteServico.observacao}</Notice>
            </Section>
          ) : null}

          {active === "vendedores" ? (
            <Section
              title="Análise das vendas por vendedor"
              description="Produtos/serviços vendidos por vendedor, valores e descontos."
              rows={data.vendasPorVendedor.linhas}
            >
              <ChartCard
                title="Vendas por vendedor"
                description="Será preenchido quando o vendedor estiver persistido nas vendas."
              >
                <EmptyChart message="Dados de vendedor ainda indisponíveis." />
              </ChartCard>
              <Notice>{data.vendasPorVendedor.observacao}</Notice>
            </Section>
          ) : null}
        </>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
          <FileBarChart className="h-4 w-4" />
          Observação de integridade
        </div>
        <p className="mt-1">
          Relatórios financeiros avançados dependem dos campos sincronizados.
          Impostos, contratos, serviços e vendedor aparecem como indisponíveis
          enquanto esses dados não estiverem persistidos na base comercial.
        </p>
      </div>
    </div>
  );
}
