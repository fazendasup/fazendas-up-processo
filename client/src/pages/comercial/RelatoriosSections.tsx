import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink, X } from "lucide-react";
import type { ReactNode } from "react";

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

const ABC_COLORS = { A: "#059669", B: "#0ea5e9", C: "#94a3b8" } as const;

export function fmtMoney(n: number | null | undefined, digits = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: digits,
  });
}

export function fmtNumber(n: number | null | undefined, digits = 0) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(Number(n) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function fmtVariacao(n: number | null | undefined) {
  if (n == null) return "—";
  const pct = Number(n) * 100;
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function shortLabel(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function DeltaBadge({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return (
      <span className="text-xs font-semibold text-slate-400">sem base anterior</span>
    );
  }
  const up = value > 0;
  const down = value < 0;
  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
        up
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : down
            ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
      ].join(" ")}
    >
      {fmtVariacao(value)} vs mesmo período no mês anterior
    </span>
  );
}

export function DrillBanner({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm dark:border-sky-400/25 dark:bg-sky-950/30">
      <span className="font-semibold text-sky-900 dark:text-sky-200">
        Drill-down: {label}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200"
      >
        <X className="h-3.5 w-3.5" />
        Limpar
      </button>
    </div>
  );
}

export function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-white/10 dark:from-white/10 dark:to-white/5">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      <div className="h-80">{children}</div>
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
      {message}
    </div>
  );
}

export function ClienteLink({ id, nome }: { id: string; nome: string }) {
  return (
    <Link
      href={`/comercial/clientes/${id}`}
      className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
    >
      {nome}
      <ExternalLink className="h-3.5 w-3.5 opacity-60" />
    </Link>
  );
}

export function AbcChart({
  rows,
  labelKey,
  onPick,
}: {
  rows: Array<{
    id: string;
    nome: string;
    valor: number;
    classe: "A" | "B" | "C";
    participacao: number;
    acumulado: number;
  }>;
  labelKey: string;
  onPick?: (nome: string) => void;
}) {
  const chart = rows.slice(0, 15).map(r => ({
    ...r,
    label: shortLabel(r.nome),
    fill: ABC_COLORS[r.classe],
  }));
  if (!chart.length) return <EmptyChart message="Sem dados para curva ABC." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={v => fmtMoney(Number(v), 0)} />
        <YAxis dataKey="label" type="category" width={120} />
        <Tooltip
          formatter={(v: number, _n, item: any) => [
            fmtMoney(v),
            `Classe ${item?.payload?.classe} · ${fmtPct(item?.payload?.participacao)} do total`,
          ]}
        />
        <Bar
          dataKey="valor"
          name={labelKey}
          radius={[0, 6, 6, 0]}
          onClick={d => onPick?.(d?.payload?.nome ?? "")}
          cursor={onPick ? "pointer" : undefined}
        >
          {chart.map((entry, idx) => (
            <Cell key={`abc-${idx}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AbcParetoChart({
  rows,
}: {
  rows: Array<{ nome: string; acumulado: number; classe: string }>;
}) {
  const data = rows.slice(0, 20).map(r => ({
    nome: shortLabel(r.nome),
    acumulado: Number(r.acumulado) * 100,
    classe: r.classe,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="nome" />
        <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)}% acumulado`} />
        <Bar dataKey="acumulado" name="% acumulado" fill="#0ea5e9" />
        <Line
          type="monotone"
          dataKey="acumulado"
          stroke="#059669"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function RiscoChart({
  rows,
  onPick,
}: {
  rows: Array<{ cliente: string; score: number; valorAnterior: number }>;
  onPick?: (cliente: string) => void;
}) {
  const data = rows.slice(0, 12).map(r => ({
    cliente: shortLabel(r.cliente),
    nome: r.cliente,
    score: r.score,
    valor: r.valorAnterior,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="cliente" type="category" width={120} />
        <Tooltip />
        <Bar
          dataKey="score"
          name="Score de risco"
          fill="#ef4444"
          onClick={d => onPick?.(d?.payload?.nome ?? "")}
          cursor={onPick ? "pointer" : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MargemChart({
  rows,
  onPick,
}: {
  rows: Array<{
    cliente: string;
    margemLucro: number | null;
    lucroBruto: number | null;
  }>;
  onPick?: (cliente: string) => void;
}) {
  const data = rows
    .filter(r => r.margemLucro != null)
    .slice(0, 12)
    .map(r => ({
      cliente: shortLabel(r.cliente),
      nome: r.cliente,
      margem: Number(r.margemLucro) * 100,
      lucro: Number(r.lucroBruto ?? 0),
    }));
  if (!data.length) {
    return <EmptyChart message="Margem indisponível sem custo unitário nos itens." />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="cliente" />
        <YAxis yAxisId="left" tickFormatter={v => `${v}%`} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={v => fmtMoney(Number(v), 0)}
        />
        <Tooltip
          formatter={(v: number, name) =>
            name === "margem" ? `${v.toFixed(1)}%` : fmtMoney(v)
          }
        />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="margem"
          name="margem"
          fill="#059669"
          onClick={d => onPick?.(d?.payload?.nome ?? "")}
          cursor={onPick ? "pointer" : undefined}
        />
        <Bar yAxisId="right" dataKey="lucro" name="Lucro bruto" fill="#0ea5e9" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MixChart({
  rows,
}: {
  rows: Array<{ cliente: string; oportunidades: number }>;
}) {
  const data = rows
    .filter(r => r.oportunidades > 0)
    .slice(0, 12)
    .map(r => ({
      cliente: shortLabel(r.cliente),
      oportunidades: r.oportunidades,
    }));
  if (!data.length) {
    return <EmptyChart message="Carteira já cobre os produtos mais vendidos." />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="cliente" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar
          dataKey="oportunidades"
          name="Oportunidades cross-sell"
          fill="#8b5cf6"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { CHART_COLORS, ABC_COLORS };
