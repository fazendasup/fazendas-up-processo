import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
  ChartAreaUnderLineDefs,
  ChartBarFillDefs,
  barFillUrl,
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

function labelGapVendas(desvio: number | null | undefined): {
  title: string;
  value: string;
  hint: string;
  tone: "up" | "down" | "neutral";
} {
  const d = desvio ?? 0;
  if (d < -0.009) {
    return {
      title: "Falta para a projeção",
      value: fmtMoney(Math.abs(d)),
      hint: "Quanto ainda falta no volume para fechar a projeção do mês",
      tone: "up",
    };
  }
  if (d > 0.009) {
    return {
      title: "Acima da projeção",
      value: fmtMoney(d),
      hint: "Realizado já passou a projeção de fechar o mês",
      tone: "down",
    };
  }
  return {
    title: "Na projeção",
    value: fmtMoney(0),
    hint: "Realizado igual à projeção",
    tone: "neutral",
  };
}

function labelGapDesembolso(desvio: number | null | undefined): {
  title: string;
  value: string;
  hint: string;
  tone: "up" | "down" | "neutral";
} {
  const d = desvio ?? 0;
  if (d > 0.009) {
    return {
      title: "Pagou além do plano",
      value: fmtMoney(d),
      hint: "Pago − projetado (gastou mais que a grade)",
      tone: "up",
    };
  }
  if (d < -0.009) {
    return {
      title: "Ainda cabe no plano",
      value: fmtMoney(Math.abs(d)),
      hint: "Projetado − pago (ainda não gastou tudo do plano)",
      tone: "down",
    };
  }
  return {
    title: "No plano",
    value: fmtMoney(0),
    hint: "Pago igual ao projetado",
    tone: "neutral",
  };
}

function textoVsProjecao(desvio: number, aberto: boolean): string {
  if (!aberto) return "—";
  if (desvio < -0.009) return `faltam ${fmtMoney(Math.abs(desvio))}`;
  if (desvio > 0.009) return `+${fmtMoney(desvio).replace("R$", "").trim()}`;
  return "ok";
}

function Kpi({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "up" | "down" | "neutral";
}) {
  const toneCls =
    tone === "up"
      ? "text-red-600"
      : tone === "down"
        ? "text-emerald-700"
        : "text-foreground";
  return (
    <Card>
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
      </CardContent>
    </Card>
  );
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
    <div className="rounded-xl border border-border/80 bg-card/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
      <p className="mb-1.5 text-xs font-semibold capitalize text-foreground">
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
            <span className="tabular-nums font-semibold text-foreground">
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
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
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
  const [mes, setMes] = useState(mesAtualYm);
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
    chartTooltipCursorLine,
  } = chartTheme;
  const lineActiveStroke = theme === "dark" ? "#0f172a" : "#fff";

  const q = trpc.financeiroCfo.dashboard.useQuery(
    { mesYm: mes },
    { staleTime: 60_000 },
  );

  const data = q.data;
  const atual = data?.mesAtual;
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
        vendasReal: m.vendasReal,
        vendasProjetado: m.vendasProjetado,
        desvioVendas: m.desvioVendas,
        desvioVendasPct: m.desvioVendasPct,
        desembolsoPago: m.desembolsoPago,
        desembolsoProjetado: m.desembolsoProjetado,
        desvioDesembolso: m.desvioDesembolso,
        desvioDesembolsoPct: m.desvioDesembolsoPct,
        recebido: m.recebido,
        saldo: m.saldoCaixa,
        aReceber: m.aReceber,
      })),
    [data?.serie3Meses],
  );

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

  const gapVendas = labelGapVendas(atual?.desvioVendas);
  const gapDesembolso = labelGapDesembolso(atual?.desvioDesembolso);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Financeiro
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Projeção × real em 3 meses, desembolso, caixa e faturamento.
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

        {data?.avisos?.length ? (
          <div className="rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {data.avisos.join(" · ")}
          </div>
        ) : null}

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando dashboard…</p>
        ) : q.isError ? (
          <p className="text-sm text-destructive">
            {(q.error as { message?: string })?.message ||
              "Erro ao carregar dashboard."}
          </p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Mês selecionado — projeção × real
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Projeção de fechar (caixa)"
                  value={fmtMoney(pv?.projecaoMesTotal)}
                  hint={
                    pv
                      ? `Recebido + em aberto + ainda entra ${fmtMoney(pv.aindaEntraProjetado)}`
                      : undefined
                  }
                />
                <Kpi
                  title="Realizado (volume)"
                  value={fmtMoney(atual?.vendasReal)}
                  hint={`Faturado ${fmtMoney(atual?.vendasFaturadas)} · orç. ${fmtMoney(atual?.orcamentos)}`}
                />
                <Kpi
                  title={gapVendas.title}
                  value={gapVendas.value}
                  hint={
                    gapVendas.hint +
                    " (volume: faturado+orçamento vs projeção de volume)"
                  }
                  tone={gapVendas.tone}
                />
                <Kpi
                  title="Caixa previsto vs desembolso"
                  value={fmtMoney(data?.caixa.gapCaixaMes)}
                  hint="Projeção caixa − desembolso projetado"
                  tone={
                    (data?.caixa.gapCaixaMes ?? 0) >= 0 ? "down" : "up"
                  }
                />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartShell
                title="Vendas — trajetória 3 meses"
                description="Área = realizado · linha tracejada = projeção de fechar. No mês aberto o gap fica explícito."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={serie}
                    margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                  >
                    <ChartAreaUnderLineDefs
                      prefix="fin-vendas"
                      colorMid={CHART.green.mid}
                    />
                    <defs>
                      <linearGradient
                        id="fin-vendas-proj-area"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={CHART.blue.mid}
                          stopOpacity={0.14}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART.blue.mid}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="nome" {...chartAxisXProps} />
                    <YAxis
                      {...chartAxisYProps}
                      tickFormatter={fmtMoneyShort}
                      width={48}
                    />
                    <Tooltip
                      cursor={chartTooltipCursorLine}
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
                                label: "Realizado",
                                value: fmtMoney(row.vendasReal),
                                accent: CHART.green.dark,
                              },
                              {
                                label: "Projetado",
                                value: fmtMoney(row.vendasProjetado),
                                accent: CHART.blue.stroke,
                              },
                              {
                                label:
                                  row.desvioVendas < 0
                                    ? "Falta p/ projeção"
                                    : row.desvioVendas > 0
                                      ? "Acima da projeção"
                                      : "vs projeção",
                                value:
                                  row.aberto
                                    ? textoVsProjecao(
                                        row.desvioVendas,
                                        row.aberto,
                                      )
                                    : "—",
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
                    <Area
                      type="monotone"
                      dataKey="vendasProjetado"
                      name="Projeção"
                      stroke="none"
                      fill="url(#fin-vendas-proj-area)"
                      legendType="none"
                      {...chartAnimation}
                    />
                    <Area
                      type="monotone"
                      dataKey="vendasReal"
                      name="Realizado"
                      stroke="none"
                      fill="url(#fin-vendas-area)"
                      legendType="none"
                      {...chartAnimation}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendasProjetado"
                      name="Projeção"
                      stroke={CHART.blue.stroke}
                      strokeWidth={2.25}
                      strokeDasharray="6 4"
                      dot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke: lineActiveStroke,
                        fill: CHART.blue.stroke,
                      }}
                      activeDot={{ r: 6 }}
                      {...chartAnimation}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendasReal"
                      name="Realizado"
                      stroke={CHART.green.dark}
                      strokeWidth={2.75}
                      dot={{
                        r: 4.5,
                        strokeWidth: 2,
                        stroke: lineActiveStroke,
                        fill: CHART.green.dark,
                      }}
                      activeDot={{ r: 7 }}
                      {...chartAnimation}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartShell>

              <ChartShell
                title="Desembolso — plano × executado"
                description="Barras = pago no Conta Azul · linha = projetado na grade."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={serie}
                    margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                  >
                    <ChartBarFillDefs prefix="fin-des" />
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="nome" {...chartAxisXProps} />
                    <YAxis
                      {...chartAxisYProps}
                      tickFormatter={fmtMoneyShort}
                      width={48}
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
                                label: "Pago",
                                value: fmtMoney(row.desembolsoPago),
                                accent: CHART.green.dark,
                              },
                              {
                                label: "Projetado",
                                value: fmtMoney(row.desembolsoProjetado),
                                accent: "#b45309",
                              },
                              {
                                label:
                                  row.desvioDesembolso > 0
                                    ? "Além do plano"
                                    : row.desvioDesembolso < 0
                                      ? "Cabe no plano"
                                      : "vs plano",
                                value: fmtMoney(Math.abs(row.desvioDesembolso)),
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
                      dataKey="desembolsoPago"
                      name="Pago"
                      fill={barFillUrl("fin-des", "green")}
                      radius={[6, 6, 2, 2]}
                      maxBarSize={42}
                      {...chartAnimation}
                    />
                    <Line
                      type="monotone"
                      dataKey="desembolsoProjetado"
                      name="Projetado"
                      stroke="#b45309"
                      strokeWidth={2.5}
                      strokeDasharray="5 4"
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
            </div>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Desembolso do mês
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Kpi
                  title="Projetado"
                  value={fmtMoney(des?.projetado)}
                />
                <Kpi
                  title="Já pago"
                  value={fmtMoney(des?.pago)}
                  hint={
                    des?.pctPagoDoProjetado != null
                      ? `${fmtPct(des.pctPagoDoProjetado).replace("+", "")} do plano`
                      : undefined
                  }
                />
                <Kpi title="Ainda não pago" value={fmtMoney(des?.naoPago)} />
                <Kpi
                  title={gapDesembolso.title}
                  value={gapDesembolso.value}
                  hint={gapDesembolso.hint}
                  tone={gapDesembolso.tone}
                />
                <Kpi
                  title="Fora do plano"
                  value={fmtMoney(des?.pagoEmAtraso)}
                  hint="Recorrente pago sem estar na projeção deste mês"
                  tone={(des?.pagoEmAtraso ?? 0) > 0 ? "up" : "neutral"}
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Caixa e faturamento
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Previsto (CA)"
                  value={fmtMoney(rec?.previsto)}
                  hint="Títulos Conta Azul com vencimento neste mês"
                />
                <Kpi
                  title="Já recebido"
                  value={fmtMoney(rec?.recebido)}
                  hint={
                    rec?.pctRecebidoDoPrevisto != null
                      ? `${fmtPct(rec.pctRecebidoDoPrevisto).replace("+", "")} do previsto`
                      : "Baixas no mês"
                  }
                  tone="down"
                />
                <Kpi
                  title="Ainda a receber"
                  value={fmtMoney(rec?.aReceberNoMes)}
                  hint="Em aberto, vence neste mês, data ainda não passou"
                />
                <Kpi
                  title="Vencido neste mês"
                  value={fmtMoney(rec?.vencido)}
                  hint="Em aberto, venceu neste mês e a data já passou"
                  tone={(rec?.vencido ?? 0) > 0 ? "up" : "neutral"}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Saldo caixa (recebido − pago)"
                  value={fmtMoney(data?.caixa.saldoRealizado)}
                  hint="Só o que já baixou no Conta Azul neste mês"
                  tone={
                    (data?.caixa.saldoRealizado ?? 0) >= 0 ? "down" : "up"
                  }
                />
                <Kpi
                  title="Já faturado"
                  value={fmtMoney(rec?.vendasCompetencia.vendasFaturadas)}
                  hint="Pedidos faturados — volume, não é o mesmo que recebido"
                />
                <Kpi
                  title="Orçamentos no mês"
                  value={fmtMoney(rec?.vendasCompetencia.orcamentos)}
                  hint="Volume de orçamento (só conta se virar venda / caixa depois)"
                />
                <Kpi
                  title="Ainda entra (caixa proj.)"
                  value={fmtMoney(pv?.aindaEntraProjetado)}
                  hint={
                    pv
                      ? `Só categoria "Receitas de Vendas" · média últimos ${pv.diasRestantes} dia(s) jul/ago`
                      : undefined
                  }
                />
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Não some tudo.</strong>{" "}
                Conta Azul (previsto ≈ recebido + a receber + vencido) é{" "}
                <em>caixa por vencimento</em>. Faturado, orçamento e “ainda
                entra” são <em>volume de pedidos</em> — outra conta. Orçamento e
                “ainda entra” ainda não são dinheiro recebido.
              </p>
            </section>

            <ChartShell
              title="Caixa — recebido e saldo em 3 meses"
              description="Área = recebido Conta Azul · linha = saldo (recebido − desembolso pago). Linha zero de referência."
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={serie}
                  margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
                >
                  <ChartAreaUnderLineDefs
                    prefix="fin-caixa"
                    colorMid={CHART.blue.mid}
                  />
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
                    strokeOpacity={0.35}
                    strokeDasharray="4 4"
                  />
                  <Tooltip
                    cursor={chartTooltipCursorLine}
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
                              label: "Recebido",
                              value: fmtMoney(row.recebido),
                              accent: CHART.blue.stroke,
                            },
                            {
                              label: "Em aberto",
                              value: fmtMoney(row.aReceber),
                              muted: true,
                            },
                            {
                              label: "Saldo caixa",
                              value: fmtMoney(row.saldo),
                              accent:
                                row.saldo >= 0
                                  ? CHART.green.dark
                                  : "#dc2626",
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
                  <Area
                    type="monotone"
                    dataKey="recebido"
                    name="Recebido"
                    stroke="none"
                    fill="url(#fin-caixa-area)"
                    legendType="none"
                    {...chartAnimation}
                  />
                  <Line
                    type="monotone"
                    dataKey="recebido"
                    name="Recebido"
                    stroke={CHART.blue.stroke}
                    strokeWidth={2.25}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: lineActiveStroke,
                      fill: CHART.blue.stroke,
                    }}
                    {...chartAnimation}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo caixa"
                    stroke={CHART.green.dark}
                    strokeWidth={2.75}
                    dot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: lineActiveStroke,
                      fill: CHART.green.dark,
                    }}
                    activeDot={{ r: 7 }}
                    {...chartAnimation}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartShell>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumo da série</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Mês</th>
                      <th className="py-2 pr-2 text-right font-medium">
                        Vendas real
                      </th>
                      <th className="py-2 pr-2 text-right font-medium">
                        Vendas proj.
                      </th>
                      <th className="py-2 pr-2 text-right font-medium">
                        vs projeção
                      </th>
                      <th className="py-2 pr-2 text-right font-medium">
                        Desemb. pago
                      </th>
                      <th className="py-2 pr-2 text-right font-medium">
                        Desemb. proj.
                      </th>
                      <th className="py-2 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.serie3Meses ?? []).map(m => (
                      <tr
                        key={m.mesYm}
                        className={`border-b border-border/60 ${m.aberto ? "bg-muted/30" : ""}`}
                      >
                        <td className="py-2 pr-2 font-medium capitalize">
                          {m.labelMes}
                          {m.aberto ? (
                            <span className="ml-1.5 text-[10px] font-normal uppercase text-muted-foreground">
                              foco
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {fmtMoney(m.vendasReal)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                          {fmtMoney(m.vendasProjetado)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                          {textoVsProjecao(m.desvioVendas, m.aberto)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {fmtMoney(m.desembolsoPago)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                          {fmtMoney(m.desembolsoProjetado)}
                        </td>
                        <td
                          className={`py-2 text-right tabular-nums font-medium ${
                            m.saldoCaixa >= 0
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {fmtMoney(m.saldoCaixa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
