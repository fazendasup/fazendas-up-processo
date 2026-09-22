import { useMemo } from "react";
import { RefreshCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { FinanceiroCfoNav } from "@/components/financeiro/FinanceiroCfoNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function labelGrupo(g: string): string {
  if (g === "fixos") return "Fixos";
  if (g === "diaristas") return "Diaristas";
  if (g === "fornecedores") return "Fornecedores";
  return g;
}

function fmtMesYm(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  return `${m}/${y}`;
}

export default function FinanceiroFluxoReceitaPage() {
  const q = trpc.financeiroCfo.fluxoReceita.useQuery(
    { nMeses: 3 },
    { staleTime: 60_000 },
  );
  const data = q.data;

  const chartDiaMes = useMemo(() => {
    if (!data) return [];
    return data.porDiaMes
      .filter(d => d.dia <= 31 && (d.valorTotal > 0 || d.dia <= 28))
      .map(d => ({
        dia: String(d.dia),
        medio: d.valorMedioPorMes,
        acum: d.pctAcumulado,
      }));
  }, [data]);

  const chartSemana = useMemo(() => {
    if (!data) return [];
    return data.porDiaSemana.map(d => ({
      label: d.label.slice(0, 3),
      valor: d.valorTotal,
      pct: d.pct,
    }));
  }, [data]);

  const chartMensal = useMemo(() => {
    if (!data) return [];
    return data.serieMensal.map(m => ({
      mes: fmtMesYm(m.mesYm),
      entradas: m.entradasVendas,
      saidas:
        m.saidasFixos + m.saidasDiaristas + m.saidasFornecedores,
      saldo: m.entradasVendas - (m.saidasFixos + m.saidasDiaristas + m.saidasFornecedores),
    }));
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Fluxo pela receita
            </h1>
            <p className="text-sm text-muted-foreground">
              {data
                ? `${data.periodoInicio} → ${data.periodoFim} · ${data.nMeses} meses`
                : "Baixas de vendas Conta Azul"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FinanceiroCfoNav active="fluxo-receita" />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={q.isFetching}
              onClick={() => {
                void q.refetch().then(
                  () => toast.success("Atualizado"),
                  e =>
                    toast.error(
                      e instanceof Error ? e.message : "Falha ao atualizar",
                    ),
                );
              }}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {q.isLoading && (
          <p className="text-sm text-muted-foreground">Carregando baixas…</p>
        )}
        {q.isError && (
          <p className="text-sm text-destructive">
            {q.error.message || "Não foi possível carregar o fluxo."}
          </p>
        )}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                    Média mensal vendas (caixa)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {fmtMoney(data.mediaMensalVendas)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                    Saídas operacionais / mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {fmtMoney(data.cobertura.mediaSaidasOperacionais)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Fixos {fmtMoney(data.saidas.fixos.mediaMensal)} ·
                    Diaristas {fmtMoney(data.saidas.diaristas.mediaMensal)} ·
                    Fornec. {fmtMoney(data.saidas.fornecedores.mediaMensal)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                    Saldo médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      data.cobertura.saldoMedio >= 0
                        ? "text-emerald-700"
                        : "text-destructive"
                    }`}
                  >
                    {fmtMoney(data.cobertura.saldoMedio)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                    Cobertura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {fmtPct(data.cobertura.pctCobertura)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Quando pagar (pelo ritmo de entrada)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                        <th className="px-3 py-2">Grupo</th>
                        <th className="px-3 py-2">Quando</th>
                        <th className="px-3 py-2 text-right">Média / mês</th>
                        <th className="px-3 py-2 text-right">% da receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.janelas.map(j => (
                        <tr key={j.grupo} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">
                            {labelGrupo(j.grupo)}
                          </td>
                          <td className="px-3 py-2">{j.quando}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {fmtMoney(j.mediaMensal)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {fmtPct(j.pctDaReceitaMedia)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Entrada por dia do mês (média)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDiaMes}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={56} />
                      <Tooltip
                        formatter={(v: number) => fmtMoney(v)}
                        labelFormatter={l => `Dia ${l}`}
                      />
                      <Bar dataKey="medio" name="Média" fill="#059669" radius={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Entrada por dia da semana
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSemana}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={56} />
                      <Tooltip formatter={(v: number) => fmtMoney(v)} />
                      <Bar dataKey="valor" name="Total 3 meses" fill="#0284c7" radius={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Mês a mês: vendas × saídas operacionais
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartMensal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={64} />
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="entradas"
                      name="Vendas (caixa)"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="saidas"
                      name="Fixos+diaristas+fornec."
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="saldo"
                      name="Saldo"
                      stroke="#0284c7"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detalhe mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                        <th className="px-3 py-2">Mês</th>
                        <th className="px-3 py-2 text-right">Vendas</th>
                        <th className="px-3 py-2 text-right">Fixos</th>
                        <th className="px-3 py-2 text-right">Diaristas</th>
                        <th className="px-3 py-2 text-right">Fornecedores</th>
                        <th className="px-3 py-2 text-right">Saldo op.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.serieMensal.map(m => {
                        const saldoOp =
                          m.entradasVendas -
                          m.saidasFixos -
                          m.saidasDiaristas -
                          m.saidasFornecedores;
                        return (
                          <tr key={m.mesYm} className="border-b last:border-0">
                            <td className="px-3 py-2 font-medium">
                              {fmtMesYm(m.mesYm)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmtMoney(m.entradasVendas)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmtMoney(m.saidasFixos)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmtMoney(m.saidasDiaristas)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmtMoney(m.saidasFornecedores)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-semibold tabular-nums ${
                                saldoOp >= 0
                                  ? "text-emerald-700"
                                  : "text-destructive"
                              }`}
                            >
                              {fmtMoney(saldoOp)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
