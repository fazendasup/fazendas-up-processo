import { useMemo, useState, Fragment } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
  TrendingDown,
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
import {
  type ColumnFilterDef,
  useColumnTableFilters,
} from "@/lib/columnTableFilters";
import Header from "@/components/Header";
import { FinanceiroCfoNav } from "@/components/financeiro/FinanceiroCfoNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ComparativoDesembolsoRubrica,
  StatusRubricaComparativo,
} from "@shared/financeiroComparativoProjecao";

const RUBRICAS_COLUMNS: ColumnFilterDef<ComparativoDesembolsoRubrica>[] = [
  { key: "rubrica", label: "Rúbrica", value: r => r.rubrica },
  {
    key: "projetado",
    label: "Projetado",
    value: r => r.projetado,
    optionLabel: r => fmtMoney(r.projetado),
  },
  {
    key: "pago",
    label: "Pago",
    value: r => r.pago,
    optionLabel: r => fmtMoney(r.pago),
  },
  {
    key: "naoPago",
    label: "Não pago",
    value: r => r.naoPago,
    optionLabel: r => fmtMoney(r.naoPago),
  },
  {
    key: "pagoAMais",
    label: "Pago a mais",
    value: r => r.pagoAMais,
    optionLabel: r => fmtMoney(r.pagoAMais),
  },
  {
    key: "status",
    label: "Status",
    value: r => statusLabel(r.status),
  },
  {
    key: "concluida",
    label: "Concluída",
    value: r => (r.concluida === true ? "Sim" : "Não"),
  },
];

const COR_EXECUTADO = "#059669";
const COR_FALTA = "#d97706";
const COR_PASSOU = "#dc2626";
const COR_SALDO = "#0ea5e9";

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

function fmtMoneyShort(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) {
    return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return fmtMoney(n);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function encurtarNome(s: string, max = 22): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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
      return "Fora do plano";
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

  const rubricas = useMemo(() => d?.rubricas ?? [], [d?.rubricas]);
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());

  const {
    hasColumnFilters,
    clearColumnFilters,
    filterAndSortRows,
    renderColumnHeader,
  } = useColumnTableFilters("comparativo-rubricas");

  const rubricasFiltradas = useMemo(
    () => filterAndSortRows(rubricas, RUBRICAS_COLUMNS),
    [rubricas, filterAndSortRows],
  );

  const chartAindaFalta = useMemo(() => {
    return rubricasFiltradas
      .filter(
        r =>
          r.concluida !== true &&
          r.projetado > 0.009 &&
          (r.naoPago > 0.009 || r.pagoAMais > 0.009 || r.pago > 0.009),
      )
      .map(r => {
        const executado = Math.round(Math.min(r.pago, r.projetado) * 100) / 100;
        return {
          name: encurtarNome(r.rubrica),
          full: r.rubrica,
          executado,
          falta: Math.round(r.naoPago * 100) / 100,
          passou: Math.round(r.pagoAMais * 100) / 100,
        };
      })
      .filter(r => r.executado + r.falta + r.passou > 0.009)
      .sort((a, b) => b.falta + b.passou - (a.falta + a.passou))
      .slice(0, 14);
  }, [rubricasFiltradas]);

  const chartConcluidas = useMemo(() => {
    return rubricasFiltradas
      .filter(r => r.concluida === true && (r.pago > 0.009 || (r.saldoLiberado ?? 0) > 0.009))
      .map(r => ({
        name: encurtarNome(r.rubrica),
        full: r.rubrica,
        pago: Math.round(r.pago * 100) / 100,
        saldo: Math.round((r.saldoLiberado ?? 0) * 100) / 100,
        projetado: Math.round(r.projetado * 100) / 100,
      }))
      .sort((a, b) => b.pago + b.saldo - (a.pago + a.saldo))
      .slice(0, 14);
  }, [rubricasFiltradas]);

  const marcarConcluida = trpc.financeiroCfo.marcarRubricaConcluida.useMutation({
    onSuccess: async () => {
      await q.refetch();
      void utils.financeiroCfo.dashboard.invalidate();
    },
    onError: e => {
      toast.error(e.message || "Falha ao marcar rúbrica");
    },
  });

  const toggleRubrica = (rubrica: string) => {
    setAbertas(prev => {
      const next = new Set(prev);
      if (next.has(rubrica)) next.delete(rubrica);
      else next.add(rubrica);
      return next;
    });
  };

  const toggleConcluida = (rubrica: string, concluida: boolean) => {
    marcarConcluida.mutate({ mesYm: mes, rubrica, concluida: !concluida });
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
            <FinanceiroCfoNav active="comparativo" className="mb-3" />
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
                      ? `${fmtPct(d.totais.pctPagoDoProjetado).replace("+", "")} do plano (sem fora do plano)`
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
                  hint="Passou do plano (não inclui fora do plano)"
                  tone={(d?.totais.pagoAMais ?? 0) > 0 ? "up" : "neutral"}
                />
                <Kpi
                  title="Fora do plano"
                  value={fmtMoney(d?.totais.pagoEmAtraso)}
                  hint="Recorrente pago sem estar na projeção deste mês"
                  tone={(d?.totais.pagoEmAtraso ?? 0) > 0 ? "up" : "neutral"}
                />
              </div>
            </section>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">Por rúbrica</CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Clique na rúbrica para ver as linhas projetadas e os títulos
                    pagos no Conta Azul.
                  </p>
                  {hasColumnFilters ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rubricasFiltradas.length} de {rubricas.length} rúbrica(s)
                    </p>
                  ) : null}
                </div>
                {hasColumnFilters ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearColumnFilters}
                  >
                    Limpar filtros
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {rubricas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem projeção marcada nem pagamentos no mês.
                  </p>
                ) : rubricasFiltradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum resultado com os filtros atuais.
                  </p>
                ) : (
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-2 font-medium">
                          {renderColumnHeader(
                            "rubrica",
                            "Rúbrica",
                            rubricas,
                            RUBRICAS_COLUMNS,
                          )}
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          {renderColumnHeader(
                            "projetado",
                            "Projetado",
                            rubricas,
                            RUBRICAS_COLUMNS,
                            "right",
                          )}
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          {renderColumnHeader(
                            "pago",
                            "Pago",
                            rubricas,
                            RUBRICAS_COLUMNS,
                            "right",
                          )}
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          {renderColumnHeader(
                            "naoPago",
                            "Não pago",
                            rubricas,
                            RUBRICAS_COLUMNS,
                            "right",
                          )}
                        </th>
                        <th className="py-2 pr-2 text-right font-medium">
                          {renderColumnHeader(
                            "pagoAMais",
                            "Pago a mais",
                            rubricas,
                            RUBRICAS_COLUMNS,
                            "right",
                          )}
                        </th>
                        <th className="py-2 pr-2 font-medium">
                          {renderColumnHeader(
                            "status",
                            "Status",
                            rubricas,
                            RUBRICAS_COLUMNS,
                          )}
                        </th>
                        <th className="py-2 font-medium">
                          {renderColumnHeader(
                            "concluida",
                            "Concluída",
                            rubricas,
                            RUBRICAS_COLUMNS,
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rubricasFiltradas.map(rub => {
                        const aMais = rub.status === "pago_a_mais";
                        const falta = rub.status === "faltando";
                        const extra = rub.status === "nao_programada";
                        const atraso = rub.status === "pago_em_atraso";
                        const concluida = rub.concluida === true;
                        const podeConcluir = rub.pago > 0.009 && rub.projetado > 0.009;
                        const aberta = abertas.has(rub.rubrica);
                        const projetados = (rub.detalhes ?? []).filter(
                          x => x.origem === "projetado",
                        );
                        const pagos = (rub.detalhes ?? []).filter(
                          x => x.origem === "pago",
                        );
                        return (
                          <Fragment key={rub.rubrica}>
                            <tr
                              className={`border-b border-border/60 last:border-0 ${
                                concluida ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                              }`}
                            >
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
                                {concluida && (rub.saldoLiberado ?? 0) > 0.009 ? (
                                  <p className="mt-0.5 pl-5 text-[10px] text-emerald-700">
                                    Saldo liberado {fmtMoney(rub.saldoLiberado)}
                                  </p>
                                ) : null}
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
                                className={`py-2 pr-2 text-xs ${
                                  concluida
                                    ? "text-emerald-700"
                                    : aMais || extra
                                      ? "text-red-600"
                                      : atraso
                                        ? "text-amber-700"
                                        : falta
                                          ? "text-amber-700"
                                          : "text-emerald-700"
                                }`}
                              >
                                <span className="inline-flex items-center gap-0.5">
                                  {concluida ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : aMais || extra ? (
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  ) : falta || atraso ? (
                                    <ArrowDownRight className="h-3.5 w-3.5" />
                                  ) : null}
                                  {concluida ? "Concluída" : statusLabel(rub.status)}
                                </span>
                              </td>
                              <td className="py-2">
                                {podeConcluir || concluida ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={concluida ? "secondary" : "outline"}
                                    className="h-7 gap-1 px-2 text-[11px]"
                                    disabled={marcarConcluida.isPending}
                                    title={
                                      concluida
                                        ? "Desmarcar concluída (volta a cobrar o não pago no plano)"
                                        : "Marcar concluída: se pagou a menos, libera saldo e abate o desembolso"
                                    }
                                    onClick={() =>
                                      toggleConcluida(rub.rubrica, concluida)
                                    }
                                  >
                                    <Check className="h-3 w-3" />
                                    {concluida ? "Feita" : "Concluir"}
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                            {aberta ? (
                              <tr className="border-b border-border/40 bg-muted/30">
                                <td colSpan={7} className="px-3 py-2">
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

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Ainda falta pagar
                  </CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Rúbricas em aberto: o que já saiu (executado), o que falta e
                    o que já passou do plano.
                  </p>
                </CardHeader>
                <CardContent>
                  {chartAindaFalta.length === 0 ? (
                    <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                      Nenhuma rúbrica com saldo em aberto neste mês.
                    </p>
                  ) : (
                    <div
                      className="w-full"
                      style={{
                        height: Math.max(280, chartAindaFalta.length * 36),
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={chartAindaFalta}
                          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            className="stroke-border/60"
                          />
                          <XAxis
                            type="number"
                            tickFormatter={fmtMoneyShort}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={110}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                            formatter={(value: number, name: string) => [
                              fmtMoney(value),
                              name,
                            ]}
                            labelFormatter={(_, payload) =>
                              (payload?.[0]?.payload as { full?: string } | undefined)
                                ?.full ?? ""
                            }
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar
                            dataKey="executado"
                            name="Executado"
                            stackId="a"
                            fill={COR_EXECUTADO}
                            radius={[0, 0, 0, 0]}
                            maxBarSize={18}
                          />
                          <Bar
                            dataKey="falta"
                            name="Falta pagar"
                            stackId="a"
                            fill={COR_FALTA}
                            maxBarSize={18}
                          />
                          <Bar
                            dataKey="passou"
                            name="Passou do plano"
                            stackId="a"
                            fill={COR_PASSOU}
                            radius={[0, 4, 4, 0]}
                            maxBarSize={18}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Executado / concluído
                  </CardTitle>
                  <p className="text-xs font-normal text-muted-foreground">
                    Rúbricas marcadas como concluídas: valor pago e saldo
                    liberado (quando pagou a menos).
                  </p>
                </CardHeader>
                <CardContent>
                  {chartConcluidas.length === 0 ? (
                    <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                      Nenhuma rúbrica concluída neste mês. Use{" "}
                      <strong className="mx-1">Concluir</strong> na tabela.
                    </p>
                  ) : (
                    <div
                      className="w-full"
                      style={{
                        height: Math.max(280, chartConcluidas.length * 36),
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={chartConcluidas}
                          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            className="stroke-border/60"
                          />
                          <XAxis
                            type="number"
                            tickFormatter={fmtMoneyShort}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={110}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                            formatter={(value: number, name: string) => [
                              fmtMoney(value),
                              name,
                            ]}
                            labelFormatter={(_, payload) => {
                              const row = payload?.[0]?.payload as
                                | {
                                    full?: string;
                                    projetado?: number;
                                  }
                                | undefined;
                              if (!row?.full) return "";
                              return `${row.full} · plano ${fmtMoney(row.projetado)}`;
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar
                            dataKey="pago"
                            name="Pago"
                            stackId="b"
                            fill={COR_EXECUTADO}
                            maxBarSize={18}
                          />
                          <Bar
                            dataKey="saldo"
                            name="Saldo liberado"
                            stackId="b"
                            fill={COR_SALDO}
                            radius={[0, 4, 4, 0]}
                            maxBarSize={18}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Desembolso: “fora do plano” = rúbrica recorrente paga sem estar na
              projeção; “não programada” = gasto sem linha na grade. Em rúbricas
              já pagas, use <strong>Concluir</strong> se pagou a menos — o
              restante vira saldo liberado no dashboard. Ajuste em{" "}
              <Button asChild variant="link" className="h-auto p-0 text-xs font-semibold">
                <Link href="/financeiro-cfo/analise">Análise Conta Azul</Link>
              </Button>
              .
            </p>
          </>
        )}
      </main>
    </div>
  );
}
