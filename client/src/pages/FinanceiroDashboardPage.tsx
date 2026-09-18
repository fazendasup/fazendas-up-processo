import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

const CHART_REAL = "#0f766e";
const CHART_PROJ = "#94a3b8";
const CHART_PAGO = "#b45309";
const CHART_DESP_PROJ = "#cbd5e1";

function mesAtualYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtMoneyShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
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

export default function FinanceiroDashboardPage() {
  const [mes, setMes] = useState(mesAtualYm);
  const utils = trpc.useUtils();

  const q = trpc.financeiroCfo.dashboard.useQuery(
    { mesYm: mes },
    { staleTime: 60_000 },
  );

  const data = q.data;
  const atual = data?.mesAtual;
  const pv = data?.projecaoVendas;
  const rec = data?.receita;
  const des = data?.desembolsoTotais;

  const chartVendas = useMemo(
    () =>
      (data?.serie3Meses ?? []).map(m => ({
        nome: m.labelMes.replace(/ de /i, "/").slice(0, 8),
        real: m.vendasReal,
        projetado: m.vendasProjetado,
        full: m.labelMes,
      })),
    [data?.serie3Meses],
  );

  const chartDesembolso = useMemo(
    () =>
      (data?.serie3Meses ?? []).map(m => ({
        nome: m.labelMes.replace(/ de /i, "/").slice(0, 8),
        pago: m.desembolsoPago,
        projetado: m.desembolsoProjetado,
        full: m.labelMes,
      })),
    [data?.serie3Meses],
  );

  const chartCaixa = useMemo(
    () =>
      (data?.serie3Meses ?? []).map(m => ({
        nome: m.labelMes.replace(/ de /i, "/").slice(0, 8),
        recebido: m.recebido,
        saldo: m.saldoCaixa,
        full: m.labelMes,
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

  const desvioVendasTone =
    (atual?.desvioVendas ?? 0) >= 0 ? "down" : "up";
  const desvioDesTone =
    (atual?.desvioDesembolso ?? 0) <= 0 ? "down" : "up";

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
                  title="Projeção de fechar o mês"
                  value={fmtMoney(atual?.vendasProjetado)}
                  hint={
                    pv
                      ? `Já no mês ${fmtMoney(pv.vendasJaNoMes)} + ainda entra ${fmtMoney(pv.aindaEntraProjetado)}`
                      : undefined
                  }
                />
                <Kpi
                  title="Realizado (volume)"
                  value={fmtMoney(atual?.vendasReal)}
                  hint={`Faturado ${fmtMoney(atual?.vendasFaturadas)} · orç. ${fmtMoney(atual?.orcamentos)}`}
                />
                <Kpi
                  title="Desvio vendas"
                  value={fmtMoney(atual?.desvioVendas)}
                  hint={
                    atual?.desvioVendasPct != null
                      ? `${fmtPct(atual.desvioVendasPct)} vs projeção`
                      : "Real − projetado"
                  }
                  tone={desvioVendasTone}
                />
                <Kpi
                  title="Caixa previsto vs desembolso"
                  value={fmtMoney(data?.caixa.gapCaixaMes)}
                  hint="Projeção do mês − desembolso projetado"
                  tone={
                    (data?.caixa.gapCaixaMes ?? 0) >= 0 ? "down" : "up"
                  }
                />
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Vendas — 3 meses (projeção × real)
                  </CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Nos meses fechados, projetado = realizado. No mês aberto,
                    projetado = fechar o mês.
                  </p>
                </CardHeader>
                <CardContent className="h-[280px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartVendas}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={fmtMoneyShort}
                        width={44}
                      />
                      <Tooltip
                        formatter={(v: number) => fmtMoney(v)}
                        labelFormatter={(_, p) =>
                          (p?.[0]?.payload as { full?: string })?.full ?? ""
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="projetado"
                        name="Projetado"
                        fill={CHART_PROJ}
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="real"
                        name="Real"
                        fill={CHART_REAL}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Desembolso — 3 meses (plano × pago)
                  </CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Projetado na grade × baixas no Conta Azul.
                  </p>
                </CardHeader>
                <CardContent className="h-[280px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartDesembolso}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={fmtMoneyShort}
                        width={44}
                      />
                      <Tooltip
                        formatter={(v: number) => fmtMoney(v)}
                        labelFormatter={(_, p) =>
                          (p?.[0]?.payload as { full?: string })?.full ?? ""
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="projetado"
                        name="Projetado"
                        fill={CHART_DESP_PROJ}
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="pago"
                        name="Pago"
                        fill={CHART_PAGO}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
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
                  title="Desvio (pago − plano)"
                  value={fmtMoney(atual?.desvioDesembolso)}
                  hint={
                    atual?.desvioDesembolsoPct != null
                      ? fmtPct(atual.desvioDesembolsoPct)
                      : undefined
                  }
                  tone={desvioDesTone}
                />
                <Kpi
                  title="Pago em atraso"
                  value={fmtMoney(des?.pagoEmAtraso)}
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
                  hint="Títulos com vencimento no mês"
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
                  title="Em aberto no mês"
                  value={fmtMoney(rec?.aReceber)}
                  hint={`A receber ${fmtMoney(rec?.aReceberNoMes)} · vencido ${fmtMoney(rec?.vencido)}`}
                />
                <Kpi
                  title="Saldo caixa (recebido − pago)"
                  value={fmtMoney(data?.caixa.saldoRealizado)}
                  tone={
                    (data?.caixa.saldoRealizado ?? 0) >= 0 ? "down" : "up"
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi
                  title="Já faturado"
                  value={fmtMoney(rec?.vendasCompetencia.vendasFaturadas)}
                />
                <Kpi
                  title="Orçamentos no mês"
                  value={fmtMoney(rec?.vendasCompetencia.orcamentos)}
                />
                <Kpi
                  title="Ainda entra (proj.)"
                  value={fmtMoney(pv?.aindaEntraProjetado)}
                  hint={
                    pv
                      ? `Média dos últimos ${pv.diasRestantes} dia(s) · 2 meses`
                      : undefined
                  }
                />
              </div>
            </section>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Recebido e saldo — 3 meses
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[260px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartCaixa}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={fmtMoneyShort}
                      width={44}
                    />
                    <Tooltip
                      formatter={(v: number) => fmtMoney(v)}
                      labelFormatter={(_, p) =>
                        (p?.[0]?.payload as { full?: string })?.full ?? ""
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="recebido"
                      name="Recebido"
                      fill={CHART_REAL}
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="saldo"
                      name="Saldo caixa"
                      fill={CHART_PAGO}
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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
                        Desvio
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
                        <td className="py-2 pr-2 text-right tabular-nums">
                          <span className="inline-flex items-center justify-end gap-0.5">
                            {m.desvioVendas > 0 ? (
                              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                            ) : m.desvioVendas < 0 ? (
                              <ArrowDownRight className="h-3 w-3 text-red-600" />
                            ) : null}
                            {fmtMoney(m.desvioVendas)}
                          </span>
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
