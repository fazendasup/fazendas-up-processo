import { useMemo, useState, type ReactNode } from "react";
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
  Tags,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { exportObjectRows, exportTableDocument } from "@/lib/exportTableDocument";
import type { ParcelaFinanceiraNorm } from "@shared/financeiroCfoInsights";
import { RUBRICA_SEM_CATEGORIA } from "@shared/financeiroCfoInsights";

const CHART_GREEN = "#059669";
const CHART_RED = "#dc2626";
const CHART_SKY = "#0284c7";
const CHART_AMBER = "#d97706";
const CHART_VIOLET = "#7c3aed";
const PIE_COLORS = [
  "#059669",
  "#0284c7",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0d9488",
  "#4f46e5",
  "#ca8a04",
  "#64748b",
];

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

/** Limites do mês; no mês corrente fecha em hoje. */
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
  const d = new Date(Number(ys), Number(ms) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
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

function fmtDate(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function fmtDiaCurto(ymd: string): string {
  const [, , d] = ymd.split("-");
  return d ?? ymd;
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

function confiancaLabel(c: string): string {
  if (c === "alta") return "Alta";
  if (c === "media") return "Média";
  return "Baixa";
}

function fonteLabel(f: string): string {
  switch (f) {
    case "rateio_api":
      return "Rateio Conta Azul";
    case "listagem_categoria":
      return "Categoria da listagem";
    case "override_manual":
      return "Ajuste manual";
    case "ajuste_manual":
      return "Lançamento manual";
    default:
      return "Sem classificação";
  }
}

export default function FinanceiroCfoPage() {
  const [mes, setMes] = useState(mesAtualYm);
  const [modoPeriodo, setModoPeriodo] = useState<"mes" | "custom">("mes");
  const [inicioCustom, setInicioCustom] = useState(() => boundsDoMes(mesAtualYm()).inicio);
  const [fimCustom, setFimCustom] = useState(() => boundsDoMes(mesAtualYm()).fim);

  const { inicio, fim } = useMemo(() => {
    if (modoPeriodo === "mes") return boundsDoMes(mes);
    return { inicio: inicioCustom, fim: fimCustom };
  }, [modoPeriodo, mes, inicioCustom, fimCustom]);

  const [busca, setBusca] = useState("");
  const [filtroRubrica, setFiltroRubrica] = useState<string | null>(null);
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [selecionadaBase, setSelecionadaBase] =
    useState<ParcelaFinanceiraNorm | null>(null);

  const [editRubrica, setEditRubrica] = useState("");
  const [editNota, setEditNota] = useState("");
  const [editExcluido, setEditExcluido] = useState(false);
  const [aplicarFornecedor, setAplicarFornecedor] = useState(false);

  const [novoDesc, setNovoDesc] = useState("");
  const [novoRubrica, setNovoRubrica] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState("");

  const utils = trpc.useUtils();
  const queryInput = useMemo(
    () => ({
      inicio: new Date(`${inicio}T00:00:00`),
      fim: new Date(`${fim}T23:59:59`),
    }),
    [inicio, fim],
  );

  const analise = trpc.financeiroCfo.analise.useQuery(queryInput, {
    staleTime: 30_000,
    retry: 1,
  });
  const data = analise.data;

  const detalheQuery = trpc.financeiroCfo.parcelaDetalhe.useQuery(
    {
      parcelaId: selecionadaId ?? "",
      tipo: selecionadaBase?.tipo === "receber" ? "receber" : "pagar",
    },
    {
      enabled:
        !!selecionadaId &&
        !selecionadaId.startsWith("manual-") &&
        !!selecionadaBase,
      staleTime: 60_000,
      retry: 1,
    },
  );

  const selecionada = useMemo(() => {
    if (!selecionadaBase) return null;
    const det = detalheQuery.data;
    if (!det) return selecionadaBase;
    return {
      ...selecionadaBase,
      ...det,
      notaClassificacao:
        det.notaClassificacao ?? selecionadaBase.notaClassificacao,
      editadoManual: det.editadoManual || selecionadaBase.editadoManual,
      excluido: det.excluido || selecionadaBase.excluido,
      categoriaOriginal:
        selecionadaBase.categoriaOriginal ?? det.categoriaOriginal,
    };
  }, [selecionadaBase, detalheQuery.data]);

  const salvarClass = trpc.financeiroCfo.salvarClassificacao.useMutation({
    onSuccess: async () => {
      toast.success("Classificação salva");
      await utils.financeiroCfo.analise.invalidate();
      if (selecionadaId) await utils.financeiroCfo.parcelaDetalhe.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const removerClass = trpc.financeiroCfo.removerClassificacao.useMutation({
    onSuccess: async () => {
      toast.success("Classificação removida");
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
  const excluirAjuste = trpc.financeiroCfo.excluirAjusteManual.useMutation({
    onSuccess: async () => {
      toast.success("Lançamento removido");
      setSelecionadaId(null);
      setSelecionadaBase(null);
      await utils.financeiroCfo.analise.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const abrirDetalhe = (p: ParcelaFinanceiraNorm) => {
    setSelecionadaBase(p);
    setSelecionadaId(p.id);
    setEditRubrica(p.categoria || "");
    setEditNota(p.notaClassificacao || "");
    setEditExcluido(!!p.excluido);
    setAplicarFornecedor(false);
  };

  const fecharDetalhe = () => {
    setSelecionadaId(null);
    setSelecionadaBase(null);
  };

  const lancamentos = useMemo(() => {
    const list = data?.lancamentosPagar ?? [];
    const q = busca.trim().toLowerCase();
    return list.filter(p => {
      if (!mostrarExcluidos && p.excluido) return false;
      if (filtroRubrica) {
        const rub = p.categoria?.trim() || RUBRICA_SEM_CATEGORIA;
        if (rub !== filtroRubrica) return false;
      }
      if (!q) return true;
      const blob = [
        p.descricao,
        p.contraparte,
        p.categoria,
        p.categoriaOriginal,
        p.notaClassificacao,
        p.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data?.lancamentosPagar, busca, filtroRubrica, mostrarExcluidos]);

  const chartFluxo = useMemo(
    () =>
      (data?.fluxoDias ?? []).map(d => ({
        ...d,
        dia: fmtDiaCurto(d.data),
      })),
    [data?.fluxoDias],
  );

  const chartRubricas = useMemo(
    () =>
      (data?.rubricas ?? []).slice(0, 10).map(r => ({
        nome:
          r.label.length > 28 ? `${r.label.slice(0, 26)}…` : r.label,
        full: r.label,
        chave: r.chave,
        total: r.total,
        pct: r.pctDoDesembolso,
      })),
    [data?.rubricas],
  );

  const chartDre = useMemo(
    () =>
      (data?.gruposDre ?? [])
        .filter(g => g.total > 0)
        .slice(0, 8)
        .map(g => ({
          name: g.label.length > 22 ? `${g.label.slice(0, 20)}…` : g.label,
          value: g.total,
        })),
    [data?.gruposDre],
  );

  const chartFornecedores = useMemo(
    () =>
      (data?.fornecedores ?? []).slice(0, 8).map(f => ({
        nome: f.nome.length > 22 ? `${f.nome.slice(0, 20)}…` : f.nome,
        total: f.total,
      })),
    [data?.fornecedores],
  );

  const chartAgingPagar = useMemo(
    () =>
      (data?.agingPagar ?? [])
        .filter(b => b.valor > 0)
        .map(b => ({ label: b.label, valor: b.valor, qtd: b.qtd })),
    [data?.agingPagar],
  );

  const chartAgingReceber = useMemo(
    () =>
      (data?.agingReceber ?? [])
        .filter(b => b.valor > 0)
        .map(b => ({ label: b.label, valor: b.valor, qtd: b.qtd })),
    [data?.agingReceber],
  );

  const chartCaixaResumo = useMemo(() => {
    if (!data) return [];
    return [
      {
        nome: "Entradas",
        realizadas: data.resumo.entradasRealizadas,
        previstas: data.resumo.entradasPrevistas,
      },
      {
        nome: "Saídas",
        realizadas: data.resumo.saidasRealizadas,
        previstas: data.resumo.saidasPrevistas,
      },
    ];
  }, [data]);

  const exportBase = `${inicio}_${fim}`;
  const periodoLabel =
    modoPeriodo === "mes"
      ? labelMes(mes)
      : `${fmtDate(inicio)} → ${fmtDate(fim)}`;

  const exportLancamentos = (format: "csv" | "pdf" | "json") => {
    const rows = lancamentos.map(p => ({
      id: p.id,
      descricao: p.descricao,
      fornecedor: p.contraparte ?? "",
      rubrica: p.categoria ?? "",
      rubrica_original_ca: p.categoriaOriginal ?? "",
      valor: p.valor,
      pago: p.valorPago,
      em_aberto: p.valorEmAberto,
      vencimento: p.dataVencimento ?? "",
      pagamento: p.dataPagamento ?? "",
      status: p.status,
      fonte: fonteLabel(p.fonteClassificacao),
      confianca: confiancaLabel(p.confiancaClassificacao),
      editado: p.editadoManual ? "sim" : "não",
      excluido: p.excluido ? "sim" : "não",
      nota: p.notaClassificacao ?? "",
      origem: p.origem,
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

  const exportRubricas = (format: "csv" | "pdf" | "json") => {
    const rows = (data?.rubricas ?? []).map(r => ({
      rubrica: r.label,
      entrada_dre: r.entradaDre ?? "",
      titulos: r.qtd,
      pago: r.pago,
      em_aberto: r.emAberto,
      total: r.total,
      pct: r.pctDoDesembolso,
    }));
    if (format === "json") {
      downloadJson(`financeiro-rubricas-${exportBase}.json`, rows);
      return;
    }
    exportObjectRows(rows, {
      title: "Desembolso por rúbrica",
      subtitle: periodoLabel,
      filename: `financeiro-rubricas-${exportBase}`,
      format,
    });
  };

  const exportFluxo = (format: "csv" | "pdf" | "json") => {
    const rows = (data?.fluxoDias ?? []).map(d => ({
      data: d.data,
      entradas_previstas: d.entradasPrevistas,
      saidas_previstas: d.saidasPrevistas,
      saldo_previsto: d.saldoLiquidoPrevisto,
      entradas_realizadas: d.entradasRealizadas,
      saidas_realizadas: d.saidasRealizadas,
      saldo_realizado: d.saldoLiquidoRealizado,
      saldo_acumulado: d.saldoAcumuladoRealizado,
    }));
    if (format === "json") {
      downloadJson(`financeiro-fluxo-diario-${exportBase}.json`, rows);
      return;
    }
    exportObjectRows(rows, {
      title: "Fluxo diário",
      subtitle: periodoLabel,
      filename: `financeiro-fluxo-diario-${exportBase}`,
      format,
      orientation: "landscape",
    });
  };

  const exportPacoteCompleto = () => {
    if (!data) return;
    downloadJson(`financeiro-pacote-${exportBase}.json`, {
      periodo: data.periodo,
      resumo: data.resumo,
      qualidadeAlocacao: data.qualidadeAlocacao,
      rubricas: data.rubricas,
      gruposDre: data.gruposDre,
      fornecedores: data.fornecedores,
      fluxoDias: data.fluxoDias,
      agingPagar: data.agingPagar,
      agingReceber: data.agingReceber,
      lancamentosPagar: data.lancamentosPagar,
      classificacoes: data.classificacoes,
      ajustesManuais: data.ajustesManuais,
      geradoEm: new Date().toISOString(),
    });
    toast.success("Pacote JSON baixado");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl space-y-5 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conta Azul
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Análise financeira
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              KPIs e fluxo diário por rúbrica — visão clara do caixa no período.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              <Button
                size="sm"
                variant={modoPeriodo === "mes" ? "default" : "ghost"}
                className="h-8"
                onClick={() => setModoPeriodo("mes")}
              >
                Mês
              </Button>
              <Button
                size="sm"
                variant={modoPeriodo === "custom" ? "default" : "ghost"}
                className="h-8"
                onClick={() => setModoPeriodo("custom")}
              >
                Datas
              </Button>
            </div>
            {modoPeriodo === "mes" ? (
              <div>
                <Label className="text-xs">Mês</Label>
                <Input
                  type="month"
                  className="h-9 w-[160px]"
                  value={mes}
                  onChange={e => setMes(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="date"
                    className="h-9 w-[150px]"
                    value={inicioCustom}
                    onChange={e => setInicioCustom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="date"
                    className="h-9 w-[150px]"
                    value={fimCustom}
                    onChange={e => setFimCustom(e.target.value)}
                  />
                </div>
              </>
            )}
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
            Carregando títulos Conta Azul…
          </p>
        ) : null}

        {data ? (
          <>
            {data.avisos?.length ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {data.avisos.join(" · ")}
              </p>
            ) : null}

            {!data.qualidadeAlocacao.baseConfiavelParaDecisao ? (
              <Card className="border-amber-300 bg-amber-50">
                <CardContent className="space-y-1 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Classificação incompleta</p>
                  <p className="text-xs">
                    {data.qualidadeAlocacao.motivoBloqueioDecisao}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Kpi
                icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                label="Entradas"
                value={fmtMoney(data.resumo.entradasRealizadas)}
                hint={`Prev. ${fmtMoney(data.resumo.entradasPrevistas)}`}
              />
              <Kpi
                icon={<ArrowDownRight className="h-4 w-4 text-red-600" />}
                label="Saídas"
                value={fmtMoney(data.resumo.saidasRealizadas)}
                hint={`Prev. ${fmtMoney(data.resumo.saidasPrevistas)}`}
              />
              <Kpi
                icon={<Wallet className="h-4 w-4 text-sky-600" />}
                label="Saldo período"
                value={fmtMoney(data.resumo.saldoPeriodoRealizado)}
                highlight={
                  data.resumo.saldoPeriodoRealizado < 0 ? "bad" : "good"
                }
              />
              <Kpi
                icon={<ArrowDownRight className="h-4 w-4 text-amber-600" />}
                label="A pagar"
                value={fmtMoney(data.resumo.aPagarEmAberto)}
              />
              <Kpi
                icon={<ArrowUpRight className="h-4 w-4 text-emerald-700" />}
                label="A receber"
                value={fmtMoney(data.resumo.aReceberEmAberto)}
              />
              <Kpi
                icon={<Tags className="h-4 w-4" />}
                label="Com rateio"
                value={`${data.qualidadeAlocacao.pctValorComRateioApi}%`}
                hint={`${data.qualidadeAlocacao.pctValorSemRubrica}% sem rúbrica`}
              />
            </div>

            <Tabs defaultValue="visao" className="space-y-4">
              <TabsList className="flex h-auto flex-wrap">
                <TabsTrigger value="visao">Visão</TabsTrigger>
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="classificacao">Classificação</TabsTrigger>
                <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                <TabsTrigger value="alertas">Alertas</TabsTrigger>
              </TabsList>

              <TabsContent value="visao" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div>
                      <CardTitle className="text-base">Fluxo diário</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Entradas e saídas realizadas · linha = saldo acumulado ·{" "}
                        {periodoLabel}
                      </p>
                    </div>
                    <ExportButtons
                      onCsv={() => exportFluxo("csv")}
                      onPdf={() => exportFluxo("pdf")}
                      onJson={() => exportFluxo("json")}
                    />
                  </CardHeader>
                  <CardContent className="h-[300px] pt-0">
                    {chartFluxo.length === 0 ? (
                      <EmptyChart />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={chartFluxo}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="dia"
                            tick={{ fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            yAxisId="bar"
                            tick={{ fontSize: 11 }}
                            tickFormatter={fmtMoneyShort}
                            width={44}
                          />
                          <YAxis
                            yAxisId="line"
                            orientation="right"
                            tick={{ fontSize: 11 }}
                            tickFormatter={fmtMoneyShort}
                            width={44}
                          />
                          <Tooltip
                            formatter={(v: number, name: string) => [
                              fmtMoney(v),
                              name,
                            ]}
                            labelFormatter={(_, payload) => {
                              const row = payload?.[0]?.payload as
                                | { data?: string }
                                | undefined;
                              return row?.data ? fmtDate(row.data) : "";
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar
                            yAxisId="bar"
                            dataKey="entradasRealizadas"
                            name="Entradas"
                            fill={CHART_GREEN}
                            radius={[2, 2, 0, 0]}
                            maxBarSize={18}
                          />
                          <Bar
                            yAxisId="bar"
                            dataKey="saidasRealizadas"
                            name="Saídas"
                            fill={CHART_RED}
                            radius={[2, 2, 0, 0]}
                            maxBarSize={18}
                          />
                          <Line
                            yAxisId="line"
                            type="monotone"
                            dataKey="saldoAcumuladoRealizado"
                            name="Saldo acum."
                            stroke={CHART_SKY}
                            strokeWidth={2}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Top rúbricas (desembolso)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Clique na barra para filtrar lançamentos
                      </p>
                    </CardHeader>
                    <CardContent className="h-[280px] pt-0">
                      {chartRubricas.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartRubricas}
                            layout="vertical"
                            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
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
                              width={110}
                              tick={{ fontSize: 11 }}
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
                            <Bar
                              dataKey="total"
                              name="Total"
                              fill={CHART_VIOLET}
                              radius={[0, 4, 4, 0]}
                              cursor="pointer"
                              onClick={(row: { chave?: string }) => {
                                if (row?.chave) setFiltroRubrica(row.chave);
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Composição DRE</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Desembolso agrupado por entrada DRE
                      </p>
                    </CardHeader>
                    <CardContent className="h-[280px] pt-0">
                      {chartDre.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartDre}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={92}
                              paddingAngle={2}
                            >
                              {chartDre.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => fmtMoney(v)} />
                            <Legend
                              wrapperStyle={{ fontSize: 11 }}
                              layout="vertical"
                              align="right"
                              verticalAlign="middle"
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Previsto × realizado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[260px] pt-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartCaixaResumo}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={fmtMoneyShort}
                            width={44}
                          />
                          <Tooltip formatter={(v: number) => fmtMoney(v)} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar
                            dataKey="previstas"
                            name="Previsto"
                            fill="#94a3b8"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Bar
                            dataKey="realizadas"
                            name="Realizado"
                            fill={CHART_SKY}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Top fornecedores
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[260px] pt-0">
                      {chartFornecedores.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartFornecedores}
                            layout="vertical"
                            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
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
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip formatter={(v: number) => fmtMoney(v)} />
                            <Bar
                              dataKey="total"
                              fill={CHART_AMBER}
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Aging a pagar</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[240px] pt-0">
                      {chartAgingPagar.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartAgingPagar}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10 }}
                              interval={0}
                              angle={-20}
                              textAnchor="end"
                              height={56}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              tickFormatter={fmtMoneyShort}
                              width={40}
                            />
                            <Tooltip formatter={(v: number) => fmtMoney(v)} />
                            <Bar
                              dataKey="valor"
                              fill={CHART_RED}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Aging a receber</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[240px] pt-0">
                      {chartAgingReceber.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartAgingReceber}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10 }}
                              interval={0}
                              angle={-20}
                              textAnchor="end"
                              height={56}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              tickFormatter={fmtMoneyShort}
                              width={40}
                            />
                            <Tooltip formatter={(v: number) => fmtMoney(v)} />
                            <Bar
                              dataKey="valor"
                              fill={CHART_GREEN}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {filtroRubrica ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setFiltroRubrica(null)}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Filtro: {filtroRubrica}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Aberto na aba Lançamentos
                    </span>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="lancamentos" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Contas a pagar
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Clique para inspecionar · {data.contagens.editados}{" "}
                      editado(s) · {data.contagens.excluidos} excluído(s)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-9 pl-8"
                          placeholder="Buscar descrição, fornecedor, rúbrica…"
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
                          checked={mostrarExcluidos}
                          onCheckedChange={v => setMostrarExcluidos(v === true)}
                        />
                        Mostrar excluídos
                      </label>
                      <ExportButtons
                        onCsv={() => exportLancamentos("csv")}
                        onPdf={() => exportLancamentos("pdf")}
                        onJson={() => exportLancamentos("json")}
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[820px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                            <th className="px-2 py-2">Descrição</th>
                            <th className="px-2 py-2">Fornecedor</th>
                            <th className="px-2 py-2">Rúbrica</th>
                            <th className="px-2 py-2">Venc.</th>
                            <th className="px-2 py-2">Total</th>
                            <th className="px-2 py-2">Confiança</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lancamentos.map(p => (
                            <tr
                              key={p.id}
                              className={`cursor-pointer border-b align-top hover:bg-muted/50 ${
                                p.excluido ? "opacity-50 line-through" : ""
                              } ${selecionadaId === p.id ? "bg-muted/60" : ""}`}
                              onClick={() => abrirDetalhe(p)}
                            >
                              <td className="max-w-[240px] px-2 py-2">
                                <p className="truncate font-medium">
                                  {p.descricao}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {p.status}
                                  {p.editadoManual ? " · editado" : ""}
                                  {p.origem === "ajuste_manual"
                                    ? " · manual"
                                    : ""}
                                </p>
                              </td>
                              <td className="max-w-[150px] truncate px-2 py-2">
                                {p.contraparte || "—"}
                              </td>
                              <td className="max-w-[180px] px-2 py-2">
                                <p
                                  className={
                                    !p.categoria
                                      ? "font-medium text-amber-700"
                                      : ""
                                  }
                                >
                                  {p.categoria || "Sem rúbrica"}
                                </p>
                              </td>
                              <td className="whitespace-nowrap px-2 py-2 text-xs">
                                {fmtDate(p.dataVencimento)}
                              </td>
                              <td className="px-2 py-2 font-semibold tabular-nums">
                                {fmtMoney(p.valor)}
                              </td>
                              <td className="px-2 py-2 text-[11px] text-muted-foreground">
                                {confiancaLabel(p.confiancaClassificacao)}
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

              <TabsContent value="classificacao" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Lançamento manual
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Despesas/receitas fora do Conta Azul ou correções de
                      relatório.
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Overrides salvos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(data.classificacoes ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma classificação manual. Abra um lançamento e salve
                        a rúbrica.
                      </p>
                    ) : (
                      (data.classificacoes ?? []).map(c => (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {c.tipo}: {c.chave}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.rubricaOverride || "—"}
                              {c.excluido ? " · excluído" : ""}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removerClass.mutate({ id: c.id })}
                          >
                            Remover
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="relatorios" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Download className="h-4 w-4" />
                      Exportar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <ReportExportCard
                      title="Lançamentos filtrados"
                      onCsv={() => exportLancamentos("csv")}
                      onPdf={() => exportLancamentos("pdf")}
                      onJson={() => exportLancamentos("json")}
                    />
                    <ReportExportCard
                      title="Por rúbrica"
                      onCsv={() => exportRubricas("csv")}
                      onPdf={() => exportRubricas("pdf")}
                      onJson={() => exportRubricas("json")}
                    />
                    <ReportExportCard
                      title="Fluxo diário"
                      onCsv={() => exportFluxo("csv")}
                      onPdf={() => exportFluxo("pdf")}
                      onJson={() => exportFluxo("json")}
                    />
                    <Card>
                      <CardContent className="space-y-2 p-4">
                        <p className="font-semibold">Pacote completo (JSON)</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={exportPacoteCompleto}
                        >
                          <FileJson className="mr-1 h-3.5 w-3.5" />
                          Baixar pacote
                        </Button>
                      </CardContent>
                    </Card>
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
            </Tabs>

            <datalist id="rubricas-sugestoes">
              {(data.rubricasSugestoes ?? []).map(r => (
                <option key={r} value={r} />
              ))}
            </datalist>

            <p className="text-[11px] text-muted-foreground">
              {periodoLabel} · {data.contagens.parcelasReceber} a receber ·{" "}
              {data.contagens.parcelasPagar} a pagar · {data.contagens.rubricas}{" "}
              rúbrica(s)
            </p>
          </>
        ) : null}
      </main>

      <Sheet
        open={!!selecionadaBase}
        onOpenChange={open => {
          if (!open) fecharDetalhe();
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selecionada ? (
            <>
              <SheetHeader>
                <SheetTitle>Detalhe do lançamento</SheetTitle>
                <SheetDescription>
                  {fonteLabel(selecionada.fonteClassificacao)} · confiança{" "}
                  {confiancaLabel(selecionada.confiancaClassificacao)}
                  {detalheQuery.isFetching
                    ? " · buscando rateio…"
                    : detalheQuery.isSuccess && detalheQuery.data
                      ? " · rateio carregado"
                      : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="font-medium">{selecionada.descricao}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                    <p>{selecionada.contraparte || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-semibold tabular-nums">
                      {fmtMoney(selecionada.valor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pago</p>
                    <p className="tabular-nums">
                      {fmtMoney(selecionada.valorPago)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Em aberto</p>
                    <p className="tabular-nums">
                      {fmtMoney(selecionada.valorEmAberto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p>{fmtDate(selecionada.dataVencimento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pagamento</p>
                    <p>{fmtDate(selecionada.dataPagamento)}</p>
                  </div>
                </div>

                {selecionada.rateio.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      Rateio (rúbricas)
                    </p>
                    <div className="space-y-2">
                      {selecionada.rateio.map((r, i) => (
                        <div key={i} className="rounded-lg border px-3 py-2">
                          <div className="flex justify-between gap-2">
                            <span>{r.categoriaNome || "Sem categoria"}</span>
                            <span className="font-semibold tabular-nums">
                              {fmtMoney(r.valor)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">
                    Sem rateio detalhado neste título.
                  </p>
                )}

                {selecionada.origem !== "ajuste_manual" ? (
                  <div className="space-y-3 rounded-xl border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Editar classificação
                    </p>
                    <div>
                      <Label className="text-xs">Rúbrica</Label>
                      <Input
                        list="rubricas-sugestoes"
                        value={editRubrica}
                        onChange={e => setEditRubrica(e.target.value)}
                      />
                      {selecionada.categoriaOriginal ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Original CA: {selecionada.categoriaOriginal}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label className="text-xs">Nota</Label>
                      <Textarea
                        rows={2}
                        value={editNota}
                        onChange={e => setEditNota(e.target.value)}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={editExcluido}
                        onCheckedChange={v => setEditExcluido(v === true)}
                      />
                      Excluir dos totais / relatórios
                    </label>
                    {selecionada.contraparte ? (
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={aplicarFornecedor}
                          onCheckedChange={v =>
                            setAplicarFornecedor(v === true)
                          }
                        />
                        Aplicar também ao fornecedor «{selecionada.contraparte}»
                      </label>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={salvarClass.isPending}
                        onClick={() => {
                          const payload = {
                            rubricaOverride: editRubrica || null,
                            excluido: editExcluido,
                            nota: editNota || null,
                          };
                          if (aplicarFornecedor && selecionada.contraparte) {
                            salvarClass.mutate({
                              tipo: "fornecedor",
                              chave: selecionada.contraparte.trim().toLowerCase(),
                              ...payload,
                            });
                          } else {
                            salvarClass.mutate({
                              tipo: "parcela",
                              chave: selecionada.id,
                              ...payload,
                            });
                          }
                        }}
                      >
                        Salvar classificação
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          exportTableDocument(
                            {
                              title: selecionada.descricao,
                              subtitle: selecionada.id,
                              filename: `lancamento-${selecionada.id.slice(0, 8)}`,
                              headers: ["Campo", "Valor"],
                              rows: [
                                ["Descrição", selecionada.descricao],
                                ["Fornecedor", selecionada.contraparte ?? ""],
                                ["Rúbrica", selecionada.categoria ?? ""],
                                ["Total", String(selecionada.valor)],
                                ["Pago", String(selecionada.valorPago)],
                                [
                                  "Vencimento",
                                  selecionada.dataVencimento ?? "",
                                ],
                              ],
                            },
                            "csv",
                          );
                        }}
                      >
                        Exportar este título
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={excluirAjuste.isPending}
                    onClick={() => {
                      if (selecionada.ajusteManualId) {
                        excluirAjuste.mutate({ id: selecionada.ajusteManualId });
                      }
                    }}
                  >
                    Remover lançamento manual
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyChart() {
  return (
    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Sem dados no período.
    </p>
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

function ExportButtons({
  onCsv,
  onPdf,
  onJson,
}: {
  onCsv: () => void;
  onPdf: () => void;
  onJson: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" className="h-9 gap-1" onClick={onCsv}>
        <FileSpreadsheet className="h-3.5 w-3.5" />
        CSV
      </Button>
      <Button size="sm" variant="outline" className="h-9 gap-1" onClick={onPdf}>
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
      <Button size="sm" variant="outline" className="h-9 gap-1" onClick={onJson}>
        <FileJson className="h-3.5 w-3.5" />
        JSON
      </Button>
    </div>
  );
}

function ReportExportCard({
  title,
  onCsv,
  onPdf,
  onJson,
}: {
  title: string;
  onCsv: () => void;
  onPdf: () => void;
  onJson: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="font-semibold">{title}</p>
        <ExportButtons onCsv={onCsv} onPdf={onPdf} onJson={onJson} />
      </CardContent>
    </Card>
  );
}
