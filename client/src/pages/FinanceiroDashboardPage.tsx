import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";
import {
  buildChartTheme,
  chartAnimation,
  CHART,
  ChartBarFillDefs,
  barFillUrl,
  pieLegendDotColor,
  pieSliceSolidFill,
} from "@/components/comercial/charts";

function mesAtualYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMesCurto(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const nome = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
  });
  return `${nome.replace(".", "")}/${String(y).slice(2)}`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtMoneyShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function Kpi({
  title,
  value,
  hint,
  tone,
  href,
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "up" | "down" | "neutral";
  href?: string;
}) {
  const toneCls =
    tone === "up"
      ? "text-red-600"
      : tone === "down"
        ? "text-emerald-700"
        : "text-foreground";
  const body = (
    <CardContent className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneCls}`}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {href ? (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-primary/80">
          Ver composição →
        </p>
      ) : null}
    </CardContent>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded-xl outline-none ring-offset-background transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring">
        <Card className="h-full cursor-pointer transition hover:border-primary/40 hover:shadow-sm">
          {body}
        </Card>
      </Link>
    );
  }
  return <Card>{body}</Card>;
}

type TipRow = { label: string; value: string; muted?: boolean; accent?: string };

function ChartTip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: TipRow[];
}) {
  if (!active || !rows.length) return null;
  return (
    <div className="relative z-50 min-w-[11rem] rounded-xl border border-border/80 bg-card px-3.5 py-2.5 shadow-lg">
      <p className="mb-1.5 truncate text-xs font-semibold text-foreground">
        {label}
      </p>
      <ul className="space-y-1">
        {rows.map(r => (
          <li
            key={r.label}
            className="flex items-baseline justify-between gap-6 text-[12px]"
          >
            <span
              className={
                r.muted ? "text-muted-foreground" : "font-medium text-foreground"
              }
            >
              {r.accent ? (
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ background: r.accent }}
                />
              ) : null}
              {r.label}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-foreground">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base tracking-tight">{title}</CardTitle>
        {description ? (
          <p className="text-xs font-normal leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="h-[320px] pt-2">{children}</CardContent>
    </Card>
  );
}

export default function FinanceiroDashboardPage() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const mesFromUrl = (() => {
    const m = new URLSearchParams(search).get("mes");
    return m && /^\d{4}-\d{2}$/.test(m) ? m : null;
  })();
  const [mes, setMes] = useState(mesFromUrl ?? mesAtualYm);
  const utils = trpc.useUtils();
  const { theme } = useTheme();
  const chartTheme = useMemo(
    () => buildChartTheme(theme === "dark" ? "dark" : "light"),
    [theme],
  );
  const {
    chartGridProps,
    chartAxisXProps,
    chartAxisYProps,
  } = chartTheme;
  const lineActiveStroke = theme === "dark" ? "#0f172a" : "#fff";

  const kpiHref = (kpi: string) =>
    `/financeiro-cfo/kpi/${kpi}?mes=${encodeURIComponent(mes)}`;

  const q = trpc.financeiroCfo.dashboard.useQuery(
    { mesYm: mes },
    { staleTime: 60_000 },
  );

  const data = q.data;
  const pv = data?.projecaoVendas;
  const rec = data?.receita;
  const des = data?.desembolsoTotais;

  const serie = useMemo(
    () =>
      (data?.serie3Meses ?? []).map(m => ({
        mesYm: m.mesYm,
        nome: labelMesCurto(m.mesYm),
        full: m.labelMes,
        aberto: m.aberto,
        recebido: m.recebido,
        desembolsoPago: m.desembolsoPago,
        saldo: m.saldoCaixa,
        vendasFaturadas: m.vendasFaturadas,
      })),
    [data?.serie3Meses],
  );

  const pizzaDesembolso = useMemo(() => {
    const rows = data?.desembolsoPorRubrica ?? [];
    if (!rows.length) return [] as Array<{
      name: string;
      value: number;
      pago: number;
      pct: number;
    }>;
    const topN = 6;
    const top = rows.slice(0, topN);
    const rest = rows.slice(topN);
    const outrosProj = rest.reduce((s, r) => s + r.projetado, 0);
    const outrosPago = rest.reduce((s, r) => s + r.pago, 0);
    const itens = [
      ...top.map(r => ({
        name: r.rubrica,
        value: r.projetado,
        pago: r.pago,
      })),
      ...(outrosProj > 0.009 || outrosPago > 0.009
        ? [{ name: "Outros", value: outrosProj, pago: outrosPago }]
        : []),
    ].filter(r => r.value > 0.009);
    const total = itens.reduce((s, r) => s + r.value, 0) || 1;
    return itens.map(r => ({
      ...r,
      pct: Math.round((r.value / total) * 1000) / 10,
    }));
  }, [data?.desembolsoPorRubrica]);

  const recarregarCa = async () => {
    try {
      toast.message("Recarregando Conta Azul…");
      const next = await utils.financeiroCfo.dashboard.fetch({
        mesYm: mes,
        forceRefreshCa: true,
      });
      utils.financeiroCfo.dashboard.setData({ mesYm: mes }, next);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao recarregar Conta Azul",
      );
    }
  };

  const aindaCabe = des?.naoPago ?? 0;
  const naoPlanejado = (des?.pagoEmAtraso ?? 0) + (des?.pagoAMais ?? 0);
  const pieStroke = theme === "dark" ? "#0f172a" : "#fff";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] space-y-8 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Financeiro
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Desembolso do plano, entradas de caixa e tendência em 3 meses.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Mês</Label>
              <Input
                type="month"
                className="h-9 w-[160px]"
                value={mes}
                onChange={e => setMes(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="h-9"
              disabled={q.isFetching}
              onClick={() => void q.refetch()}
            >
              <RefreshCcw
                className={`mr-1.5 h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
            <Button
              variant="secondary"
              className="h-9"
              disabled={q.isFetching}
              onClick={() => void recarregarCa()}
            >
              Recarregar CA
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/financeiro-cfo/comparativo"
            className="rounded-md border px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Comparativo por rúbrica
          </Link>
          <Link
            href="/financeiro-cfo/analise"
            className="rounded-md border px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Análise Conta Azul
          </Link>
        </div>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando dashboard…</p>
        ) : q.isError ? (
          <p className="text-sm text-destructive">
            {(q.error as { message?: string })?.message ||
              "Erro ao carregar dashboard."}
          </p>
        ) : (
          <>
            {/* 1) Desembolso — KPIs + donut por rúbrica */}
            <section className="space-y-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <ArrowDownRight className="h-4 w-4" />
                  Desembolso — plano do mês
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Totais do plano × composição por rúbrica.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Kpi
                    title="Plano (projetado)"
                    value={fmtMoney(des?.projetado)}
                    hint="Soma ativa da grade de desembolso"
                    href={kpiHref("plano")}
                  />
                  <Kpi
                    title="Executado (pago)"
                    value={fmtMoney(des?.pago)}
                    hint={
                      des?.pctPagoDoProjetado != null
                        ? `${fmtPct(des.pctPagoDoProjetado).replace("+", "")} do plano`
                        : "Baixas a pagar no mês"
                    }
                    href={kpiHref("executado")}
                  />
                  <Kpi
                    title="Quanto ainda cabe"
                    value={fmtMoney(aindaCabe)}
                    hint="Plano − executado (ainda não saiu do projetado)"
                    tone="down"
                    href={kpiHref("ainda-cabe")}
                  />
                  <Kpi
                    title="Não planejado"
                    value={fmtMoney(naoPlanejado)}
                    hint="Pago fora da grade (atraso / além do plano)"
                    tone={naoPlanejado > 0.009 ? "up" : "neutral"}
                    href={kpiHref("nao-planejado")}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base tracking-tight">
                      Plano por rúbrica
                    </CardTitle>
                    <p className="text-xs font-normal leading-relaxed text-muted-foreground">
                      Fatias = valor projetado na grade. Tooltip mostra o já
                      pago.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-1">
                    {pizzaDesembolso.length === 0 ? (
                      <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed px-3 text-center text-xs text-muted-foreground">
                        Sem rúbricas no plano deste mês.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative mx-auto h-48 w-full max-w-[220px] shrink-0 sm:mx-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pizzaDesembolso}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={78}
                                paddingAngle={
                                  pizzaDesembolso.length > 1 ? 2 : 0
                                }
                                stroke={pieStroke}
                                strokeWidth={2}
                                isAnimationActive
                              >
                                {pizzaDesembolso.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={pieSliceSolidFill(i)}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload }) => {
                                  const row = payload?.[0]?.payload as
                                    | (typeof pizzaDesembolso)[number]
                                    | undefined;
                                  if (!active || !row) return null;
                                  return (
                                    <ChartTip
                                      active
                                      label={row.name}
                                      rows={[
                                        {
                                          label: "No plano",
                                          value: fmtMoney(row.value),
                                          accent: CHART.blue.stroke,
                                        },
                                        {
                                          label: "Já pago",
                                          value: fmtMoney(row.pago),
                                          accent: CHART.green.dark,
                                        },
                                        {
                                          label: "Do plano",
                                          value: `${row.pct}%`,
                                          muted: true,
                                        },
                                      ]}
                                    />
                                  );
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Plano
                            </p>
                            <p className="text-sm font-semibold tabular-nums">
                              {fmtMoneyShort(des?.projetado ?? 0)}
                            </p>
                          </div>
                        </div>
                        <ul className="min-w-0 flex-1 space-y-1.5 text-[11px]">
                          {pizzaDesembolso.map((row, i) => (
                            <li
                              key={row.name}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: pieLegendDotColor(i),
                                  }}
                                  aria-hidden
                                />
                                <span className="truncate">{row.name}</span>
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {row.pct}% · {fmtMoneyShort(row.value)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* 2) Entradas — vencido separado */}
            <section className="space-y-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                  Entradas — caixa e vendas
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Não some títulos em aberto com projeção de vendas — são
                  camadas diferentes.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Entrou (recebido)"
                  value={fmtMoney(rec?.recebido)}
                  hint="Baixas Conta Azul neste mês"
                  tone="down"
                  href={kpiHref("entrou")}
                />
                <Kpi
                  title="A receber (no prazo)"
                  value={fmtMoney(rec?.aReceberNoMes)}
                  hint="Em aberto, vence neste mês, ainda não venceu"
                  href={kpiHref("a-receber")}
                />
                <Kpi
                  title="Em atraso"
                  value={fmtMoney(rec?.vencido)}
                  hint="Em aberto, venceu neste mês e a data já passou"
                  tone={(rec?.vencido ?? 0) > 0.009 ? "up" : "neutral"}
                  href={kpiHref("em-atraso")}
                />
                <Kpi
                  title="Projetado de vendas (caixa)"
                  value={fmtMoney(pv?.aindaEntraProjetado)}
                  hint={
                    pv && pv.diasRestantes > 0
                      ? `Média "Receitas de Vendas" · últimos ${pv.diasRestantes} dias jul/ago`
                      : "Sem dias restantes neste mês"
                  }
                  href={kpiHref("proj-vendas")}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Kpi
                  title="Vendas já faturadas"
                  value={fmtMoney(rec?.vendasCompetencia.vendasFaturadas)}
                  hint="Volume de pedidos venda no mês (não é caixa)"
                  href={kpiHref("faturado")}
                />
                <Kpi
                  title="Orçamentos no mês"
                  value={fmtMoney(rec?.vendasCompetencia.orcamentos)}
                  hint="Pipeline — só vira caixa depois de virar venda/NF"
                  href={kpiHref("orcamentos")}
                />
              </div>
            </section>

            {/* 3) Um gráfico: tendência 3 meses (o que os KPIs do mês não mostram) */}
            <ChartShell
              title="Tendência 3 meses — entrou × saiu"
              description="Barras = recebido · linha = desembolso pago. Saldo no tooltip."
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={serie}
                  margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
                >
                  <ChartBarFillDefs prefix="fin-fluxo" />
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="nome" {...chartAxisXProps} />
                  <YAxis
                    {...chartAxisYProps}
                    tickFormatter={fmtMoneyShort}
                    width={52}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="currentColor"
                    strokeOpacity={0.3}
                    strokeDasharray="4 4"
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                    content={({ active, payload, label }) => {
                      const row = payload?.[0]?.payload as
                        | (typeof serie)[number]
                        | undefined;
                      if (!row) return null;
                      return (
                        <ChartTip
                          active={active}
                          label={String(label)}
                          rows={[
                            {
                              label: "Entrou",
                              value: fmtMoney(row.recebido),
                              accent: CHART.blue.stroke,
                            },
                            {
                              label: "Saiu",
                              value: fmtMoney(row.desembolsoPago),
                              accent: "#b45309",
                            },
                            {
                              label: "Saldo (entrou − saiu)",
                              value: fmtMoney(row.saldo),
                              accent:
                                row.saldo >= 0 ? CHART.green.dark : "#dc2626",
                            },
                            {
                              label: "Faturado (volume)",
                              value: fmtMoney(row.vendasFaturadas),
                              muted: true,
                            },
                          ]}
                        />
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="recebido"
                    name="Entrou"
                    fill={barFillUrl("fin-fluxo", "blue")}
                    radius={[6, 6, 2, 2]}
                    maxBarSize={36}
                    {...chartAnimation}
                  />
                  <Line
                    type="monotone"
                    dataKey="desembolsoPago"
                    name="Saiu"
                    stroke="#b45309"
                    strokeWidth={2.5}
                    dot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: lineActiveStroke,
                      fill: "#b45309",
                    }}
                    activeDot={{ r: 7 }}
                    {...chartAnimation}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartShell>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Detalhe por rúbrica e baixas fica no{" "}
                <Link
                  href="/financeiro-cfo/comparativo"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  comparativo
                </Link>
                . Orçamento e “projetado de vendas” não devem ser somados aos
                títulos em aberto.
              </span>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
