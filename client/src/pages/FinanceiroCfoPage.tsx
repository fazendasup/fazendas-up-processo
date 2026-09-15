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

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inicioMesAtual(): string {
  const d = new Date();
  return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}

function hojeIso(): string {
  return isoLocal(new Date());
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  const [inicio, setInicio] = useState(inicioMesAtual);
  const [fim, setFim] = useState(hojeIso);
  const [busca, setBusca] = useState("");
  const [filtroRubrica, setFiltroRubrica] = useState<string | null>(null);
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [selecionadaBase, setSelecionadaBase] =
    useState<ParcelaFinanceiraNorm | null>(null);

  const [editRubrica, setEditRubrica] = useState("");
  const [editCentro, setEditCentro] = useState("");
  const [editNota, setEditNota] = useState("");
  const [editExcluido, setEditExcluido] = useState(false);
  const [aplicarFornecedor, setAplicarFornecedor] = useState(false);

  const [novoDesc, setNovoDesc] = useState("");
  const [novoRubrica, setNovoRubrica] = useState("");
  const [novoCentro, setNovoCentro] = useState("");
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
      // Mantém overrides já aplicados na listagem se o detalhe não trouxer nota
      notaClassificacao:
        det.notaClassificacao ?? selecionadaBase.notaClassificacao,
      editadoManual: det.editadoManual || selecionadaBase.editadoManual,
      excluido: det.excluido || selecionadaBase.excluido,
      categoriaOriginal:
        selecionadaBase.categoriaOriginal ?? det.categoriaOriginal,
      centroCustoOriginal:
        selecionadaBase.centroCustoOriginal ?? det.centroCustoOriginal,
    };
  }, [selecionadaBase, detalheQuery.data]);

  const salvarClass = trpc.financeiroCfo.salvarClassificacao.useMutation({
    onSuccess: async () => {
      toast.success("Classificação salva");
      await utils.financeiroCfo.analise.invalidate();
      if (selecionadaId) {
        await utils.financeiroCfo.parcelaDetalhe.invalidate();
      }
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
      setNovoCentro("");
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
    setEditCentro(p.centroCusto || "");
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
        p.centroCusto,
        p.notaClassificacao,
        p.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data?.lancamentosPagar, busca, filtroRubrica, mostrarExcluidos]);

  const exportBase = `${inicio}_${fim}`;

  const exportLancamentos = (format: "csv" | "pdf" | "json") => {
    const rows = lancamentos.map(p => ({
      id: p.id,
      descricao: p.descricao,
      fornecedor: p.contraparte ?? "",
      rubrica: p.categoria ?? "",
      rubrica_original_ca: p.categoriaOriginal ?? "",
      centro_custo: p.centroCusto ?? "",
      centro_original_ca: p.centroCustoOriginal ?? "",
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
      subtitle: `Período ${inicio} → ${fim}`,
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
      com_rateio: r.valorComRateio,
      sem_rateio: r.valorSemRateio,
    }));
    if (format === "json") {
      downloadJson(`financeiro-rubricas-${exportBase}.json`, rows);
      return;
    }
    exportObjectRows(rows, {
      title: "Desembolso por rúbrica",
      subtitle: `Período ${inicio} → ${fim}`,
      filename: `financeiro-rubricas-${exportBase}`,
      format,
    });
  };

  const exportMatriz = (format: "csv" | "pdf" | "json") => {
    const rows = (data?.matrizRubricaCentro ?? []).map(m => ({
      rubrica: m.rubrica,
      centro_custo: m.centroCusto,
      total: m.total,
      titulos: m.qtd,
      pct: m.pctDoDesembolso,
    }));
    if (format === "json") {
      downloadJson(`financeiro-matriz-${exportBase}.json`, rows);
      return;
    }
    exportObjectRows(rows, {
      title: "Matriz rúbrica × centro de custo",
      subtitle: `Período ${inicio} → ${fim}`,
      filename: `financeiro-matriz-${exportBase}`,
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
      centrosCusto: data.centrosCusto,
      matrizRubricaCentro: data.matrizRubricaCentro,
      gruposDre: data.gruposDre,
      fornecedores: data.fornecedores,
      fluxoSemanas: data.fluxoSemanas,
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
              Financeiro
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Inspeção por rúbrica e centro de custo, detalhe de cada compra,
              classificação editável e exportação de relatórios (CSV, PDF, JSON).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
            <div>
              <Label className="text-xs">Início</Label>
              <Input
                type="date"
                className="h-9 w-[150px]"
                value={inicio}
                onChange={e => setInicio(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input
                type="date"
                className="h-9 w-[150px]"
                value={fim}
                onChange={e => setFim(e.target.value)}
              />
            </div>
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
                  <p className="font-semibold">Classificação incompleta no Conta Azul</p>
                  <p className="text-xs">
                    {data.qualidadeAlocacao.motivoBloqueioDecisao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Você pode corrigir rúbrica/CC aqui (ajuste manual) — isso vale
                    para relatórios deste sistema, não regrava o Conta Azul.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />}
                label="Entradas realizadas"
                value={fmtMoney(data.resumo.entradasRealizadas)}
              />
              <Kpi
                icon={<ArrowDownRight className="h-4 w-4 text-red-600" />}
                label="Saídas realizadas"
                value={fmtMoney(data.resumo.saidasRealizadas)}
              />
              <Kpi
                icon={<Wallet className="h-4 w-4 text-sky-600" />}
                label="Saldo período"
                value={fmtMoney(data.resumo.saldoPeriodoRealizado)}
                highlight={data.resumo.saldoPeriodoRealizado < 0 ? "bad" : "good"}
              />
              <Kpi
                icon={<Tags className="h-4 w-4" />}
                label="% valor com rateio API"
                value={`${data.qualidadeAlocacao.pctValorComRateioApi}%`}
                hint={`${data.qualidadeAlocacao.pctValorSemRubrica}% sem rúbrica`}
              />
            </div>

            <Tabs defaultValue="lancamentos" className="space-y-4">
              <TabsList className="flex h-auto flex-wrap">
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="rubricas">Rúbricas</TabsTrigger>
                <TabsTrigger value="centros">Centros</TabsTrigger>
                <TabsTrigger value="matriz">Matriz</TabsTrigger>
                <TabsTrigger value="aging">Aging</TabsTrigger>
                <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
                <TabsTrigger value="classificacao">Classificação</TabsTrigger>
                <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                <TabsTrigger value="alertas">Alertas</TabsTrigger>
              </TabsList>

              <TabsContent value="lancamentos" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Contas a pagar — clique para inspecionar
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Clique para inspecionar (rateio Conta Azul sob demanda) ·{" "}
                      {data.contagens.editados} editado(s) ·{" "}
                      {data.contagens.excluidos} excluído(s)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="h-9 pl-8"
                          placeholder="Buscar descrição, fornecedor, rúbrica, id…"
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
                      <table className="w-full min-w-[980px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                            <th className="px-2 py-2">Descrição</th>
                            <th className="px-2 py-2">Fornecedor</th>
                            <th className="px-2 py-2">Rúbrica</th>
                            <th className="px-2 py-2">CC</th>
                            <th className="px-2 py-2">Venc.</th>
                            <th className="px-2 py-2">Total</th>
                            <th className="px-2 py-2">Fonte</th>
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
                              <td className="max-w-[220px] px-2 py-2">
                                <p className="truncate font-medium">{p.descricao}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {p.status}
                                  {p.editadoManual ? " · editado" : ""}
                                  {p.origem === "ajuste_manual" ? " · manual" : ""}
                                </p>
                              </td>
                              <td className="max-w-[150px] truncate px-2 py-2">
                                {p.contraparte || "—"}
                              </td>
                              <td className="max-w-[160px] px-2 py-2">
                                <p
                                  className={
                                    !p.categoria ? "font-medium text-amber-700" : ""
                                  }
                                >
                                  {p.categoria || "Sem rúbrica"}
                                </p>
                                {p.categoriaOriginal &&
                                p.categoriaOriginal !== p.categoria ? (
                                  <p className="text-[10px] text-muted-foreground">
                                    CA: {p.categoriaOriginal}
                                  </p>
                                ) : null}
                              </td>
                              <td className="max-w-[120px] truncate px-2 py-2">
                                {p.centroCusto || "—"}
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

              <TabsContent value="rubricas" className="space-y-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base">Por rúbrica</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Clique para filtrar lançamentos
                      </p>
                    </div>
                    <ExportButtons
                      onCsv={() => exportRubricas("csv")}
                      onPdf={() => exportRubricas("pdf")}
                      onJson={() => exportRubricas("json")}
                    />
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="px-2 py-2">Rúbrica</th>
                          <th className="px-2 py-2">DRE</th>
                          <th className="px-2 py-2">Qtd</th>
                          <th className="px-2 py-2">Total</th>
                          <th className="px-2 py-2">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.rubricas ?? []).map(r => (
                          <tr
                            key={r.chave}
                            className="cursor-pointer border-b hover:bg-muted/40"
                            onClick={() => setFiltroRubrica(r.chave)}
                          >
                            <td className="px-2 py-2 font-medium">{r.label}</td>
                            <td className="px-2 py-2 text-xs text-muted-foreground">
                              {r.entradaDre || "—"}
                            </td>
                            <td className="px-2 py-2 tabular-nums">{r.qtd}</td>
                            <td className="px-2 py-2 font-semibold tabular-nums">
                              {fmtMoney(r.total)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {r.pctDoDesembolso}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="centros" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Por centro de custo</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="px-2 py-2">Centro</th>
                          <th className="px-2 py-2">Qtd</th>
                          <th className="px-2 py-2">Total</th>
                          <th className="px-2 py-2">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.centrosCusto ?? []).map(c => (
                          <tr key={c.chave} className="border-b">
                            <td className="px-2 py-2 font-medium">{c.label}</td>
                            <td className="px-2 py-2 tabular-nums">{c.qtd}</td>
                            <td className="px-2 py-2 font-semibold tabular-nums">
                              {fmtMoney(c.total)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {c.pctDoDesembolso}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="matriz" className="space-y-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">
                      Rúbrica × centro de custo
                    </CardTitle>
                    <ExportButtons
                      onCsv={() => exportMatriz("csv")}
                      onPdf={() => exportMatriz("pdf")}
                      onJson={() => exportMatriz("json")}
                    />
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="px-2 py-2">Rúbrica</th>
                          <th className="px-2 py-2">Centro</th>
                          <th className="px-2 py-2">Total</th>
                          <th className="px-2 py-2">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.matrizRubricaCentro ?? []).map(m => (
                          <tr
                            key={`${m.rubrica}-${m.centroCusto}`}
                            className="border-b"
                          >
                            <td className="px-2 py-2">{m.rubrica}</td>
                            <td className="px-2 py-2">{m.centroCusto}</td>
                            <td className="px-2 py-2 font-semibold tabular-nums">
                              {fmtMoney(m.total)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {m.pctDoDesembolso}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="aging" className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <AgingCard titulo="A pagar em aberto" buckets={data.agingPagar} />
                  <AgingCard titulo="A receber em aberto" buckets={data.agingReceber} />
                </div>
              </TabsContent>

              <TabsContent value="fluxo" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Fluxo semanal</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="px-2 py-2">Semana</th>
                          <th className="px-2 py-2">Ent. prev.</th>
                          <th className="px-2 py-2">Sai. prev.</th>
                          <th className="px-2 py-2">Saldo prev.</th>
                          <th className="px-2 py-2">Ent. real.</th>
                          <th className="px-2 py-2">Sai. real.</th>
                          <th className="px-2 py-2">Saldo real.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.fluxoSemanas ?? []).map(s => (
                          <tr key={s.inicioSemana} className="border-b">
                            <td className="px-2 py-2">{fmtDate(s.inicioSemana)}</td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.entradasPrevistas)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.saidasPrevistas)}
                            </td>
                            <td className="px-2 py-2 font-semibold tabular-nums">
                              {fmtMoney(s.saldoLiquidoPrevisto)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.entradasRealizadas)}
                            </td>
                            <td className="px-2 py-2 tabular-nums">
                              {fmtMoney(s.saidasRealizadas)}
                            </td>
                            <td className="px-2 py-2 font-semibold tabular-nums">
                              {fmtMoney(s.saldoLiquidoRealizado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="classificacao" className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Acrescentar lançamento manual
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Para despesas/receitas que não estão no Conta Azul, ou
                      correções de relatório.
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={novoDesc}
                        onChange={e => setNovoDesc(e.target.value)}
                        placeholder="Ex.: Ajuste embalagem Plazom"
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
                      <Label className="text-xs">Centro de custo</Label>
                      <Input
                        list="centros-sugestoes"
                        value={novoCentro}
                        onChange={e => setNovoCentro(e.target.value)}
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
                          if (!novoDesc.trim() || !novoRubrica.trim() || !Number.isFinite(valor)) {
                            toast.error("Preencha descrição, rúbrica e valor");
                            return;
                          }
                          criarAjuste.mutate({
                            tipo: "pagar",
                            descricao: novoDesc,
                            rubrica: novoRubrica,
                            centroCusto: novoCentro || null,
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
                      Regras e overrides salvos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(data.classificacoes ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma classificação manual ainda. Abra um lançamento e
                        salve rúbrica/CC.
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
                              {c.rubricaOverride || "—"} · {c.centroCustoOverride || "—"}
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
                    <p className="text-xs text-muted-foreground">
                      CSV (Excel), PDF e JSON — com a classificação editada
                      aplicada.
                    </p>
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
                      title="Matriz rúbrica × CC"
                      onCsv={() => exportMatriz("csv")}
                      onPdf={() => exportMatriz("pdf")}
                      onJson={() => exportMatriz("json")}
                    />
                    <Card>
                      <CardContent className="space-y-2 p-4">
                        <p className="font-semibold">Pacote completo (JSON)</p>
                        <p className="text-xs text-muted-foreground">
                          Resumo, rúbricas, matriz, aging, lançamentos e
                          classificações — ideal para BI / auditoria.
                        </p>
                        <Button size="sm" variant="outline" onClick={exportPacoteCompleto}>
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
                      Alertas factuais
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Só caixa e integridade de classificação — sem “cortar
                      embalagem”.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(data.insights ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem alertas.</p>
                    ) : (
                      data.insights.map(ins => (
                        <div key={ins.id} className="rounded-xl border p-3 text-sm">
                          <p className="text-[10px] font-bold uppercase opacity-60">
                            {ins.severidade} · {ins.tipo}
                          </p>
                          <p className="font-semibold">{ins.titulo}</p>
                          <p className="mt-1 opacity-90">{ins.analise}</p>
                          <p className="mt-2 text-xs">
                            <span className="font-bold">Ação:</span> {ins.acaoSimples}
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
            <datalist id="centros-sugestoes">
              {(data.centrosSugestoes ?? []).map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <p className="text-[11px] text-muted-foreground">
              {data.contagens.parcelasReceber} a receber ·{" "}
              {data.contagens.parcelasPagar} a pagar · {data.contagens.rubricas}{" "}
              rúbrica(s) · {data.contagens.manuais} manual(is) · período{" "}
              {data.periodo.inicio} → {data.periodo.fim}
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
                    <p className="tabular-nums">{fmtMoney(selecionada.valorPago)}</p>
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
                <div>
                  <p className="text-xs text-muted-foreground">ID Conta Azul</p>
                  <p className="break-all font-mono text-xs">{selecionada.id}</p>
                </div>

                {selecionada.rateio.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      Rateio
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
                          {r.centros.map((c, j) => (
                            <p
                              key={j}
                              className="text-xs text-muted-foreground"
                            >
                              CC {c.nome || "—"}: {fmtMoney(c.valor)}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">
                    Sem rateio detalhado da API neste título (usou categoria da
                    listagem, se houver).
                  </p>
                )}

                {selecionada.origem !== "ajuste_manual" ? (
                  <div className="space-y-3 rounded-xl border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Editar classificação (deste sistema)
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
                      <Label className="text-xs">Centro de custo</Label>
                      <Input
                        list="centros-sugestoes"
                        value={editCentro}
                        onChange={e => setEditCentro(e.target.value)}
                      />
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
                          onCheckedChange={v => setAplicarFornecedor(v === true)}
                        />
                        Aplicar também a todo o fornecedor «
                        {selecionada.contraparte}»
                      </label>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={salvarClass.isPending}
                        onClick={() => {
                          const payload = {
                            rubricaOverride: editRubrica || null,
                            centroCustoOverride: editCentro || null,
                            excluido: editExcluido,
                            nota: editNota || null,
                          };
                          if (aplicarFornecedor && selecionada.contraparte) {
                            salvarClass.mutate({
                              tipo: "fornecedor",
                              chave: selecionada.contraparte,
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
                              headers: [
                                "Campo",
                                "Valor",
                              ],
                              rows: [
                                ["Descrição", selecionada.descricao],
                                ["Fornecedor", selecionada.contraparte ?? ""],
                                ["Rúbrica", selecionada.categoria ?? ""],
                                ["CC", selecionada.centroCusto ?? ""],
                                ["Total", String(selecionada.valor)],
                                ["Pago", String(selecionada.valorPago)],
                                ["Vencimento", selecionada.dataVencimento ?? ""],
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
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={`text-lg font-bold tabular-nums ${
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
            <p className="text-[11px] text-muted-foreground">{hint}</p>
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

function AgingCard({
  titulo,
  buckets,
}: {
  titulo: string;
  buckets: Array<{ chave: string; label: string; valor: number; qtd: number }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {buckets.map(b => (
          <div
            key={b.chave}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{b.label}</p>
              <p className="text-[11px] text-muted-foreground">{b.qtd} título(s)</p>
            </div>
            <p className="font-semibold tabular-nums">{fmtMoney(b.valor)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
