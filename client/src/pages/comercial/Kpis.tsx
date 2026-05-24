import { useMemo, useState } from "react";
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
import { PeriodoFiltro } from "@/components/comercial/ui/PeriodoFiltro";
import { hojeIsoLocal, intervaloDoPreset, labelPreset, type PeriodoPreset } from "@/lib/comercial/periodo";
import { trpc } from "@/lib/trpc";

const GREEN = CHART.green.mid;

const KPI_SERIE_OPTIONS = [
  { id: "valor_liquido", label: "Valor líquido", kind: "money" },
  { id: "valor_bruto", label: "Valor bruto", kind: "money" },
  { id: "frete", label: "Frete", kind: "money" },
  { id: "desconto", label: "Desconto", kind: "money" },
  { id: "orcamentos", label: "Orçamentos", kind: "money" },
  { id: "pedidos", label: "Pedidos", kind: "number" },
  { id: "clientes", label: "Clientes", kind: "number" },
  { id: "ticket_medio", label: "Ticket médio", kind: "money" },
] as const;

function periodoFromPreset(p: PeriodoPreset): "DIARIO" | "SEMANAL" | "MENSAL" {
  if (p === "semana_atual") return "SEMANAL";
  if (p === "mes_atual" || p === "ultimos_12_meses" || p === "todo_periodo") return "MENSAL";
  return "DIARIO";
}

function fmtMoney(n: number | null | undefined, maximumFractionDigits = 0) {
  return Number(n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits,
  });
}

function exportKpisCsv(resumo: any) {
  const header = "periodo,valor_liquido,valor_bruto,frete,desconto,orcamentos,pedidos,clientes,ticket_medio\n";
  const body = (resumo?.serie ?? [])
    .map((r: any) =>
      [
        r.periodo,
        r.valor_liquido,
        r.valor_bruto,
        r.frete,
        r.desconto,
        r.orcamentos,
        r.pedidos,
        r.clientes,
        r.ticket_medio,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kpis_conta_azul_${new Date().toISOString().slice(0, 10)}.csv`;
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

  const [preset, setPreset] = useState<PeriodoPreset>("mes_atual");
  const [customInicio, setCustomInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customFim, setCustomFim] = useState(hojeIsoLocal);
  const { inicio, fim } = useMemo(
    () => intervaloDoPreset(preset, { inicio: customInicio, fim: customFim }),
    [preset, customInicio, customFim],
  );
  const periodoKpi = periodoFromPreset(preset);

  const resumo = trpc.comercial.kpis.resumoCalculado.useQuery({ inicio, fim }, { staleTime: 30_000 });
  const [kpiLinha, setKpiLinha] = useState<(typeof KPI_SERIE_OPTIONS)[number]["id"]>("valor_liquido");

  const serieLinha = useMemo(() => {
    return (resumo.data?.serie ?? []).map((r: any) => ({
      data: new Date(`${r.periodo}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      valor: Number(r[kpiLinha] ?? 0),
    }));
  }, [resumo.data?.serie, kpiLinha]);

  const dadosPizzaNome = useMemo(() => {
    const kpis = resumo.data;
    if (!kpis) return [];
    return [
      { name: "Valor líquido", value: Math.abs(Number(kpis.valorLiquido ?? 0)) },
      { name: "Orçamentos", value: Math.abs(Number(kpis.valorOrcamentos ?? 0)) },
      { name: "Frete", value: Math.abs(Number(kpis.valorFrete ?? 0)) },
      { name: "Desconto", value: Math.abs(Number(kpis.valorDesconto ?? 0)) },
    ].filter((x) => x.value > 0);
  }, [resumo.data]);

  const selectedKpi = KPI_SERIE_OPTIONS.find((x) => x.id === kpiLinha) ?? KPI_SERIE_OPTIONS[0];
  const ticketMedioGeral = resumo.data?.ticketMedioPorClienteMes ?? null;

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
            Período, tendência e exportação — dados calculados diretamente das vendas sincronizadas da Conta Azul.
            <TooltipInfo text="Os totais usam a mesma composição validada contra o relatório da Conta Azul: bruto + frete - desconto = líquido." />
          </>
        }
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <PeriodoFiltro
              preset={preset}
              onPresetChange={setPreset}
              customInicio={customInicio}
              customFim={customFim}
              onCustomInicio={setCustomInicio}
              onCustomFim={setCustomFim}
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-500/40 hover:bg-cyan-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-cyan-300 dark:hover:border-cyan-400/40 dark:hover:bg-white/10"
              disabled={!resumo.data?.serie?.length}
              onClick={() => resumo.data && exportKpisCsv(resumo.data)}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        }
      />

      <p className={`text-sm ${fuTextMuted}`}>
        Período ativo:{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-200">
          {labelPreset(preset, { inicio: customInicio, fim: customFim })}
        </span>{" "}
        · granularidade:{" "}
        <span className="font-mono text-cyan-700 dark:text-cyan-400/90">{periodoKpi}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${fuGlassSm} ${fuGlassHover} border-emerald-400/25 p-5`}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-400/80">
            <TrendingUp className="h-4 w-4" />
            Valor líquido
            <TooltipInfo text="Total líquido das vendas Conta Azul no período: bruto + frete - desconto." />
          </div>
          <div className={`mt-3 text-3xl font-bold ${fuTextStrong} ${fuStat}`}>
            {resumo.data ? fmtMoney(resumo.data.valorLiquido, 2) : "—"}
          </div>
          <p className={`mt-1 text-xs ${fuTextMuted}`}>
            Bruto {fmtMoney(resumo.data?.valorBruto, 2)} · Frete {fmtMoney(resumo.data?.valorFrete, 2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`${fuGlassSm} ${fuGlassHover} border-cyan-400/25 p-5`}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-400/80">
            <Users className="h-4 w-4" />
            Vendas realizadas
            <TooltipInfo text="Quantidade de vendas classificadas como realizadas na Conta Azul." />
          </div>
          <div className={`mt-3 text-3xl font-bold text-cyan-800 dark:text-cyan-200 ${fuStat}`}>
            {resumo.data?.pedidosVenda ?? "—"}
          </div>
          <p className={`mt-1 text-xs ${fuTextMuted}`}>Orçamentos: {fmtMoney(resumo.data?.valorOrcamentos, 2)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${fuGlassSm} ${fuGlassHover} border-sky-400/25 p-5`}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 dark:text-sky-400/80">
            <TrendingUp className="h-4 w-4" />
            Ticket médio
            <TooltipInfo text="Ticket médio por pedido e média mensal por cliente, calculados sobre vendas Conta Azul." />
          </div>
          <div className={`mt-3 text-3xl font-bold text-sky-800 dark:text-sky-200 ${fuStat}`}>
            {resumo.data ? fmtMoney(resumo.data.ticketMedioPedido, 0) : "—"}
          </div>
          <p className={`mt-1 text-xs ${fuTextMuted}`}>Por cliente/mês: {ticketMedioGeral != null ? fmtMoney(ticketMedioGeral, 0) : "—"}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`${fuGlassSm} border p-5 ${
            (churnPct ?? 0) > 15
              ? "border-rose-300/80 bg-rose-50 dark:border-rose-500/35 dark:bg-rose-950/20"
              : "border-amber-200/90 bg-amber-50/90 dark:border-amber-400/25 dark:bg-amber-950/10"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900 dark:text-amber-400/80">
            <TrendingDown className="h-4 w-4" />
            Clientes / churn
            <TooltipInfo text="Clientes com compra no período e clientes sem compra recente até o fim do período." />
          </div>
          <div className={`mt-3 text-3xl font-bold ${(churnPct ?? 0) > 15 ? "text-rose-600 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"} ${fuStat}`}>
            {resumo.data?.clientesAtivosComprando ?? "—"}
          </div>
          <p className={`mt-1 text-xs ${fuTextMuted}`}>
            Churn: {resumo.data?.sinalChurnClientes ?? "—"} {churnPct != null ? `(${churnPct.toFixed(1)}%)` : ""}
          </p>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${fuGlass} ${fuGlassHover} p-6 lg:col-span-2`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={`text-lg font-bold ${fuTitleGradient}`}>Tendência</h2>
              <p className={`text-sm ${fuTextMuted}`}>Evolução diária calculada das vendas Conta Azul</p>
            </div>
            <select
              value={kpiLinha}
              onChange={(e) => setKpiLinha(e.target.value as (typeof KPI_SERIE_OPTIONS)[number]["id"])}
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-cyan-400/40"
            >
              {KPI_SERIE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 h-80">
            {serieLinha.length === 0 ? (
              <div
                className={`flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50 text-sm dark:border-white/10 dark:bg-white/5 ${fuTextMuted}`}
              >
                Sem vendas Conta Azul no período selecionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={serieLinha} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                  <ChartAreaUnderLineDefs prefix="kpi-trend" colorMid={GREEN} />
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="data" {...chartAxisXProps} />
                  <YAxis {...chartAxisYProps} />
                  <RTooltip
                    {...chartTooltipProps}
                    cursor={chartTooltipCursorLine}
                    formatter={(v: number) => [
                      selectedKpi.kind === "money" ? fmtMoney(v, 2) : Number(v).toLocaleString("pt-BR"),
                      selectedKpi.label,
                    ]}
                  />
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
          <h2 className={`text-lg font-bold ${fuTitleGradient}`}>Composição Conta Azul</h2>
          <p className={`text-sm ${fuTextMuted}`}>Líquido, orçamentos, frete e desconto do período</p>
          <div className="mt-4 h-64">
            {dadosPizzaNome.length === 0 ? (
              <div className={`flex h-full items-center justify-center text-center text-sm ${fuTextMuted}`}>
                Sem vendas no período
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
          Cada retângulo reflete a participação dos indicadores financeiros no período.
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
