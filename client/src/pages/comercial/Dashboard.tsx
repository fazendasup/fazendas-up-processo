import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  LayoutGrid,
  Bell,
  DollarSign,
  MessageSquareWarning,
  PieChart as PieChartIcon,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  CHART,
  ChartAreaUnderLineDefs,
  ComparisonTreemap,
  buildChartTheme,
  chartAnimation,
  pieLegendDotColor,
  pieSliceSolidFill,
} from "@/components/comercial/charts";
import { useDashboardTour } from "@/components/comercial/dashboard/DashboardTour";
import { PeriodoFiltro } from "@/components/comercial/ui/PeriodoFiltro";
import { Spinner } from "@/components/comercial/ui/Spinner";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import {
  fuEyebrow,
  fuGlass,
  fuGlassHover,
  fuGlassSm,
  fuStat,
  fuTextMuted,
  fuTextStrong,
  fuTitleGradient,
  fuToolbar,
} from "@/lib/comercial/fuBrand";
import { useTheme } from "@/contexts/ThemeContext";
import { comercialPath } from "@/lib/comercial/routes";
import { hojeIsoLocal, intervaloDoPreset, type PeriodoPreset } from "@/lib/comercial/periodo";
import { useSyncContaAzul } from "@/hooks/useSyncContaAzul";
import { trpc } from "@/lib/trpc";

const ORDEM_TIPO_OPORTUNIDADE = ["UPSELL", "CROSS_SELL", "REATIVACAO", "NOVO_PRODUTO"] as const;
const TIPOS_CLIENTE = [
  { value: "RESTAURANTE", label: "Restaurante" },
  { value: "PLANO_ASSINATURA", label: "Plano de assinatura" },
  { value: "SUPERMERCADO", label: "Supermercado" },
  { value: "AVULSO", label: "Avulso" },
  { value: "OUTROS", label: "Outros" },
] as const;

function labelTipoOportunidade(tipo: string): string {
  const map: Record<string, string> = {
    UPSELL: "Upsell",
    CROSS_SELL: "Cross-sell",
    REATIVACAO: "Reativação",
    NOVO_PRODUTO: "Novo produto",
  };
  return map[tipo] ?? tipo.replace(/_/g, " ");
}

export function Dashboard() {
  const [, navigate] = useLocation();
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
  const lineActiveStroke = theme === "dark" ? "#030712" : "#f8fafc";

  const [preset, setPreset] = useState<PeriodoPreset>("mes_atual");
  const [customInicio, setCustomInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customFim, setCustomFim] = useState(hojeIsoLocal);
  const [busca, setBusca] = useState("");
  const { inicio, fim } = useMemo(
    () =>
      intervaloDoPreset(preset, {
        inicio: customInicio,
        fim: customFim,
      }),
    [preset, customInicio, customFim],
  );
  const { Tour, startTour } = useDashboardTour();

  const { sync, busy: syncBusy } = useSyncContaAzul();

  const resumo = trpc.comercial.dashboard.resumo.useQuery(
    { inicio, fim },
    { refetchInterval: 60_000, staleTime: 30_000 },
  );
  const serie = trpc.comercial.dashboard.serieFaturamento.useQuery({ inicio, fim, bucket: "day" }, { staleTime: 30_000 });

  type TotaisComp = { bruto: number; frete: number; desconto: number; liquido: number };

  const kpis = resumo.data?.kpis;
  const composicaoVendas = kpis?.composicaoVendas as TotaisComp | undefined;
  const composicaoPorTipo = kpis?.composicaoVendasPorTipo as
    | Record<string, TotaisComp>
    | undefined;
  const ticketMedioPorTipo = (kpis?.ticketMedioPorTipo ?? []) as Array<{
    tipo: string;
    total: number;
    pedidos: number;
    clientes: number;
    mesesCliente?: number;
    ticketMedio: number;
    ticketMedioPorCliente: number;
  }>;

  const dadosBarras = useMemo(() => {
    if (!composicaoPorTipo) return [];
    return TIPOS_CLIENTE.map((tipo) => ({
      nome: tipo.label,
      valor: composicaoPorTipo[tipo.value]?.liquido ?? 0,
    }));
  }, [composicaoPorTipo]);

  /** Mix por tipo de oportunidade (abertas / em contato) — ordenado e com rótulos legíveis */
  const dadosPizzaMix = useMemo(() => {
    const rows = resumo.data?.oportunidadesPorTipo ?? [];
    const mapped = rows
      .filter((r) => r.total > 0)
      .map((r) => ({
        name: labelTipoOportunidade(r.tipo),
        value: r.total,
        tipo: r.tipo,
      }));
    mapped.sort((a, b) => {
      const ia = ORDEM_TIPO_OPORTUNIDADE.indexOf(a.tipo as (typeof ORDEM_TIPO_OPORTUNIDADE)[number]);
      const ib = ORDEM_TIPO_OPORTUNIDADE.indexOf(b.tipo as (typeof ORDEM_TIPO_OPORTUNIDADE)[number]);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
    return mapped;
  }, [resumo.data?.oportunidadesPorTipo]);

  const [modalFat, setModalFat] = useState(false);
  const [modalTicket, setModalTicket] = useState(false);

  const fmtMoney = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const fmtMoneyDetalhe = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const onBusca = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busca.trim();
    if (q) navigate(comercialPath("/clientes", { busca: q }));
    else toast.message("Digite um nome ou CNPJ para buscar na carteira.");
  };

  return (
    <div className="relative z-10">
      {Tour}

      {/* Toolbar do dashboard */}
      <motion.div data-tour="dash-toolbar" className={fuToolbar}>
        <motion.div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 md:px-8">
          <motion.div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <motion.div>
              <p className={fuEyebrow}>Inteligência comercial</p>
              <h1 className={`mt-1 text-3xl font-bold tracking-tight md:text-4xl ${fuTitleGradient}`}>Dashboard executivo</h1>
            </motion.div>
            <PeriodoFiltro
              preset={preset}
              onPresetChange={setPreset}
              customInicio={customInicio}
              customFim={customFim}
              onCustomInicio={setCustomInicio}
              onCustomFim={setCustomFim}
              className="lg:max-w-3xl"
            />
          </motion.div>
          <motion.div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => startTour()}
              className="rounded-xl border border-slate-200/90 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500/35 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:bg-white/10"
            >
              Tour guiado
            </button>
            <form onSubmit={onBusca} className="flex min-w-[220px] flex-1 md:max-w-md">
              <motion.div className="relative flex w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-cyan-500/50" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente, CNPJ…"
                  className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none ring-cyan-500/20 transition focus:border-cyan-500/50 focus:ring-2 dark:border-white/10 dark:bg-black/30 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-cyan-400/40"
                  aria-label="Busca global na carteira"
                />
              </motion.div>
            </form>
            <button
              type="button"
              disabled={syncBusy}
              onClick={() => sync.mutate()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_-4px_rgba(16,185,129,0.5)] transition hover:brightness-110 disabled:opacity-60"
            >
              {syncBusy ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
              Sync Conta Azul
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
        {/* Linha principal: 3 colunas */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Card 1 — KPIs principais (verde) */}
          <motion.section
            data-tour="dash-kpis"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`${fuGlass} ${fuGlassHover} border-emerald-400/15 p-6`}
          >
            <div className="mb-5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 shadow-[0_0_24px_-8px_rgba(16,185,129,0.5)]">
                  <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${fuTitleGradient}`}>KPIs principais</h2>
                  <p className={`text-sm ${fuTextMuted}`}>Receita e eficiência da carteira</p>
                </div>
              </div>
              <TooltipInfo text="Valor líquido das vendas (bruto + frete − desconto), alinhado ao relatório da Conta Azul. Clique no card para ver a composição." />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => setModalFat(true)}
                className={`group ${fuGlassSm} ${fuGlassHover} border-emerald-400/20 p-4 text-left`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-400/80">
                    Valor líquido
                  </span>
                  <DollarSign className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className={`mt-2 text-2xl font-bold ${fuTextStrong} ${fuStat}`}>{fmtMoney(composicaoVendas?.liquido ?? kpis?.vendasRealizadas ?? kpis?.faturamento ?? 0)}</div>
                <div className={`mt-1 text-xs ${fuTextMuted}`}>Vendas realizadas · clique para bruto, frete e desconto</div>
              </button>

              <div className={`${fuGlassSm} border-amber-400/25 p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-400/80">
                    Orçamentos
                  </span>
                  <DollarSign className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                </div>
                <div className={`mt-2 text-2xl font-bold ${fuTextStrong} ${fuStat}`}>{fmtMoney(kpis?.orcamentos ?? 0)}</div>
                <div className={`mt-1 text-xs ${fuTextMuted}`}>
                  {kpis?.pedidosOrcamento ?? 0} orçamento(s) no período
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalTicket(true)}
                className={`${fuGlassSm} ${fuGlassHover} border-sky-400/20 p-4 text-left`}
                title="Clique para ver o ticket médio por categoria."
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 dark:text-sky-400/80">
                    Ticket médio mensal
                  </span>
                  <span className={`text-[11px] font-semibold normal-case tracking-normal ${fuTextMuted}`}>Por cliente/mês</span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className={`text-2xl font-bold ${fuTextStrong} ${fuStat}`}>{fmtMoney(kpis?.ticketMedio ?? 0)}</div>
                  <TrendingUp className="h-5 w-5 text-sky-700 dark:text-sky-400" />
                </div>
                <div className={`mt-1 text-xs ${fuTextMuted}`}>
                  Base mensal por cliente:{" "}
                  <span className={`font-semibold text-slate-700 dark:text-slate-300 ${fuStat}`}>{fmtMoney(kpis?.ticketMedioPorCliente ?? 0)}</span>
                </div>
              </button>

              <div className={`${fuGlassSm} border-cyan-400/20 p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-400/80">
                    Clientes ativos
                  </span>
                  <Users className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />
                </div>
                <div className={`mt-2 text-2xl font-bold ${fuTextStrong} ${fuStat}`}>{kpis?.clientesAtivos ?? 0}</div>
                <div className={`mt-1 text-xs ${fuTextMuted}`}>
                  Com pedido no período:{" "}
                  <span className={`font-semibold text-slate-700 dark:text-slate-300 ${fuStat}`}>{kpis?.clientesComPedido ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Líquido por tipo</span>
                  <p className={`text-xs ${fuTextMuted}`}>Categorias comerciais</p>
                </div>
                <LayoutGrid className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400/70" />
              </div>
              {/* Altura só no gráfico: evita ResponsiveContainer “vazar” e cobrir os botões abaixo */}
              <div className="relative h-52 w-full min-h-[12rem] overflow-hidden rounded-xl sm:h-56">
                <ComparisonTreemap
                  data={dadosBarras.map((d) => ({ name: d.nome, value: d.valor }))}
                  formatValue={fmtMoney}
                  aspectRatio={1.35}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200/80 pt-5 dark:border-white/10">
              <Link
                href={comercialPath("/kpis")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_-4px_rgba(59,130,246,0.5)] transition hover:brightness-110"
              >
                Ver relatórios <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={comercialPath("/clientes")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-cyan-500/35 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:bg-white/10"
              >
                Abrir carteira
              </Link>
            </div>
          </motion.section>

          {/* Card 2 — Oportunidades (azul) */}
          <motion.section
            data-tour="dash-oportunidades"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className={`${fuGlass} ${fuGlassHover} border-sky-400/15 p-6`}
          >
            <div className="mb-5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 to-blue-600/10">
                  <Target className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${fuTitleGradient}`}>Oportunidades</h2>
                  <p className={`text-sm ${fuTextMuted}`}>Priorize upsell, cross-sell e reativação</p>
                </div>
              </div>
              <TooltipInfo text="Contagem e potencial somam oportunidades abertas ou em contato, com base nas regras e dados da Conta Azul." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`${fuGlassSm} border-blue-400/25 p-4`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-800 dark:text-sky-400/80">Abertas</div>
                <div className={`mt-1 text-3xl font-bold ${fuTextStrong} ${fuStat}`}>{kpis?.oportunidadesAbertas ?? 0}</div>
                <div className={`mt-1 text-xs ${fuTextMuted}`}>Potencial estimado</div>
                <div className={`text-lg font-bold text-sky-900 dark:text-sky-200 ${fuStat}`}>{fmtMoney(kpis?.potencialOportunidades ?? 0)}</div>
              </div>
              <div className={`${fuGlassSm} min-w-0 p-4`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <PieChartIcon className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
                  Upsell / Cross-sell
                </div>
                <p className={`mt-0.5 text-[11px] leading-snug ${fuTextMuted}`}>
                  Distribuição das oportunidades abertas por tipo
                </p>
                {dadosPizzaMix.length === 0 ? (
                  <div
                    className={`mt-3 flex min-h-[9rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 text-center text-xs dark:border-white/15 dark:bg-white/5 ${fuTextMuted}`}
                  >
                    Nenhuma oportunidade aberta para montar o gráfico.
                  </div>
                ) : (
                  <>
                    <div className="mt-2 h-40 w-full min-h-0 sm:h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                          <Pie
                            data={dadosPizzaMix}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={68}
                            paddingAngle={dadosPizzaMix.length > 1 ? 2 : 0}
                            stroke={pieStroke}
                            strokeWidth={1.5}
                            isAnimationActive
                          >
                            {dadosPizzaMix.map((row, i) => (
                              <Cell key={`${row.tipo}-${i}`} fill={pieSliceSolidFill(i)} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            {...chartTooltipProps}
                            formatter={(value: number, name: string) => [
                              `${value} oportunidade${value === 1 ? "" : "s"}`,
                              name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-200/80 pt-2 text-[11px] font-semibold dark:border-white/10">
                      {dadosPizzaMix.map((row, i) => (
                        <li key={row.tipo} className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: pieLegendDotColor(i) }}
                            aria-hidden
                          />
                          <span>
                            {row.name}: {row.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Top oportunidades</div>
              <ul className="space-y-2">
                {(resumo.data?.topOportunidades ?? []).slice(0, 5).map((o) => (
                  <li
                    key={o.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{o.cliente.nome}</div>
                      <div className={`truncate text-xs ${fuTextMuted}`}>{o.descricao}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">{o.prioridade}</div>
                      <div className={`text-xs font-bold ${fuTextStrong} ${fuStat}`}>
                        {o.valorEstimado != null ? fmtMoney(o.valorEstimado) : "—"}
                      </div>
                    </div>
                  </li>
                ))}
                {(resumo.data?.topOportunidades?.length ?? 0) === 0 ? (
                  <li className={`rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm dark:border-white/15 dark:bg-white/5 ${fuTextMuted}`}>
                    Sem oportunidades abertas ainda. Sincronize dados e rode regras no backend.
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={comercialPath("/oportunidades")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_-4px_rgba(16,185,129,0.45)] transition hover:brightness-110"
              >
                Ver lista completa <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={comercialPath("/oportunidades")}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/35 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                Gerar ação
              </Link>
            </div>
          </motion.section>

          {/* Card 3 — Riscos & alertas (laranja) */}
          <motion.section
            data-tour="dash-alertas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className={`${fuGlass} ${fuGlassHover} border-amber-400/20 p-6`}
          >
            <div className="mb-5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-rose-600/10">
                  <Bell className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${fuTitleGradient}`}>Riscos e alertas</h2>
                  <p className={`text-sm ${fuTextMuted}`}>O que precisa de atenção hoje</p>
                </div>
              </div>
              <TooltipInfo text="Clientes em risco usam o status sincronizado/calculado. Mensagens pendentes exigem aprovação antes do envio via ManyChat." />
            </div>

            <div className="space-y-3">
              <div
                className={`${fuGlassSm} border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-950/20`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Clientes em risco</div>
                      <div className={`text-sm text-slate-700 dark:text-slate-400`}>
                        <span className={`text-2xl font-bold text-rose-700 dark:text-rose-300 ${fuStat}`}>{kpis?.clientesEmRisco ?? 0}</span>{" "}
                        — Aja agora para reter receita.
                      </div>
                    </div>
                  </div>
                  <Link
                    href={comercialPath("/clientes", { filtro: "risco" })}
                    className="shrink-0 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-900 shadow-sm transition hover:bg-rose-100 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                  >
                    Priorizar
                  </Link>
                </div>
              </div>

              <div
                className={`${fuGlassSm} border-amber-200 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-950/15`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <MessageSquareWarning className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Mensagens pendentes</div>
                      <div className={`text-sm text-slate-700 dark:text-slate-400`}>
                        <span className={`text-2xl font-bold text-amber-800 dark:text-amber-300 ${fuStat}`}>{kpis?.mensagensPendentes ?? 0}</span>{" "}
                        aguardando aprovação
                      </div>
                    </div>
                  </div>
                  <Link
                    href={comercialPath("/mensagens")}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
                  >
                    Aprovar agora
                  </Link>
                </div>
              </div>

            </div>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className={`${fuGlass} ${fuGlassHover} border-emerald-400/15 p-6`}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className={`text-lg font-bold ${fuTitleGradient}`}>Evolução de vendas e orçamentos</div>
              <div className={`text-sm ${fuTextMuted}`}>Série diária — vendas realizadas vs orçamentos</div>
            </div>
            <TooltipInfo text="Soma dos pedidos por dia. Passe o mouse para ver o valor exato." />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie.data ?? []} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <ChartAreaUnderLineDefs prefix="dash-evo" colorMid={CHART.green.mid} />
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="periodo" interval="preserveStartEnd" minTickGap={24} {...chartAxisXProps} />
                <YAxis {...chartAxisYProps} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v))} />
                <RechartsTooltip
                  {...chartTooltipProps}
                  cursor={chartTooltipCursorLine}
                  formatter={(v: number, name: string) => [
                    fmtMoney(v),
                    name === "orcamentos" ? "Orçamentos" : "Vendas realizadas",
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="valor"
                  fill="url(#dash-evo-area)"
                  stroke="none"
                  isAnimationActive
                  animationDuration={500}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  name="vendas"
                  stroke={CHART.green.mid}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: lineActiveStroke, fill: CHART.green.mid }}
                  {...chartAnimation}
                />
                <Line
                  type="monotone"
                  dataKey="orcamentos"
                  name="orcamentos"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  {...chartAnimation}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      {/* Modal drill-down ticket médio por categoria */}
      <AnimatePresence>
        {modalTicket ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalTicket(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-2xl ${fuGlass} border-sky-400/20 p-6`}
              onClick={(ev) => ev.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Ticket médio por categoria"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-xl font-bold ${fuTitleGradient}`}>Ticket médio por categoria</div>
                  <div className={`mt-1 text-sm ${fuTextMuted}`}>Média mensal por cliente ativo no período filtrado</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm font-bold text-slate-700 hover:bg-slate-200/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => setModalTicket(false)}
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {TIPOS_CLIENTE.map((tipo) => {
                  const row = ticketMedioPorTipo.find((r) => r.tipo === tipo.value);
                  return (
                    <div
                      key={tipo.value}
                      className="rounded-xl border border-slate-200/90 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{tipo.label}</div>
                          <div className={`mt-0.5 text-xs ${fuTextMuted}`}>
                            {row?.pedidos ?? 0} pedido(s) · {row?.clientes ?? 0} cliente(s) · {row?.mesesCliente ?? 0} cliente-mês
                          </div>
                        </div>
                        <div className={`text-right text-lg font-bold text-sky-800 dark:text-sky-300 ${fuStat}`}>
                          {fmtMoneyDetalhe(row?.ticketMedio ?? 0)}
                        </div>
                      </div>
                      <div className={`mt-3 grid grid-cols-2 gap-2 text-[11px] ${fuTextMuted}`}>
                        <div>
                          <div>Total vendido</div>
                          <div className={`font-semibold text-slate-800 dark:text-slate-200 ${fuStat}`}>
                            {fmtMoneyDetalhe(row?.total ?? 0)}
                          </div>
                        </div>
                        <div>
                          <div>Média mensal/cliente</div>
                          <div className={`font-semibold text-slate-800 dark:text-slate-200 ${fuStat}`}>
                            {fmtMoneyDetalhe(row?.ticketMedioPorCliente ?? 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end">
                <Link
                  href={comercialPath("/clientes")}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                  onClick={() => setModalTicket(false)}
                >
                  Classificar carteira
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Modal drill-down faturamento por tipo */}
      <AnimatePresence>
        {modalFat ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalFat(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-lg ${fuGlass} border-cyan-400/20 p-6`}
              onClick={(ev) => ev.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Composição do valor líquido"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-xl font-bold ${fuTitleGradient}`}>Composição das vendas</div>
                  <div className={`mt-1 text-sm ${fuTextMuted}`}>Bruto + frete − desconto (Conta Azul)</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm font-bold text-slate-700 hover:bg-slate-200/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => setModalFat(false)}
                >
                  Fechar
                </button>
              </div>
              {(kpis?.vendasComposicaoIncompleta ?? 0) > 0 ? (
                <p className="mt-3 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                  {kpis?.vendasComposicaoIncompleta} venda(s) ainda sem frete/desconto detalhados — rode{" "}
                  <strong>Sync Conta Azul</strong> para alinhar ao relatório da Conta Azul.
                </p>
              ) : null}
              <div className="mt-4 space-y-2 rounded-xl border border-emerald-400/25 bg-emerald-50/80 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
                {(
                  [
                    ["Valor bruto", composicaoVendas?.bruto ?? 0],
                    ["Frete", composicaoVendas?.frete ?? 0],
                    ["Desconto", -(composicaoVendas?.desconto ?? 0)],
                  ] as const
                ).map(([label, valor]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{label}</span>
                    <span
                      className={`font-semibold tabular-nums ${fuStat} ${valor < 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}
                    >
                      {valor < 0 ? `− ${fmtMoneyDetalhe(Math.abs(valor))}` : fmtMoneyDetalhe(valor)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-emerald-400/30 pt-2">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">Valor líquido</span>
                  <span className={`text-lg font-bold text-emerald-800 dark:text-emerald-400 ${fuStat}`}>
                    {fmtMoneyDetalhe(composicaoVendas?.liquido ?? kpis?.vendasRealizadas ?? 0)}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Por tipo de cliente (líquido)</div>
                <div className="space-y-3">
                  {(
                    TIPOS_CLIENTE.map((tipo) => ({ nome: tipo.label, comp: composicaoPorTipo?.[tipo.value] }))
                  ).map(({ nome, comp }) => (
                    <div
                      key={nome}
                      className="rounded-xl border border-slate-200/90 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{nome}</span>
                        <span className={`text-lg font-bold text-emerald-800 dark:text-emerald-400 ${fuStat}`}>
                          {fmtMoneyDetalhe(comp?.liquido ?? 0)}
                        </span>
                      </div>
                      {comp ? (
                        <div className={`mt-2 grid grid-cols-3 gap-2 text-[11px] ${fuTextMuted}`}>
                          <div>
                            <div>Bruto</div>
                            <div className={`font-semibold text-slate-700 dark:text-slate-300 ${fuStat}`}>{fmtMoneyDetalhe(comp.bruto)}</div>
                          </div>
                          <div>
                            <div>Frete</div>
                            <div className={`font-semibold text-slate-700 dark:text-slate-300 ${fuStat}`}>{fmtMoneyDetalhe(comp.frete)}</div>
                          </div>
                          <div>
                            <div>Desconto</div>
                            <div className={`font-semibold text-slate-700 dark:text-slate-300 ${fuStat}`}>{fmtMoneyDetalhe(comp.desconto)}</div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Link
                  href={comercialPath("/clientes")}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                  onClick={() => setModalFat(false)}
                >
                  Ir para carteira
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
