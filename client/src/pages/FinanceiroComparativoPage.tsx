import { useMemo, useState, Fragment } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
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
import type { StatusRubricaComparativo } from "@shared/financeiroComparativoProjecao";

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

function statusLabel(s: StatusRubricaComparativo): string {
  switch (s) {
    case "em_dia":
      return "Em dia";
    case "faltando":
      return "Falta pagar";
    case "pago_a_mais":
      return "Pago a mais";
    case "pago_em_atraso":
      return "Pago em atraso";
    case "nao_programada":
      return "Não programada";
  }
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

export default function FinanceiroComparativoPage() {
  const [mes, setMes] = useState(mesAtualYm);
  const utils = trpc.useUtils();

  const q = trpc.financeiroCfo.comparativoProjecao.useQuery(
    { mesYm: mes },
    { staleTime: 60_000 },
  );

  const d = q.data?.desembolso;
  const r = q.data?.receita;
  const caixa = q.data?.caixa;

  const rubricas = useMemo(() => d?.rubricas ?? [], [d?.rubricas]);
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());

  const toggleRubrica = (rubrica: string) => {
    setAbertas(prev => {
      const next = new Set(prev);
      if (next.has(rubrica)) next.delete(rubrica);
      else next.add(rubrica);
      return next;
    });
  };

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
      <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6">
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
              Comparativo por rúbrica
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Projeção × pago no Conta Azul —{" "}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Kpi
                  title="Projetado"
                  value={fmtMoney(d?.totais.projetado)}
                  hint="Soma das rúbricas marcadas"
                />
                <Kpi
                  title="Já pago"
                  value={fmtMoney(d?.totais.pago)}
                  hint={
                    d?.totais.pctPagoDoProjetado != null
                      ? `${fmtPct(d.totais.pctPagoDoProjetado).replace("+", "")} do plano (sem atraso)`
                      : "Conta Azul no mês"
                  }
                />
                <Kpi
                  title="Ainda não pago"
                  value={fmtMoney(d?.totais.naoPago)}
                  hint="Projetado − pago no plano"
                />
                <Kpi
                  title="Pago a mais"
                  value={fmtMoney(d?.totais.pagoAMais)}
                  hint="Passou do plano (não inclui atraso)"
                  tone={(d?.totais.pagoAMais ?? 0) > 0 ? "up" : "neutral"}
                />
                <Kpi
                  title="Pago em atraso"
                  value={fmtMoney(d?.totais.pagoEmAtraso)}
                  hint="Recorrente sem projeção no mês"
                  tone={(d?.totais.pagoEmAtraso ?? 0) > 0 ? "up" : "neutral"}
                />
              </div>
            </section>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por rúbrica</CardTitle>
                <p className="text-xs font-normal text-muted-foreground">
                  Clique na rúbrica para ver as linhas projetadas e os títulos
                  pagos no Conta Azul.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {rubricas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem projeção marcada nem pagamentos no mês.
                  </p>
                ) : (
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">Rúbrica</th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Projetado
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Pago
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Não pago
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          Pago a mais
                        </th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rubricas.map(rub => {
                        const aMais = rub.status === "pago_a_mais";
                        const falta = rub.status === "faltando";
                        const extra = rub.status === "nao_programada";
                        const atraso = rub.status === "pago_em_atraso";
                        const aberta = abertas.has(rub.rubrica);
                        const projetados = (rub.detalhes ?? []).filter(
                          x => x.origem === "projetado",
                        );
                        const pagos = (rub.detalhes ?? []).filter(
                          x => x.origem === "pago",
                        );
                        return (
                          <Fragment key={rub.rubrica}>
                            <tr className="border-b border-border/60 last:border-0">
                              <td className="py-2 pr-2">
                                <button
                                  type="button"
                                  className="flex max-w-full items-center gap-1 text-left font-medium hover:underline"
                                  onClick={() => toggleRubrica(rub.rubrica)}
                                >
                                  {aberta ? (
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="truncate">{rub.rubrica}</span>
                                </button>
                              </td>
                              <td className="py-2 pr-2 text-right tabular-nums">
                                {fmtMoney(rub.projetado)}
                              </td>
                              <td className="py-2 pr-2 text-right tabular-nums">
                                {fmtMoney(rub.pago)}
                              </td>
                              <td className="py-2 pr-2 text-right tabular-nums">
                                {fmtMoney(rub.naoPago)}
                              </td>
                              <td
                                className={`py-2 pr-2 text-right tabular-nums ${
                                  aMais || extra ? "text-red-600" : ""
                                }`}
                              >
                                {fmtMoney(rub.pagoAMais)}
                              </td>
                              <td
                                className={`py-2 text-xs ${
                                  aMais || extra
                                    ? "text-red-600"
                                    : atraso
                                      ? "text-amber-700"
                                      : falta
                                        ? "text-amber-700"
                                        : "text-emerald-700"
                                }`}
                              >
                                <span className="inline-flex items-center gap-0.5">
                                  {aMais || extra ? (
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  ) : falta || atraso ? (
                                    <ArrowDownRight className="h-3.5 w-3.5" />
                                  ) : null}
                                  {statusLabel(rub.status)}
                                </span>
                              </td>
                            </tr>
                            {aberta ? (
                              <tr className="border-b border-border/40 bg-muted/30">
                                <td colSpan={6} className="px-3 py-2">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Projetado ({projetados.length})
                                      </p>
                                      {projetados.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                          Nada marcado na grade.
                                        </p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {projetados.map(det => (
                                            <li
                                              key={det.id}
                                              className="flex items-start justify-between gap-2 text-xs"
                                            >
                                              <span className="min-w-0">
                                                <span className="block truncate font-medium">
                                                  {det.label}
                                                </span>
                                                {det.fornecedor ? (
                                                  <span className="text-muted-foreground">
                                                    {det.fornecedor}
                                                  </span>
                                                ) : null}
                                              </span>
                                              <span className="shrink-0 tabular-nums">
                                                {fmtMoney(det.valor)}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                    <div>
                                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Pago Conta Azul ({pagos.length})
                                      </p>
                                      {pagos.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                          Nenhum pagamento no mês.
                                        </p>
                                      ) : (
                                        <ul className="space-y-1">
                                          {pagos.map(det => (
                                            <li
                                              key={det.id}
                                              className="flex items-start justify-between gap-2 text-xs"
                                            >
                                              <span className="min-w-0">
                                                <span className="block truncate font-medium">
                                                  {det.label}
                                                </span>
                                                <span className="text-muted-foreground">
                                                  {[
                                                    det.fornecedor,
                                                    det.dataPagamento?.slice(
                                                      0,
                                                      10,
                                                    ),
                                                  ]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                                </span>
                                                {det.rubricaEditadaLocal ? (
                                                  <span className="mt-0.5 block text-[10px] text-amber-700">
                                                    Rúbrica editada aqui · no
                                                    Conta Azul:{" "}
                                                    {det.rubricaContaAzul ||
                                                      "—"}
                                                  </span>
                                                ) : det.rubricaContaAzul ? (
                                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                                    Categoria CA:{" "}
                                                    {det.rubricaContaAzul}
                                                  </span>
                                                ) : (
                                                  <span className="mt-0.5 block text-[10px] text-amber-700">
                                                    Sem categoria no Conta Azul
                                                    — busque pela NFe/descrição
                                                  </span>
                                                )}
                                              </span>
                                              <span className="shrink-0 tabular-nums">
                                                {fmtMoney(det.valor)}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Receita Conta Azul (totais)
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Kpi
                  title="Previsto"
                  value={fmtMoney(r?.previsto)}
                  hint="Vencimento no mês"
                />
                <Kpi
                  title="Recebido"
                  value={fmtMoney(r?.recebido)}
                  hint={
                    r?.pctRecebidoDoPrevisto != null
                      ? `${fmtPct(r.pctRecebidoDoPrevisto).replace("+", "")} do previsto`
                      : "Pagamento no mês"
                  }
                  tone="down"
                />
                <Kpi
                  title="A receber (mês)"
                  value={fmtMoney(r?.aReceberNoMes)}
                  hint="Em aberto c/ vencimento no mês"
                />
                <Kpi
                  title="Vencido"
                  value={fmtMoney(r?.vencido)}
                  hint="Em aberto com vencimento anterior"
                  tone={(r?.vencido ?? 0) > 0 ? "up" : "neutral"}
                />
                <Kpi
                  title="A receber (total)"
                  value={fmtMoney(r?.aReceber)}
                  hint="Mês + vencido"
                />
                <Kpi
                  title="Projeção média 2m"
                  value={fmtMoney(r?.projecaoMedia2m)}
                  hint={
                    r
                      ? `Média do recebido em ${labelMes(r.mesesMedia2m[0])} e ${labelMes(r.mesesMedia2m[1])}`
                      : "Média do recebido"
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Gap final"
                  value={fmtMoney(r?.gapFinal)}
                  hint="Previsto − (recebido + a receber total)"
                  tone={
                    (r?.gapFinal ?? 0) > 0
                      ? "up"
                      : (r?.gapFinal ?? 0) < 0
                        ? "down"
                        : "neutral"
                  }
                />
                <Kpi
                  title="Gap vs média 2m"
                  value={fmtMoney(r?.gapVsMedia2m)}
                  hint="Média 2m − (recebido + a receber total)"
                  tone={
                    (r?.gapVsMedia2m ?? 0) > 0
                      ? "up"
                      : (r?.gapVsMedia2m ?? 0) < 0
                        ? "down"
                        : "neutral"
                  }
                />
                <Kpi
                  title="Saldo caixa realizado"
                  value={fmtMoney(caixa?.saldoRealizado)}
                  hint="Recebido − desembolso pago"
                  tone={(caixa?.saldoRealizado ?? 0) >= 0 ? "down" : "up"}
                />
                <Kpi
                  title="Gap caixa"
                  value={fmtMoney(caixa?.gapCaixaMes)}
                  hint="(Recebido + a receber total) − desembolso projetado"
                />
              </div>
            </section>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              “Pago em atraso” = rúbrica recorrente (ex. vale-transporte) paga no
              mês sem estar na projeção — tipicamente competência do mês
              anterior. “Não programada” = gasto fora do plano. Descontos
              obtidos não entram como desembolso. Ajuste a grade em{" "}
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
