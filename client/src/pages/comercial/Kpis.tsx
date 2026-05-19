import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, TrendingDown, TrendingUp, Users } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartAreaUnderLineDefs,
  CHART,
  ComparisonTreemap,
  buildChartTheme,
  chartAnimation,
  pieSliceSolidFill,
} from "@/components/comercial/charts";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import { fuGlass, fuGlassHover, fuGlassSm, fuStat, fuTextMuted, fuTextStrong, fuTitleGradient } from "@/lib/comercial/fuBrand";
import { useTheme } from "@/contexts/ThemeContext";
import { intervaloDoPreset, labelPreset, type PeriodoPreset } from "@/lib/comercial/periodo";
import { trpc } from "@/lib/trpc";

const GREEN = CHART.green.mid;

function periodoFromPreset(p: PeriodoPreset): "DIARIO" | "SEMANAL" | "MENSAL" {
  if (p === "hoje") return "DIARIO";
  if (p === "semana") return "SEMANAL";
  return "MENSAL";
}

function exportSnapshotsCsv(
  rows: { nomeKpi: string; dataReferencia: Date; valor: { toString(): string } | number; periodo: string }[],
) {
  const header = "nome_kpi,data_referencia,valor,periodo\n";
  const body = rows
    .map((r) => {
      const d = new Date(r.dataReferencia).toISOString().slice(0, 10);
      const v = String(typeof r.valor === "object" && r.valor != null && "toString" in r.valor ? r.valor.toString() : r.valor).replace(
        /"/g,
        '""',
      );
      return `"${r.nomeKpi}","${d}","${v}","${r.periodo}"`;
    })
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kpi_snapshots_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Kpis() {
  const { theme } = useTheme();
  const chart = useMemo(() => buildChartTheme(theme), [theme]);
  const {
    chartGridProps,
    chartAxisXProps,
    chartAxisYProps,
    chartTooltipProps,
    chartTooltipCursorLine,
  } = chart;
  const pieStroke = theme === "dark" ? "#0f172a" : "#f1f5f9";
  const legendMuted = theme === "dark" ? "#94a3b8" : "#64748b";
  const lineActiveStroke = theme === "dark" ? "#030712" : "#f8fafc";

  const [preset, setPreset] = useState<PeriodoPreset>("mes");
  const { inicio, fim } = useMemo(() => intervaloDoPreset(preset), [preset]);
  const periodoKpi = periodoFromPreset(preset);

  const resumo = trpc.comercial.kpis.resumoCalculado.useQuery({ inicio, fim }, { staleTime: 30_000 });
  const snap = trpc.comercial.kpis.snapshots.useQuery({ periodo: periodoKpi, limite: 120 }, { staleTime: 30_000 });

  const nomesKpi = useMemo(() => {
    const s = new Set<string>();
    for (const r of snap.data ?? []) s.add(r.nomeKpi);
    return Array.from(s).sort();
  }, [snap.data]);

  const [kpiLinha, setKpiLinha] = useState<string>("ticket_medio");
  useEffect(() => {
    if (nomesKpi.length && !nomesKpi.includes(kpiLinha)) setKpiLinha(nomesKpi[0]!);
  }, [nomesKpi, kpiLinha]);

  const serieLinha = useMemo(() => {
    const rows = (snap.data ?? []).filter((r) => r.nomeKpi === kpiLinha);
    return [...rows]
      .sort((a, b) => new Date(a.dataReferencia).getTime() - new Date(b.dataReferencia).getTime())
      .map((r) => ({
        data: new Date(r.dataReferencia).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        valor: Number(r.valor),
      }));
  }, [snap.data, kpiLinha]);

  const dadosPizzaNome = useMemo(() => {
    const best = new Map<string, { t: number; v: number }>();
    for (const r of snap.data ?? []) {
      const t = new Date(r.dataReferencia).getTime();
      const cur = best.get(r.nomeKpi);
      const v = Number(r.valor);
      if (!cur || t > cur.t) best.set(r.nomeKpi, { t, v });
    }
    return Array.from(best.entries()).map(([name, { v }]) => ({ name, value: Math.abs(v) }));
  }, [snap.data]);

  const ticketMedioGeral = useMemo(() => {
    const arr = resumo.data?.ticketsMediosPorCliente ?? [];
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }, [resumo.data?.ticketsMediosPorCliente]);

  const churnPct = useMemo(() => {
    const ativos = resumo.data?.clientesAtivosComprando ?? 0;
    const churn = resumo.data?.sinalChurnClientes ?? 0;
    if (ativos + churn === 0) return null;
    return (churn / Math.max(1, ativos + churn)) * 100;
  }, [resumo.data]);

  return (
    <div className="relative z-10 space-y-8 p-4 lg:p-8">
      <PageHeader
        kicker="Analytics"
        title="KPIs e relatórios"
        subtitle={
          <>
            Período, tendência e exportação — dados calculados a partir dos pedidos e snapshots agendados.
            <TooltipInfo text="Snapshots são gravados pelo job de KPIs; se estiver vazio, use o período com dados no banco." />
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as PeriodoPreset)}
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-cyan-400/40"
              aria-label="Período"
            >
              <option value="hoje">Hoje</option>
              <option value="semana">Últimos 7 dias</option>
              <option value="mes">Mês atual</option>
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-500/40 hover:bg-cyan-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-cyan-300 dark:hover:border-cyan-400/40 dark:hover:bg-white/10"
              disabled={!snap.data?.length}
              onClick={() => snap.data && exportSnapshotsCsv(snap.data)}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        }
      />

      <p className={`text-sm ${fuTextMuted}`}>
        Período ativo: <span className="font-semibold text-slate-900 dark:text-slate-200">{labelPreset(preset)}</span> · granularidade:{" "}
        <span className="font-mono text-cyan-700 dark:text-cyan-400/90">{periodoKpi}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${fuGlassSm} ${fuGlassHover} border-emerald-400/25 p-5`}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-400/80">
            <Users className="h-4 w-4" />
            Clientes ativos
            <TooltipInfo text="Clientes com pelo menos um pedido no intervalo selecionado." />
          </div>
          <div className={`mt-3 text-3xl font-bold ${fuTextStrong} ${fuStat}`}>{resumo.data?.clientesAtivosComprando ?? "—"}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`${fuGlassSm} ${fuGlassHover} border-cyan-400/25 p-5`}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-400/80">
            <TrendingUp className="h-4 w-4" />
            Ticket médio (média)
            <TooltipInfo text="Média dos tickets por cliente no período; útil para comparar com meta comercial." />
          </div>
          <div className={`mt-3 text-2xl font-bold text-cyan-800 dark:text-cyan-200 ${fuStat}`}>
            {ticketMedioGeral != null
              ? ticketMedioGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
              : "—"}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${fuGlassSm} ${fuGlassHover} border p-5 ${
            (churnPct ?? 0) > 15
              ? "border-rose-300/80 bg-rose-50 dark:border-rose-500/35 dark:bg-rose-950/20"
              : "border-amber-200/90 bg-amber-50/90 dark:border-amber-400/25 dark:bg-amber-950/10"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900 dark:text-amber-400/80">
            <TrendingDown className="h-4 w-4" />
            Sinal de churn
            <TooltipInfo text="Clientes sem compra recente (heurística &gt;45 dias até a data final do período)." />
          </div>
          <div className={`mt-3 text-3xl font-bold ${(churnPct ?? 0) > 15 ? "text-rose-600 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"} ${fuStat}`}>
            {resumo.data?.sinalChurnClientes ?? "—"}{" "}
            <span className={`text-lg font-semibold ${fuTextMuted}`}>
              {churnPct != null ? `(${churnPct.toFixed(1)}%)` : ""}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`${fuGlassSm} p-5`}
        >
          <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${fuTextMuted}`}>Pontos no gráfico</div>
          <div className={`mt-3 text-3xl font-bold ${fuTextStrong} ${fuStat}`}>{serieLinha.length}</div>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${fuGlass} ${fuGlassHover} p-6 lg:col-span-2`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={`text-lg font-bold ${fuTitleGradient}`}>Tendência</h2>
              <p className={`text-sm ${fuTextMuted}`}>Escolha o KPI salvo nos snapshots</p>
            </div>
            <select
              value={nomesKpi.includes(kpiLinha) ? kpiLinha : nomesKpi[0] ?? "ticket_medio"}
              onChange={(e) => setKpiLinha(e.target.value)}
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-cyan-400/40"
            >
              {nomesKpi.length ? (
                nomesKpi.map((n) => (
                  <option key={n} value={n}>
                    {n.replace(/_/g, " ")}
                  </option>
                ))
              ) : (
                <option value="ticket_medio">ticket medio (sem dados)</option>
              )}
            </select>
          </div>
          <div className="mt-4 h-80">
            {serieLinha.length === 0 ? (
              <div
                className={`flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50 text-sm dark:border-white/10 dark:bg-white/5 ${fuTextMuted}`}
              >
                Sem snapshots para este KPI/período. Gere dados ou ajuste o agregador.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={serieLinha} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                  <ChartAreaUnderLineDefs prefix="kpi-trend" colorMid={GREEN} />
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="data" {...chartAxisXProps} />
                  <YAxis {...chartAxisYProps} />
                  <RTooltip {...chartTooltipProps} cursor={chartTooltipCursorLine} />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    fill="url(#kpi-trend-area)"
                    stroke="none"
                    isAnimationActive
                    animationDuration={450}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke={GREEN}
                    strokeWidth={2.75}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: lineActiveStroke, fill: GREEN }}
                    {...chartAnimation}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className={`${fuGlass} ${fuGlassHover} p-6`}>
          <h2 className={`text-lg font-bold ${fuTitleGradient}`}>Mix por KPI</h2>
          <p className={`text-sm ${fuTextMuted}`}>Último valor conhecido por nome (snapshot)</p>
          <div className="mt-4 h-64">
            {dadosPizzaNome.length === 0 ? (
              <div className={`flex h-full items-center justify-center text-center text-sm ${fuTextMuted}`}>
                Sem dados para pizza
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPizzaNome}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={44}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke={pieStroke}
                    strokeWidth={2}
                  >
                    {dadosPizzaNome.map((_, i) => (
                      <Cell key={i} fill={pieSliceSolidFill(i)} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: 8, fontSize: 11, fontWeight: 600, color: legendMuted }}
                  />
                  <RTooltip {...chartTooltipProps} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className={`${fuGlass} ${fuGlassHover} p-6`}>
        <h2 className={`text-lg font-bold ${fuTitleGradient}`}>Mapa proporcional — comparativo rápido</h2>
        <p className={`text-sm ${fuTextMuted}`}>
          Mesmos dados da pizza: cada retângulo reflete a participação do KPI no total.
        </p>
        <div className="mt-4 h-64">
          {dadosPizzaNome.length === 0 ? (
            <div className={`flex h-full items-center justify-center text-sm ${fuTextMuted}`}>Sem dados</div>
          ) : (
            <ComparisonTreemap
              data={dadosPizzaNome.map((d) => ({ name: d.name, value: d.value }))}
              formatValue={(n) =>
                n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
              }
              aspectRatio={1.45}
            />
          )}
        </div>
      </section>
    </div>
  );
}
