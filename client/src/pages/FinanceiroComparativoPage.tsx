import { useMemo, useState, Fragment, useEffect } from "react";
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
import { SearchMultiSelect } from "@/components/ui/search-select";
import type { StatusRubricaComparativo } from "@shared/financeiroComparativoProjecao";
import { DIA_LIMITE_ORCAMENTO_PADRAO } from "@shared/financeiroProjecaoVendas";

const LS_DIA_ORC = "financeiro.comparativo.diaLimiteOrcamento";
const LS_CLIENTES_ORC = "financeiro.comparativo.clienteIdsOrcamento";

function lerDiaLimiteOrcamento(): number {
  try {
    const raw = localStorage.getItem(LS_DIA_ORC);
    const n = raw ? Number(raw) : DIA_LIMITE_ORCAMENTO_PADRAO;
    if (!Number.isFinite(n)) return DIA_LIMITE_ORCAMENTO_PADRAO;
    return Math.min(31, Math.max(1, Math.floor(n)));
  } catch {
    return DIA_LIMITE_ORCAMENTO_PADRAO;
  }
}

function lerClienteIdsOrcamento(): string[] {
  try {
    const raw = localStorage.getItem(LS_CLIENTES_ORC);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && !!x);
  } catch {
    return [];
  }
}

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
  const [diaLimiteOrcamento, setDiaLimiteOrcamento] = useState(lerDiaLimiteOrcamento);
  const [clienteIdsOrcamento, setClienteIdsOrcamento] = useState(
    lerClienteIdsOrcamento,
  );
  const utils = trpc.useUtils();

  useEffect(() => {
    try {
      localStorage.setItem(LS_DIA_ORC, String(diaLimiteOrcamento));
    } catch {
      /* ignore */
    }
  }, [diaLimiteOrcamento]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CLIENTES_ORC, JSON.stringify(clienteIdsOrcamento));
    } catch {
      /* ignore */
    }
  }, [clienteIdsOrcamento]);

  const q = trpc.financeiroCfo.comparativoProjecao.useQuery(
    {
      mesYm: mes,
      diaLimiteOrcamento,
      clienteIdsOrcamento:
        clienteIdsOrcamento.length > 0 ? clienteIdsOrcamento : undefined,
    },
    { staleTime: 60_000 },
  );

  const d = q.data?.desembolso;
  const r = q.data?.receita;
  const caixa = q.data?.caixa;
  const orcFiltros = q.data?.orcamentoFiltros;

  const clientesOpcoes = useMemo(
    () =>
      (orcFiltros?.clientesOpcoes ?? []).map(c => ({
        value: c.id,
        label: c.nome,
      })),
    [orcFiltros?.clientesOpcoes],
  );

  // Remove da seleção clientes que não têm orçamento neste mês.
  useEffect(() => {
    if (!orcFiltros?.clientesOpcoes) return;
    const valid = new Set(orcFiltros.clientesOpcoes.map(c => c.id));
    setClienteIdsOrcamento(prev => {
      const next = prev.filter(id => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [orcFiltros?.clientesOpcoes]);

  const rubricas = useMemo(() => d?.rubricas ?? [], [d?.rubricas]);
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());
  const [vencidosAberto, setVencidosAberto] = useState(false);

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
        diaLimiteOrcamento,
        clienteIdsOrcamento:
          clienteIdsOrcamento.length > 0 ? clienteIdsOrcamento : undefined,
      });
      utils.financeiroCfo.comparativoProjecao.setData(
        {
          mesYm: mes,
          diaLimiteOrcamento,
          clienteIdsOrcamento:
            clienteIdsOrcamento.length > 0 ? clienteIdsOrcamento : undefined,
        },
        data,
      );
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
              Dashboard financeiro
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
            <div>
              <Label className="text-xs">Orçamento até o dia</Label>
              <Input
                type="number"
                min={1}
                max={31}
                className="h-9 w-[100px]"
                value={diaLimiteOrcamento}
                onChange={e => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setDiaLimiteOrcamento(Math.min(31, Math.max(1, Math.floor(n))));
                }}
              />
            </div>
            <div className="min-w-[220px] max-w-[320px] flex-1">
              <Label className="text-xs">Clientes no orçamento</Label>
              <SearchMultiSelect
                values={clienteIdsOrcamento}
                onValuesChange={setClienteIdsOrcamento}
                options={clientesOpcoes}
                placeholder="Todos os clientes"
                searchPlaceholder="Buscar cliente…"
                emptyText="Nenhum cliente com orçamento neste mês."
                clearLabel="Todos (limpar filtro)"
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
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  1. Caixa — o que ainda entra neste mês
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conta Azul por <strong>vencimento</strong>: dinheiro já baixado
                  vs o que ainda está em aberto neste mês.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="Previsto no mês"
                  value={fmtMoney(r?.previsto)}
                  hint="Títulos com vencimento no mês"
                />
                <Kpi
                  title="Já recebido"
                  value={fmtMoney(r?.recebido)}
                  hint={
                    r?.pctRecebidoDoPrevisto != null
                      ? `${fmtPct(r.pctRecebidoDoPrevisto).replace("+", "")} do previsto`
                      : "Baixas no mês"
                  }
                  tone="down"
                />
                <Kpi
                  title="Ainda a receber"
                  value={fmtMoney(r?.aReceberNoMes)}
                  hint="Em aberto, vence neste mês, data ainda não passou"
                />
                <Kpi
                  title="Vencido neste mês"
                  value={fmtMoney(r?.vencido)}
                  hint="Em aberto, venceu neste mês e a data já passou"
                  tone={(r?.vencido ?? 0) > 0 ? "up" : "neutral"}
                />
              </div>

              {(r?.vencidosDetalhe?.length ?? 0) > 0 ? (
                <Card>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setVencidosAberto(v => !v)}
                  >
                    <span className="text-sm font-medium">
                      Quem está vencido neste mês ({r!.vencidosDetalhe.length})
                    </span>
                    {vencidosAberto ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {vencidosAberto ? (
                    <CardContent className="border-t pt-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-muted-foreground">
                              <th className="pb-2 pr-3 font-medium">
                                Cliente / descrição
                              </th>
                              <th className="pb-2 pr-3 font-medium">
                                Vencimento
                              </th>
                              <th className="pb-2 text-right font-medium">
                                Em aberto
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {r!.vencidosDetalhe.map(v => (
                              <tr
                                key={v.id}
                                className="border-t border-border/60"
                              >
                                <td className="py-2 pr-3">
                                  <div className="font-medium">
                                    {v.fornecedor || "—"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {v.descricao}
                                  </div>
                                </td>
                                <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                                  {v.dataVencimento
                                    ? new Date(
                                        `${v.dataVencimento.slice(0, 10)}T12:00:00`,
                                      ).toLocaleDateString("pt-BR")
                                    : "—"}
                                </td>
                                <td className="py-2 text-right tabular-nums font-medium text-red-600">
                                  {fmtMoney(v.valor)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t">
                              <td
                                colSpan={2}
                                className="pt-2 text-xs text-muted-foreground"
                              >
                                Soma = vencido neste mês
                              </td>
                              <td className="pt-2 text-right tabular-nums font-semibold">
                                {fmtMoney(r?.vencido)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Kpi
                  title="Saldo caixa (recebido − pago)"
                  value={fmtMoney(caixa?.saldoRealizado)}
                  hint="Só o que já baixou no Conta Azul neste mês"
                  tone={(caixa?.saldoRealizado ?? 0) >= 0 ? "down" : "up"}
                />
                <Kpi
                  title="Caixa previsto vs desembolso"
                  value={fmtMoney(caixa?.gapCaixaMes)}
                  hint="Projeção caixa (recebido + ainda entra) − desembolso projetado"
                  tone={
                    (caixa?.gapCaixaMes ?? 0) >= 0
                      ? "down"
                      : "up"
                  }
                />
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  2. Volume do mês — faturado + orçamento
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pedidos por <strong>data do pedido</strong>. Orçamentos usam a
                  janela e os clientes escolhidos acima. Isso{" "}
                  <strong>não é o mesmo</strong> que “a receber” no Conta Azul.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi
                  title="Já faturado (volume)"
                  value={fmtMoney(r?.vendasCompetencia?.vendasFaturadas)}
                  hint="Pedidos faturados/aprovados neste mês — volume, não caixa"
                />
                <Kpi
                  title={`Orçamentos ≤ dia ${diaLimiteOrcamento}`}
                  value={fmtMoney(r?.vendasCompetencia?.orcamentos)}
                  hint={
                    clienteIdsOrcamento.length > 0
                      ? `${clienteIdsOrcamento.length} cliente(s) selecionado(s)`
                      : "Todos os clientes · só até o dia limite"
                  }
                />
                <Kpi
                  title="Soma até agora"
                  value={fmtMoney(r?.vendasCompetencia?.total)}
                  hint={
                    r?.projecaoVendas
                      ? `Faturado + orçamentos. Nos 2 meses anteriores, até o dia ${r.projecaoVendas.diasPassados}: média ${fmtMoney(r.projecaoVendas.mediaAteMesmoDia2m)}`
                      : "Faturado + orçamentos ≤15"
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Kpi
                  title={
                    r?.projecaoVendas && r.projecaoVendas.diasRestantes > 0
                      ? `Ainda entra caixa (últimos ${r.projecaoVendas.diasRestantes} dias)`
                      : "Ainda entra (caixa)"
                  }
                  value={fmtMoney(r?.projecaoVendas?.aindaEntraProjetado)}
                  hint={
                    r?.projecaoVendas
                      ? `Média das baixas de receita de vendas no fim de ${labelMes(r.projecaoVendas.mesesMedia2m[0])} (${fmtMoney(r.projecaoVendas.vendasRestanteMesAnterior2)}) e ${labelMes(r.projecaoVendas.mesesMedia2m[1])} (${fmtMoney(r.projecaoVendas.vendasRestanteMesAnterior1)})`
                      : "Média das baixas de vendas nos últimos N dias · 2 meses"
                  }
                />
                <Kpi
                  title="Projeção de fechar (caixa)"
                  value={fmtMoney(r?.projecaoVendas?.projecaoMesTotal)}
                  hint="Recebido + ainda entra (caixa). Não soma a receber — evita duplicar com o padrão histórico. Orçamentos não entram."
                />
              </div>
            </section>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Desembolso: “fora do plano” = rúbrica recorrente paga sem estar na
              projeção; “não programada” = gasto sem linha na grade. Ajuste em{" "}
              <Link href="/financeiro-cfo/analise" className="underline">
                Análise Conta Azul
              </Link>
              .
            </p>
          </>
        )}
      </main>
    </div>
  );
}
