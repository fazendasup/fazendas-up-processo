import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Lightbulb,
  Plus,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportObjectRows } from "@/lib/exportTableDocument";
import type { ParcelaFinanceiraNorm } from "@shared/financeiroCfoInsights";
import { RUBRICA_SEM_CATEGORIA } from "@shared/financeiroCfoInsights";
import { ProjecaoDesembolsoPanel } from "@/components/financeiro/ProjecaoDesembolsoPanel";

const CHART_UP = "#dc2626";
const CHART_DOWN = "#059669";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mesAtualYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function boundsDoMes(ym: string): { inicio: string; fim: string } {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const hoje = new Date();
    return {
      inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
      fim: isoLocal(hoje),
    };
  }
  const inicio = isoLocal(new Date(y, m - 1, 1));
  const fimMes = isoLocal(new Date(y, m, 0));
  const hoje = new Date();
  if (y === hoje.getFullYear() && m === hoje.getMonth() + 1) {
    return { inicio, fim: isoLocal(hoje) };
  }
  return { inicio, fim: fimMes };
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
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function fmtDate(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceiroCfoPage() {
  const [mes, setMes] = useState(mesAtualYm);
  const [compararMesAnterior, setCompararMesAnterior] = useState(true);
  const { inicio, fim } = useMemo(() => boundsDoMes(mes), [mes]);

  const [busca, setBusca] = useState("");
  const [filtroRubrica, setFiltroRubrica] = useState<string | null>(null);
  const [ocultarExcluidos, setOcultarExcluidos] = useState(false);
  const [somenteSemRubrica, setSomenteSemRubrica] = useState(false);
  const [draftRubrica, setDraftRubrica] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [novoDesc, setNovoDesc] = useState("");
  const [novoRubrica, setNovoRubrica] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState("");
  const [draftRubricaDestino, setDraftRubricaDestino] = useState<
    Record<string, string>
  >({});
  const [tabAtiva, setTabAtiva] = useState("projecao");

  const utils = trpc.useUtils();
  const queryInput = useMemo(
    () => ({
      inicio: new Date(`${inicio}T00:00:00`),
      fim: new Date(`${fim}T23:59:59`),
      compararMesAnterior,
    }),
    [inicio, fim, compararMesAnterior],
  );

  const analise = trpc.financeiroCfo.analise.useQuery(queryInput, {
    staleTime: 30_000,
    retry: 1,
  });
  const data = analise.data;
  const kpis = data?.kpisReducao;
  const gaps = data?.comparativo?.gapsPorImpacto ?? [];
  const conflitosRubrica = data?.conflitosRubricaDestino ?? [];

  useEffect(() => {
    const list = data?.conflitosRubricaDestino;
    if (!list?.length) return;
    setDraftRubricaDestino(prev => {
      const next = { ...prev };
      for (const c of list) {
        if (next[c.chave] == null) {
          next[c.chave] = c.rubricas[0]?.rubrica ?? "";
        }
      }
      return next;
    });
  }, [data?.conflitosRubricaDestino]);

  const salvarClass = trpc.financeiroCfo.salvarClassificacao.useMutation({
    onSuccess: async () => {
      await utils.financeiroCfo.analise.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const criarAjuste = trpc.financeiroCfo.criarAjusteManual.useMutation({
    onSuccess: async () => {
      toast.success("Lançamento manual criado");
      setNovoDesc("");
      setNovoRubrica("");
      setNovoValor("");
      setNovoFornecedor("");
      await utils.financeiroCfo.analise.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  useEffect(() => {
    if (!data?.lancamentosPagar) return;
    const next: Record<string, string> = {};
    for (const p of data.lancamentosPagar) {
      next[p.id] = p.categoria || "";
    }
    setDraftRubrica(next);
  }, [data?.lancamentosPagar]);

  const lancamentos = useMemo(() => {
    const list = data?.lancamentosPagar ?? [];
    const q = busca.trim().toLowerCase();
    return list.filter(p => {
      if (ocultarExcluidos && p.excluido) return false;
      if (somenteSemRubrica && p.categoria?.trim()) return false;
      if (filtroRubrica) {
        const rub = p.categoria?.trim() || RUBRICA_SEM_CATEGORIA;
        if (rub !== filtroRubrica) return false;
      }
      if (!q) return true;
      return [p.descricao, p.contraparte, p.categoria, p.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [
    data?.lancamentosPagar,
    busca,
    filtroRubrica,
    ocultarExcluidos,
    somenteSemRubrica,
  ]);

  const qtdExcluidos = useMemo(
    () => (data?.lancamentosPagar ?? []).filter(p => p.excluido).length,
    [data?.lancamentosPagar],
  );

  const chartGaps = useMemo(
    () =>
      gaps
        .filter(g => g.delta !== 0)
        .slice(0, 12)
        .map(g => ({
          nome:
            g.rubrica.length > 26 ? `${g.rubrica.slice(0, 24)}…` : g.rubrica,
          full: g.rubrica,
          delta: g.delta,
        })),
    [gaps],
  );

  const salvarRubricaInline = async (p: ParcelaFinanceiraNorm) => {
    if (p.origem === "ajuste_manual") return;
    const rubrica = (draftRubrica[p.id] ?? "").trim();
    const atual = (p.categoria || "").trim();
    if (rubrica === atual) return;
    setSavingId(p.id);
    try {
      await salvarClass.mutateAsync({
        tipo: "parcela",
        chave: p.id,
        rubricaOverride: rubrica || null,
        excluido: p.excluido,
        nota: p.notaClassificacao,
      });
      toast.success("Rúbrica atualizada");
    } finally {
      setSavingId(null);
    }
  };

  const aplicarRubricaDestino = async (chave: string, destino: string) => {
    const rubrica = (draftRubricaDestino[chave] ?? "").trim();
    if (!rubrica) {
      toast.error("Informe a rúbrica correta");
      return;
    }
    setSavingId(`dest:${chave}`);
    try {
      await salvarClass.mutateAsync({
        tipo: "fornecedor",
        chave: destino,
        rubricaOverride: rubrica,
      });
      toast.success(`Rúbrica aplicada a ${destino}`);
    } finally {
      setSavingId(null);
    }
  };

  const verLancamentosDestino = (destino: string) => {
    setBusca(destino);
    setFiltroRubrica(null);
    setTabAtiva("lancamentos");
  };

  const toggleExcluido = async (p: ParcelaFinanceiraNorm) => {
    if (p.origem === "ajuste_manual") {
      toast.message("Remova o lançamento manual na aba Ajustes");
      return;
    }
    setSavingId(p.id);
    try {
      await salvarClass.mutateAsync({
        tipo: "parcela",
        chave: p.id,
        rubricaOverride: (draftRubrica[p.id] || p.categoria || "").trim() || null,
        excluido: !p.excluido,
        nota: p.notaClassificacao,
      });
      toast.success(
        p.excluido
          ? "Reincluído nos totais — despesa reativada"
          : "Fora dos totais — desmarque a caixa para reativar",
      );
    } finally {
      setSavingId(null);
    }
  };

  const exportBase = `${inicio}_${fim}`;
  const periodoLabel = labelMes(mes);

  const exportGaps = (format: "csv" | "pdf" | "json") => {
    const rows = gaps.map(g => ({
      rubrica: g.rubrica,
      atual: g.atual,
      anterior: g.anterior,
      delta: g.delta,
      delta_pct: g.deltaPct,
      qtd_atual: g.qtdAtual,
      qtd_anterior: g.qtdAnterior,
    }));
    if (format === "json") {
      downloadJson(`financeiro-gaps-${exportBase}.json`, rows);
      return;
    }
    exportObjectRows(rows, {
      title: "Gaps de custo por rúbrica",
      subtitle: periodoLabel,
      filename: `financeiro-gaps-${exportBase}`,
      format,
    });
  };

  const exportLancamentos = (format: "csv" | "pdf" | "json") => {
    const rows = lancamentos.map(p => ({
      descricao: p.descricao,
      fornecedor: p.contraparte ?? "",
      rubrica: p.categoria ?? "",
      valor: p.valor,
      pago: p.valorPago,
      em_aberto: p.valorEmAberto,
      vencimento: p.dataVencimento ?? "",
      excluido: p.excluido ? "sim" : "não",
    }));
    if (format === "json") {
      downloadJson(`financeiro-lancamentos-${exportBase}.json`, rows);
      return;
    }
    exportObjectRows(rows, {
      title: "Lançamentos a pagar",
      subtitle: periodoLabel,
      filename: `financeiro-lancamentos-${exportBase}`,
      format,
      orientation: "landscape",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[100rem] space-y-5 px-3 py-6 sm:px-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conta Azul · redução de custo
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Análise financeira
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Gaps vs mês anterior, edição rápida de rúbrica e foco no que
              mais pesa no caixa.{" "}
              <a
                href="/financeiro-cfo/comparativo"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Abrir comparativo projeção × realizado
              </a>
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
            <div>
              <Label className="text-xs">Mês</Label>
              <Input
                type="month"
                className="h-9 w-[160px]"
                value={mes}
                onChange={e => setMes(e.target.value)}
              />
            </div>
            <label className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={compararMesAnterior}
                onCheckedChange={v => setCompararMesAnterior(v === true)}
              />
              Comparar mês anterior
            </label>
            <Button
              size="sm"
              className="h-9 gap-1"
              disabled={analise.isFetching}
              onClick={() => void analise.refetch()}
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${analise.isFetching ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {analise.isError ? (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="flex gap-2 p-4 text-sm text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Não foi possível carregar</p>
                <p className="text-xs">{analise.error.message}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {analise.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Carregando despesas Conta Azul…
          </p>
        ) : null}

        {data && kpis ? (
          <>
            {data.avisos?.length ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {data.avisos.join(" · ")}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Kpi
                icon={<Wallet className="h-4 w-4 text-sky-600" />}
                label="Gasto do mês"
                value={fmtMoney(kpis.gastoTotal)}
                hint={periodoLabel}
              />
              <Kpi
                icon={
                  (kpis.deltaGasto ?? 0) > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-emerald-600" />
                  )
                }
                label="Δ vs mês ant."
                value={
                  kpis.deltaGasto == null
                    ? "—"
                    : `${kpis.deltaGasto > 0 ? "+" : ""}${fmtMoney(kpis.deltaGasto)}`
                }
                hint={fmtPct(kpis.deltaGastoPct)}
                highlight={
                  kpis.deltaGasto == null
                    ? undefined
                    : kpis.deltaGasto > 0
                      ? "bad"
                      : "good"
                }
              />
              <Kpi
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                label="Sem rúbrica"
                value={fmtMoney(kpis.valorSemRubrica)}
                hint={`${kpis.pctSemRubrica}% do gasto`}
                highlight={kpis.pctSemRubrica >= 10 ? "bad" : undefined}
              />
              <Kpi
                icon={<Filter className="h-4 w-4" />}
                label="Top 3 rúbricas"
                value={`${kpis.concentracaoTop3Pct}%`}
                hint="Concentração do gasto"
              />
              <Kpi
                icon={<ArrowUpRight className="h-4 w-4 text-red-600" />}
                label="Maior alta"
                value={
                  kpis.maiorAumento
                    ? fmtMoney(kpis.maiorAumento.delta)
                    : "—"
                }
                hint={kpis.maiorAumento?.rubrica}
              />
              <Kpi
                icon={<ArrowDownRight className="h-4 w-4 text-amber-700" />}
                label="A pagar"
                value={fmtMoney(kpis.aPagarEmAberto)}
                hint={`${kpis.titulosPagar} título(s)`}
              />
            </div>

            {data.comparativo ? (
              <p className="text-xs text-muted-foreground">
                Comparando com{" "}
                {fmtDate(data.comparativo.periodoAnterior.inicio)} →{" "}
                {fmtDate(data.comparativo.periodoAnterior.fim)} · gasto ant.{" "}
                {fmtMoney(data.comparativo.gastoAnterior)}
              </p>
            ) : null}

            <Tabs
              value={tabAtiva}
              onValueChange={setTabAtiva}
              className="space-y-4"
            >
              <TabsList className="flex h-auto flex-wrap">
                <TabsTrigger value="projecao">Projeção</TabsTrigger>
                <TabsTrigger value="rubricas">
                  Rúbricas
                  {conflitosRubrica.length > 0
                    ? ` (${conflitosRubrica.length})`
                    : ""}
                </TabsTrigger>
                <TabsTrigger value="gaps">Gaps de custo</TabsTrigger>
                <TabsTrigger value="lancamentos">
                  Lançamentos ({lancamentos.length})
                </TabsTrigger>
                <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
                <TabsTrigger value="alertas">Alertas</TabsTrigger>
                <TabsTrigger value="export">Exportar</TabsTrigger>
              </TabsList>

              <TabsContent value="projecao" className="space-y-3">
                <ProjecaoDesembolsoPanel mesInicioYm={mes} />
              </TabsContent>

              <TabsContent value="rubricas" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Análise de rúbricas por destino
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Mesmo fornecedor (saída) com rúbricas diferentes entre o
                      mês atual e o anterior
                      {compararMesAnterior ? "" : " — ative “Comparar mês anterior” para cruzar ago×set"}
                      . Aplique a rúbrica correta no destino ou abra os
                      lançamentos.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!compararMesAnterior ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Com “Comparar mês anterior” ativo, a checagem usa os dois
                        meses juntos (ex.: agosto + setembro).
                      </p>
                    ) : null}
                    {conflitosRubrica.length === 0 ? (
                      <p className="py-6 text-sm text-muted-foreground">
                        Nenhum destino com rúbricas conflitantes neste recorte.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[880px] text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                              <th className="px-2 py-2">Destino (fornecedor)</th>
                              <th className="px-2 py-2">Meses</th>
                              <th className="px-2 py-2">Rúbricas usadas</th>
                              <th className="px-2 py-2">Total</th>
                              <th className="px-2 py-2 w-[220px]">
                                Aplicar rúbrica
                              </th>
                              <th className="px-2 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {conflitosRubrica.map(c => (
                              <tr key={c.chave} className="border-b align-top">
                                <td className="px-2 py-2">
                                  <p className="font-medium">{c.destino}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {c.qtd} lançamento(s)
                                  </p>
                                </td>
                                <td className="px-2 py-2 text-xs tabular-nums">
                                  {c.meses.join(" · ")}
                                </td>
                                <td className="px-2 py-2">
                                  <ul className="space-y-1">
                                    {c.rubricas.map(r => (
                                      <li
                                        key={r.rubrica}
                                        className="text-xs leading-snug"
                                      >
                                        <button
                                          type="button"
                                          className="font-medium text-sky-700 hover:underline"
                                          onClick={() =>
                                            setDraftRubricaDestino(prev => ({
                                              ...prev,
                                              [c.chave]: r.rubrica,
                                            }))
                                          }
                                        >
                                          {r.rubrica}
                                        </button>
                                        <span className="text-muted-foreground">
                                          {" "}
                                          · {fmtMoney(r.total)} · {r.qtd}x ·{" "}
                                          {r.meses.join(", ")}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                                <td className="px-2 py-2 font-semibold tabular-nums">
                                  {fmtMoney(c.total)}
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      list="rubricas-sugestoes"
                                      className="h-8"
                                      value={draftRubricaDestino[c.chave] ?? ""}
                                      onChange={e =>
                                        setDraftRubricaDestino(prev => ({
                                          ...prev,
                                          [c.chave]: e.target.value,
                                        }))
                                      }
                                      disabled={savingId === `dest:${c.chave}`}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-8"
                                      disabled={savingId === `dest:${c.chave}`}
                                      onClick={() =>
                                        void aplicarRubricaDestino(
                                          c.chave,
                                          c.destino,
                                        )
                                      }
                                    >
                                      Aplicar no destino
                                    </Button>
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() =>
                                      verLancamentosDestino(c.destino)
                                    }
                                  >
                                    Ver lançamentos
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gaps" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-5">
                  <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                      <div>
                        <CardTitle className="text-base">
                          Gaps por rúbrica
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Clique para filtrar lançamentos · ordenado por
                          impacto (|Δ|)
                        </p>
                      </div>
                      <ExportMini
                        onCsv={() => exportGaps("csv")}
                        onPdf={() => exportGaps("pdf")}
                      />
                    </CardHeader>
                    <CardContent className="overflow-x-auto pt-0">
                      {!compararMesAnterior ? (
                        <p className="py-6 text-sm text-muted-foreground">
                          Ative “Comparar mês anterior” para ver gaps.
                        </p>
                      ) : gaps.length === 0 ? (
                        <p className="py-6 text-sm text-muted-foreground">
                          Sem dados comparáveis.
                        </p>
                      ) : (
                        <table className="w-full min-w-[640px] text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                              <th className="px-2 py-2">Rúbrica</th>
                              <th className="px-2 py-2">Atual</th>
                              <th className="px-2 py-2">Anterior</th>
                              <th className="px-2 py-2">Δ R$</th>
                              <th className="px-2 py-2">Δ %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gaps.slice(0, 40).map(g => (
                              <tr
                                key={g.rubrica}
                                className="cursor-pointer border-b hover:bg-muted/50"
                                onClick={() => setFiltroRubrica(g.rubrica)}
                              >
                                <td className="max-w-[220px] px-2 py-2 font-medium">
                                  {g.rubrica}
                                </td>
                                <td className="px-2 py-2 tabular-nums">
                                  {fmtMoney(g.atual)}
                                </td>
                                <td className="px-2 py-2 tabular-nums text-muted-foreground">
                                  {fmtMoney(g.anterior)}
                                </td>
                                <td
                                  className={`px-2 py-2 font-semibold tabular-nums ${
                                    g.delta > 0
                                      ? "text-red-700"
                                      : g.delta < 0
                                        ? "text-emerald-700"
                                        : ""
                                  }`}
                                >
                                  {g.delta > 0 ? "+" : ""}
                                  {fmtMoney(g.delta)}
                                </td>
                                <td
                                  className={`px-2 py-2 tabular-nums ${
                                    (g.deltaPct ?? 0) > 0
                                      ? "text-red-700"
                                      : (g.deltaPct ?? 0) < 0
                                        ? "text-emerald-700"
                                        : ""
                                  }`}
                                >
                                  {fmtPct(g.deltaPct)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Impacto visual (Δ)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Vermelho = subiu · verde = caiu
                      </p>
                    </CardHeader>
                    <CardContent className="h-[360px] pt-0">
                      {chartGaps.length === 0 ? (
                        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          Sem variação.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartGaps}
                            layout="vertical"
                            margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11 }}
                              tickFormatter={fmtMoneyShort}
                            />
                            <YAxis
                              type="category"
                              dataKey="nome"
                              width={100}
                              tick={{ fontSize: 10 }}
                            />
                            <Tooltip
                              formatter={(v: number) => fmtMoney(v)}
                              labelFormatter={(_, payload) => {
                                const row = payload?.[0]?.payload as
                                  | { full?: string }
                                  | undefined;
                                return row?.full ?? "";
                              }}
                            />
                            <Bar dataKey="delta" name="Δ" radius={[0, 4, 4, 0]}>
                              {chartGaps.map((g, i) => (
                                <Cell
                                  key={i}
                                  fill={g.delta >= 0 ? CHART_UP : CHART_DOWN}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="lancamentos" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Contas a pagar — edição rápida
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Altere a rúbrica e pressione Enter ou saia do campo para
                      salvar · 1 clique no “excluir” tira do total
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-9 pl-8"
                          placeholder="Buscar…"
                          value={busca}
                          onChange={e => setBusca(e.target.value)}
                        />
                      </div>
                      {filtroRubrica ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1"
                          onClick={() => setFiltroRubrica(null)}
                        >
                          <Filter className="h-3.5 w-3.5" />
                          {filtroRubrica}
                        </Button>
                      ) : null}
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={somenteSemRubrica}
                          onCheckedChange={v => {
                            setSomenteSemRubrica(v === true);
                            if (v === true) setFiltroRubrica(null);
                          }}
                        />
                        Só sem rúbrica
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={ocultarExcluidos}
                          onCheckedChange={v =>
                            setOcultarExcluidos(v === true)
                          }
                        />
                        Ocultar ignorados
                        {qtdExcluidos > 0 ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                            {qtdExcluidos}
                          </span>
                        ) : null}
                      </label>
                      <ExportMini
                        onCsv={() => exportLancamentos("csv")}
                        onPdf={() => exportLancamentos("pdf")}
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                            <th className="px-2 py-2">Descrição</th>
                            <th className="px-2 py-2">Fornecedor</th>
                            <th className="px-2 py-2 w-[220px]">Rúbrica</th>
                            <th className="px-2 py-2">Venc.</th>
                            <th className="px-2 py-2">Valor</th>
                            <th className="px-2 py-2" title="Ignorar nos totais (pode reativar)">
                              Ignorar
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lancamentos.map(p => (
                            <tr
                              key={p.id}
                              className={`border-b align-middle ${
                                p.excluido ? "opacity-50" : ""
                              } ${savingId === p.id ? "bg-muted/40" : ""}`}
                            >
                              <td className="max-w-[200px] px-2 py-1.5">
                                <p className="truncate font-medium">
                                  {p.descricao}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {p.status}
                                  {p.editadoManual ? " · editado" : ""}
                                </p>
                              </td>
                              <td className="max-w-[140px] truncate px-2 py-1.5">
                                {p.contraparte || "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  list="rubricas-sugestoes"
                                  className="h-8"
                                  disabled={
                                    p.origem === "ajuste_manual" ||
                                    savingId === p.id
                                  }
                                  value={draftRubrica[p.id] ?? ""}
                                  onChange={e =>
                                    setDraftRubrica(prev => ({
                                      ...prev,
                                      [p.id]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => void salvarRubricaInline(p)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  placeholder="Sem rúbrica"
                                />
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-xs">
                                {fmtDate(p.dataVencimento)}
                              </td>
                              <td className="px-2 py-1.5 font-semibold tabular-nums">
                                {fmtMoney(p.valor)}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex flex-col items-start gap-0.5">
                                  <Checkbox
                                    checked={!!p.excluido}
                                    disabled={savingId === p.id}
                                    onCheckedChange={() =>
                                      void toggleExcluido(p)
                                    }
                                    aria-label={
                                      p.excluido
                                        ? "Reativar nos totais"
                                        : "Ignorar nos totais"
                                    }
                                  />
                                  {p.excluido ? (
                                    <span className="text-[10px] font-medium text-amber-700">
                                      fora · clique p/ reativar
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {lancamentos.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          Nenhum lançamento com esses filtros.
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ajustes" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Lançamento manual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={novoDesc}
                        onChange={e => setNovoDesc(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoValor}
                        onChange={e => setNovoValor(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rúbrica</Label>
                      <Input
                        list="rubricas-sugestoes"
                        value={novoRubrica}
                        onChange={e => setNovoRubrica(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fornecedor</Label>
                      <Input
                        value={novoFornecedor}
                        onChange={e => setNovoFornecedor(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="gap-1"
                        disabled={criarAjuste.isPending}
                        onClick={() => {
                          const valor = Number(novoValor);
                          if (
                            !novoDesc.trim() ||
                            !novoRubrica.trim() ||
                            !Number.isFinite(valor)
                          ) {
                            toast.error("Preencha descrição, rúbrica e valor");
                            return;
                          }
                          criarAjuste.mutate({
                            tipo: "pagar",
                            descricao: novoDesc,
                            rubrica: novoRubrica,
                            contraparte: novoFornecedor || null,
                            valor,
                            dataCompetencia: fim,
                          });
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Acrescentar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alertas" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4" />
                      Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(data.insights ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem alertas.</p>
                    ) : (
                      data.insights.map(ins => (
                        <div
                          key={ins.id}
                          className="rounded-xl border p-3 text-sm"
                        >
                          <p className="text-[10px] font-bold uppercase opacity-60">
                            {ins.severidade} · {ins.tipo}
                          </p>
                          <p className="font-semibold">{ins.titulo}</p>
                          <p className="mt-1 opacity-90">{ins.analise}</p>
                          <p className="mt-2 text-xs">
                            <span className="font-bold">Ação:</span>{" "}
                            {ins.acaoSimples}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Download className="h-4 w-4" />
                      Exportar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportGaps("csv")}
                    >
                      Gaps CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportLancamentos("csv")}
                    >
                      Lançamentos CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadJson(`financeiro-pacote-${exportBase}.json`, {
                          periodo: data.periodo,
                          kpisReducao: data.kpisReducao,
                          comparativo: data.comparativo,
                          rubricas: data.rubricas,
                          lancamentosPagar: data.lancamentosPagar,
                        })
                      }
                    >
                      <FileJson className="mr-1 h-3.5 w-3.5" />
                      Pacote JSON
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <datalist id="rubricas-sugestoes">
              {(data.rubricasSugestoes ?? []).map(r => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: "good" | "bad";
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={`truncate text-lg font-bold tabular-nums ${
              highlight === "bad"
                ? "text-red-700"
                : highlight === "good"
                  ? "text-emerald-700"
                  : ""
            }`}
          >
            {value}
          </p>
          {hint ? (
            <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ExportMini({
  onCsv,
  onPdf,
}: {
  onCsv: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onCsv}>
        <FileSpreadsheet className="h-3.5 w-3.5" />
        CSV
      </Button>
      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onPdf}>
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
    </div>
  );
}
