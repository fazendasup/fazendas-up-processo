import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ComparativoDesembolsoLinha } from "@shared/financeiroComparativoProjecao";

function mesAtualYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMes(ym: string): string {
  const [ys, ms] = ym.split("-");
  return new Date(Number(ys), Number(ms) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  const toneClass =
    tone === "up"
      ? "text-red-600"
      : tone === "down"
        ? "text-emerald-700"
        : "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-semibold tabular-nums ${toneClass}`}>
          {value}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function matchLabel(s: ComparativoDesembolsoLinha["matchStatus"]): string {
  switch (s) {
    case "matched":
      return "Projetado + pago";
    case "somente_projecao":
      return "Só projeção";
    default:
      return "Só realizado";
  }
}

export default function FinanceiroComparativoPage() {
  const [mes, setMes] = useState(mesAtualYm);
  const utils = trpc.useUtils();

  const q = trpc.financeiroCfo.comparativoProjecao.useQuery(
    { mesYm: mes },
    {
      staleTime: 60_000,
    },
  );

  const d = q.data?.desembolso;
  const r = q.data?.receita;
  const caixa = q.data?.caixa;

  const linhasTabela = useMemo(() => d?.linhas ?? [], [d?.linhas]);

  const recarregarCa = async () => {
    try {
      toast.message("Recarregando Conta Azul…");
      const data = await utils.financeiroCfo.comparativoProjecao.fetch({
        mesYm: mes,
        forceRefreshCa: true,
      });
      utils.financeiroCfo.comparativoProjecao.setData({ mesYm: mes }, data);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao recarregar Conta Azul",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/financeiro-cfo"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Financeiro Conta Azul
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              Comparativo projeção × realizado
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Desvio de desembolso e visão de receita para{" "}
              <span className="capitalize">{labelMes(mes)}</span>.
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

        {q.data?.avisos?.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            {q.data.avisos.join(" · ")}
          </div>
        ) : null}

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : q.isError ? (
          <p className="text-sm text-destructive">
            {(q.error as { message?: string })?.message ||
              "Erro ao carregar comparativo."}
          </p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Desembolso
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Projetado"
                  value={fmtMoney(d?.totais.projetado)}
                  hint="Células marcadas na grade"
                />
                <Kpi
                  title="Já desembolsado"
                  value={fmtMoney(d?.totais.realizado)}
                  hint={
                    d?.totais.pctRealizadoDoProjetado != null
                      ? `${fmtPct(d.totais.pctRealizadoDoProjetado).replace("+", "")} do projetado`
                      : undefined
                  }
                />
                <Kpi
                  title="Falta desembolsar"
                  value={fmtMoney(d?.totais.restanteADesembolsar)}
                  hint="Projetado − realizado (mín. 0)"
                  tone="neutral"
                />
                <Kpi
                  title="Desvio"
                  value={fmtMoney(d?.totais.desvio)}
                  hint={fmtPct(d?.totais.desvioPct)}
                  tone={
                    (d?.totais.desvio ?? 0) > 0
                      ? "up"
                      : (d?.totais.desvio ?? 0) < 0
                        ? "down"
                        : "neutral"
                  }
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Receita Conta Azul (a receber)
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Previsto (CA)"
                  value={fmtMoney(r?.previsto)}
                  hint="Títulos com vencimento no mês"
                />
                <Kpi
                  title="Recebido (CA)"
                  value={fmtMoney(r?.recebido)}
                  hint={
                    r?.pctRecebidoDoPrevisto != null
                      ? `${fmtPct(r.pctRecebidoDoPrevisto).replace("+", "")} do previsto`
                      : "Baixas com pagamento no mês"
                  }
                  tone="down"
                />
                <Kpi
                  title="A receber (CA)"
                  value={fmtMoney(r?.aReceber)}
                  hint="Em aberto com vencimento no mês"
                />
                <Kpi
                  title="Gap final"
                  value={fmtMoney(r?.gapFinal)}
                  hint="Previsto − (recebido + a receber)"
                  tone={
                    (r?.gapFinal ?? 0) > 0
                      ? "up"
                      : (r?.gapFinal ?? 0) < 0
                        ? "down"
                        : "neutral"
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi
                  title="Gap recebimento"
                  value={fmtMoney(r?.gapRecebimento)}
                  hint="Previsto − recebido"
                />
                <Kpi
                  title="Saldo caixa realizado"
                  value={fmtMoney(caixa?.saldoRealizado)}
                  hint="Recebido CA − desembolsado no mês"
                  tone={
                    (caixa?.saldoRealizado ?? 0) >= 0 ? "down" : "up"
                  }
                />
                <Kpi
                  title="Gap caixa (pipeline − proj. desembolso)"
                  value={fmtMoney(caixa?.gapCaixaMes)}
                  hint="(Recebido + a receber) − desembolso projetado"
                />
              </div>
            </section>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Títulos a receber (Conta Azul)
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {(r?.linhas?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum título a receber no Conta Azul para este mês.
                  </p>
                ) : (
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Descrição</th>
                        <th className="py-2 pr-2 font-medium">Cliente</th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Previsto
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Recebido
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          A receber
                        </th>
                        <th className="py-2 font-medium">Venc. / Pag.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(r?.linhas ?? []).slice(0, 80).map(lin => (
                        <tr
                          key={lin.parcelaId}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="max-w-[260px] truncate py-2 pr-2 font-medium">
                            {lin.label}
                          </td>
                          <td className="max-w-[160px] truncate py-2 pr-2 text-xs text-muted-foreground">
                            {lin.cliente || "—"}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmtMoney(lin.previsto)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums text-emerald-700">
                            {fmtMoney(lin.recebido)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmtMoney(lin.aReceber)}
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">
                            {lin.vencimento?.slice(0, 10) || "—"}
                            {lin.pagamento
                              ? ` · pago ${lin.pagamento.slice(0, 10)}`
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Desvio por linha (desembolso)
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {linhasTabela.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem linhas projetadas marcadas nem pagamentos no mês.
                  </p>
                ) : (
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Descrição</th>
                        <th className="py-2 pr-2 font-medium">Rúbrica</th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Projetado
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Realizado
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Restante
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Desvio
                        </th>
                        <th className="py-2 font-medium">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasTabela.map(lin => {
                        const estouro = lin.desvio > 0;
                        const abaixo = lin.desvio < 0;
                        return (
                          <tr
                            key={lin.linhaId}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="max-w-[280px] py-2 pr-2">
                              <div className="truncate font-medium">
                                {lin.label}
                              </div>
                              {lin.fornecedor ? (
                                <div className="truncate text-xs text-muted-foreground">
                                  {lin.fornecedor}
                                </div>
                              ) : null}
                            </td>
                            <td className="py-2 pr-2 text-xs text-muted-foreground">
                              {lin.rubrica || "—"}
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">
                              {fmtMoney(lin.projetado)}
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">
                              {fmtMoney(lin.realizado)}
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">
                              {fmtMoney(lin.restanteADesembolsar)}
                            </td>
                            <td
                              className={`py-2 pr-2 text-right tabular-nums ${
                                estouro
                                  ? "text-red-600"
                                  : abaixo
                                    ? "text-emerald-700"
                                    : ""
                              }`}
                            >
                              <span className="inline-flex items-center justify-end gap-0.5">
                                {estouro ? (
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                ) : abaixo ? (
                                  <ArrowDownRight className="h-3.5 w-3.5" />
                                ) : null}
                                {fmtMoney(lin.desvio)}
                                <span className="text-xs text-muted-foreground">
                                  {fmtPct(lin.desvioPct)}
                                </span>
                              </span>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {matchLabel(lin.matchStatus)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Desvio positivo no desembolso = gastou mais que o projetado. Receita
              vem só do Conta Azul (contas a receber). Ajuste a grade em{" "}
              <Link href="/financeiro-cfo" className="underline">
                Projeção de desembolso
              </Link>
              .
            </p>
          </>
        )}
      </main>
    </div>
  );
}
