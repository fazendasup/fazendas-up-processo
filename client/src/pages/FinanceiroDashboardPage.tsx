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
  } = chartTheme;
  const lineActiveStroke = theme === "dark" ? "#0f172a" : "#fff";

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

  const desvioDes = des?.desvio ?? 0;
  const faltaPagar = des?.naoPago ?? 0;
  const aEntrarTitulos = (rec?.aReceberNoMes ?? 0) + (rec?.vencido ?? 0);

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
            {/* 1) Desembolso — só indicadores do mês */}
            <section className="space-y-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <ArrowDownRight className="h-4 w-4" />
                  Desembolso — plano do mês
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Grade de projeção × o que já saiu no Conta Azul.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Plano (projetado)"
                  value={fmtMoney(des?.projetado)}
                  hint="Soma ativa da grade de desembolso"
                />
                <Kpi
                  title="Executado (pago)"
                  value={fmtMoney(des?.pago)}
                  hint={
                    des?.pctPagoDoProjetado != null
                      ? `${fmtPct(des.pctPagoDoProjetado).replace("+", "")} do plano`
                      : "Baixas a pagar no mês"
                  }
                />
                <Kpi
                  title="Desvio"
                  value={fmtMoney(desvioDes)}
                  hint={
                    desvioDes > 0.009
                      ? "Pago acima do plano"
                      : desvioDes < -0.009
                        ? "Pago abaixo do plano"
                        : "Pago = plano"
                  }
                  tone={
                    desvioDes > 0.009
                      ? "up"
                      : desvioDes < -0.009
                        ? "down"
                        : "neutral"
                  }
                />
                <Kpi
                  title="Quanto falta"
                  value={fmtMoney(faltaPagar)}
                  hint="Plano − executado (o que ainda não saiu do projetado)"
                />
              </div>
            </section>

            {/* 2) Entradas — indicadores, sem misturar com desembolso */}
            <section className="space-y-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                  Entradas — caixa e vendas
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Não some os três: títulos em aberto e projeção de vendas são
                  camadas diferentes.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi
                  title="Entrou (recebido)"
                  value={fmtMoney(rec?.recebido)}
                  hint="Baixas Conta Azul neste mês"
                  tone="down"
                />
                <Kpi
                  title="Projetado a entrar (títulos)"
                  value={fmtMoney(aEntrarTitulos)}
                  hint={
                    (rec?.vencido ?? 0) > 0
                      ? `Em aberto no mês · ${fmtMoney(rec?.vencido)} já vencido`
                      : "Em aberto com vencimento neste mês"
                  }
                />
                <Kpi
                  title="Projetado de vendas (caixa)"
                  value={fmtMoney(pv?.aindaEntraProjetado)}
                  hint={
                    pv && pv.diasRestantes > 0
                      ? `Média "Receitas de Vendas" · últimos ${pv.diasRestantes} dias jul/ago — não some com títulos`
                      : "Sem dias restantes neste mês"
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Kpi
                  title="Vendas já faturadas"
                  value={fmtMoney(rec?.vendasCompetencia.vendasFaturadas)}
                  hint="Volume de pedidos venda no mês (não é caixa)"
                />
                <Kpi
                  title="Orçamentos no mês"
                  value={fmtMoney(rec?.vendasCompetencia.orcamentos)}
                  hint="Pipeline — só vira caixa depois de virar venda/NF"
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
