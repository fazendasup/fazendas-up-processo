// ============================================================
// Estoque — Sementes, substratos, biológicos, nutrientes, embalagem (unidades: kg, L, unidade)
// Projeções: compra sugerida, esgotamento, KPIs de custo
// ============================================================

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  CATEGORIAS_ESTOQUE,
  LABEL_CATEGORIA,
  analiseCadastroEstoque,
  labelUnidadeEstoque,
  textoFaltasCadastroEstoque,
  type EstoqueCategoria,
  type EstoqueUnidadeTipo,
} from "@shared/estoque";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Package,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  Wallet,
  Boxes,
  CalendarClock,
  FileDown,
  Printer,
  LayoutGrid,
  Search,
  Building2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  agregarPorFornecedor,
  downloadCsvUtf8Bom,
  linhasParaCsv,
  mapaAbcPorValorLinha,
  abrirImpressaoInventario,
  type LinhaEstoqueExport,
} from "@/lib/estoqueRelatorio";

const TAB_GERAL = "geral" as const;
type EstoqueTab = typeof TAB_GERAL | EstoqueCategoria;

type ItemEnriquecido = {
  id: number;
  categoria: string;
  nome: string;
  quantidadeTotal: number;
  unidadeTipo: string;
  usoPorEvento: number;
  frequenciaDias: number;
  prazoEntregaDias: number;
  diasMargemCompra: number;
  nivelMinimo: number | null;
  precoUnitario: number | null;
  fornecedor: string | null;
  observacoes: string | null;
  consumoMedioDiario: number | null;
  diasAteEsgotar: number | null;
  dataEsgotamentoIso: string | null;
  dataCompraSugeridaIso: string | null;
  status: string;
  valorLinha: number;
  custoConsumoDiario: number | null;
  custoConsumoMensal: number | null;
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtNum = (n: number | null | undefined, dec = 1) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: dec });

function collectIsoDates(
  rows: ItemEnriquecido[],
  field: "dataCompraSugeridaIso" | "dataEsgotamentoIso",
): Date[] {
  const out: Date[] = [];
  for (const r of rows) {
    const iso = r[field];
    if (!iso) continue;
    try {
      out.push(parseISO(iso));
    } catch {
      /* ignore */
    }
  }
  return out;
}

function statusBadge(status: string) {
  if (status === "critico")
    return "bg-destructive/15 text-destructive border-destructive/30";
  if (status === "atencao") return "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30";
  if (status === "sem_uso") return "bg-muted text-muted-foreground border-border";
  return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/25";
}

function statusLabel(status: string) {
  if (status === "critico") return "Crítico";
  if (status === "atencao") return "Atenção";
  if (status === "sem_uso") return "Sem consumo";
  return "OK";
}

function abaixoDoMinimo(row: ItemEnriquecido): boolean {
  return row.nivelMinimo != null && row.nivelMinimo > 0 && row.quantidadeTotal <= row.nivelMinimo;
}

function CadastroIncompletoIndicador({ row }: { row: ItemEnriquecido }) {
  const { incompleto, faltas } = analiseCadastroEstoque(row);
  if (!incompleto) return null;
  const tip = `Cadastro incompleto: falta ${textoFaltasCadastroEstoque(faltas)}.`;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 text-amber-600 dark:text-amber-400"
      title={tip}
      role="img"
      aria-label={tip}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wide max-w-[5rem] truncate">
        Falta dados
      </span>
    </span>
  );
}

function badgeAbc(cls: "A" | "B" | "C") {
  if (cls === "A") return "bg-emerald-600/15 text-emerald-900 dark:text-emerald-100 border-emerald-600/30";
  if (cls === "B") return "bg-sky-600/15 text-sky-900 dark:text-sky-100 border-sky-600/30";
  return "bg-muted text-muted-foreground border-border";
}

function parsePtFloatInput(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parsePtIntInput(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function toExportRow(r: ItemEnriquecido): LinhaEstoqueExport {
  return {
    id: r.id,
    categoria: r.categoria,
    nome: r.nome,
    quantidadeTotal: r.quantidadeTotal,
    unidadeTipo: r.unidadeTipo,
    nivelMinimo: r.nivelMinimo,
    usoPorEvento: r.usoPorEvento,
    frequenciaDias: r.frequenciaDias,
    prazoEntregaDias: r.prazoEntregaDias,
    diasMargemCompra: r.diasMargemCompra,
    precoUnitario: r.precoUnitario,
    fornecedor: r.fornecedor,
    observacoes: r.observacoes,
    diasAteEsgotar: r.diasAteEsgotar,
    dataCompraSugeridaIso: r.dataCompraSugeridaIso,
    dataEsgotamentoIso: r.dataEsgotamentoIso,
    status: r.status,
    valorLinha: r.valorLinha,
    consumoMedioDiario: r.consumoMedioDiario,
  };
}

export default function EstoquePage() {
  const utils = trpc.useUtils();
  const { data: itens = [], isLoading } = trpc.estoque.list.useQuery();
  const { data: kpis } = trpc.estoque.kpis.useQuery();

  const [tab, setTab] = useState<EstoqueTab>(TAB_GERAL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  /** Categoria do item em edição (evita mover item se o utilizador mudar de aba com o diálogo aberto). */
  const [editCategoria, setEditCategoria] = useState<EstoqueCategoria | null>(null);
  /** Categoria ao criar item a partir da visão geral. */
  const [formCategoria, setFormCategoria] = useState<EstoqueCategoria>("sementes");
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewFiltroCategoria, setOverviewFiltroCategoria] = useState<"todas" | EstoqueCategoria>("todas");

  const atencaoPainel = useMemo(() => {
    const rows = itens as ItemEnriquecido[];
    const hoje = startOfDay(new Date());
    const em7d = addDays(hoje, 7);
    let semPreco = 0;
    let semFornecedor = 0;
    let abaixoMin = 0;
    let compraAtrasada = 0;
    let compraProx7 = 0;
    let cadastroIncompleto = 0;
    for (const r of rows) {
      if (r.precoUnitario == null || r.precoUnitario <= 0) semPreco++;
      if (!r.fornecedor?.trim()) semFornecedor++;
      if (analiseCadastroEstoque(r).incompleto) cadastroIncompleto++;
      if (abaixoDoMinimo(r)) abaixoMin++;
      if (r.dataCompraSugeridaIso) {
        try {
          const d = startOfDay(parseISO(r.dataCompraSugeridaIso));
          if (d.getTime() <= hoje.getTime()) compraAtrasada++;
          else if (d.getTime() <= em7d.getTime()) compraProx7++;
        } catch {
          /* ignore */
        }
      }
    }
    return { semPreco, semFornecedor, abaixoMin, compraAtrasada, compraProx7, cadastroIncompleto };
  }, [itens]);

  const overviewFiltered = useMemo(() => {
    const allRows = itens as ItemEnriquecido[];
    const q = overviewSearch.trim().toLowerCase();
    return allRows.filter((r) => {
      if (overviewFiltroCategoria !== "todas" && r.categoria !== overviewFiltroCategoria) return false;
      if (!q) return true;
      const nome = r.nome.toLowerCase();
      const forn = (r.fornecedor ?? "").toLowerCase();
      const obs = (r.observacoes ?? "").toLowerCase();
      return nome.includes(q) || forn.includes(q) || obs.includes(q);
    });
  }, [itens, overviewSearch, overviewFiltroCategoria]);

  const abcMap = useMemo(() => {
    const allRows = itens as ItemEnriquecido[];
    return mapaAbcPorValorLinha(allRows.map((r) => ({ id: r.id, valorLinha: r.valorLinha })));
  }, [itens]);

  const fornecedoresAgg = useMemo(() => agregarPorFornecedor(overviewFiltered), [overviewFiltered]);

  /** Números como string para o utilizador poder apagar dígitos e deixar o campo vazio à medida que edita. */
  const [form, setForm] = useState({
    nome: "",
    quantidadeTotal: "",
    unidadeTipo: "g" as EstoqueUnidadeTipo,
    usoPorEvento: "",
    frequenciaDias: "7",
    prazoEntregaDias: "7",
    diasMargemCompra: "7",
    nivelMinimo: "" as string,
    precoUnitario: "" as string,
    fornecedor: "",
    observacoes: "",
  });

  const createMut = trpc.estoque.create.useMutation({
    onSuccess: async () => {
      await utils.estoque.invalidate();
      toast.success("Item criado");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.estoque.update.useMutation({
    onSuccess: async () => {
      await utils.estoque.invalidate();
      toast.success("Item atualizado");
      setDialogOpen(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.estoque.delete.useMutation({
    onSuccess: async () => {
      await utils.estoque.invalidate();
      toast.success("Item removido");
    },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditId(null);
    setEditCategoria(null);
    setFormCategoria(tab === TAB_GERAL ? formCategoria : tab);
    setForm({
      nome: "",
      quantidadeTotal: "",
      unidadeTipo: "kg",
      usoPorEvento: "",
      frequenciaDias: "7",
      prazoEntregaDias: "7",
      diasMargemCompra: "7",
      nivelMinimo: "",
      precoUnitario: "",
      fornecedor: "",
      observacoes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(row: ItemEnriquecido) {
    setEditId(row.id);
    setEditCategoria(row.categoria as EstoqueCategoria);
    setForm({
      nome: row.nome,
      quantidadeTotal: String(row.quantidadeTotal),
      unidadeTipo: row.unidadeTipo as EstoqueUnidadeTipo,
      usoPorEvento: String(row.usoPorEvento),
      frequenciaDias: String(row.frequenciaDias),
      prazoEntregaDias: String(row.prazoEntregaDias),
      diasMargemCompra: String(row.diasMargemCompra),
      nivelMinimo: row.nivelMinimo != null ? String(row.nivelMinimo) : "",
      precoUnitario: row.precoUnitario != null ? String(row.precoUnitario) : "",
      fornecedor: row.fornecedor ?? "",
      observacoes: row.observacoes ?? "",
    });
    setDialogOpen(true);
  }

  function submitForm() {
    const nivelMin =
      form.nivelMinimo.trim() === "" ? null : Number.parseFloat(form.nivelMinimo.replace(",", "."));
    const preco =
      form.precoUnitario.trim() === "" ? null : Number.parseFloat(form.precoUnitario.replace(",", "."));
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    const qtd = parsePtFloatInput(form.quantidadeTotal);
    if (qtd == null || qtd < 0) {
      toast.error("Informe uma quantidade total válida");
      return;
    }
    const uso = parsePtFloatInput(form.usoPorEvento);
    if (uso == null || uso < 0) {
      toast.error("Informe o uso por evento (pode ser 0)");
      return;
    }
    const freq = parsePtFloatInput(form.frequenciaDias);
    if (freq == null || freq <= 0) {
      toast.error("Informe a frequência em dias (maior que 0)");
      return;
    }
    const prazoEnt = parsePtIntInput(form.prazoEntregaDias);
    const margem = parsePtIntInput(form.diasMargemCompra);
    if (prazoEnt == null || prazoEnt < 0) {
      toast.error("Prazo de entrega inválido");
      return;
    }
    if (margem == null || margem < 0) {
      toast.error("Margem de compra inválida");
      return;
    }
    if (editId != null) {
      const catGuard = editCategoria ?? (tab !== TAB_GERAL ? tab : "sementes");
      updateMut.mutate({
        id: editId,
        nome: form.nome.trim(),
        quantidadeTotal: qtd,
        unidadeTipo: form.unidadeTipo,
        usoPorEvento: uso,
        frequenciaDias: freq,
        prazoEntregaDias: prazoEnt,
        diasMargemCompra: margem,
        nivelMinimo: nivelMin != null && Number.isFinite(nivelMin) ? nivelMin : null,
        precoUnitario: preco != null && Number.isFinite(preco) ? preco : null,
        fornecedor: form.fornecedor.trim() || null,
        observacoes: form.observacoes.trim() || null,
        categoria: catGuard,
      });
    } else {
      const catCreate = tab === TAB_GERAL ? formCategoria : tab;
      createMut.mutate({
        categoria: catCreate,
        nome: form.nome.trim(),
        quantidadeTotal: qtd,
        unidadeTipo: form.unidadeTipo,
        usoPorEvento: uso,
        frequenciaDias: freq,
        prazoEntregaDias: prazoEnt,
        diasMargemCompra: margem,
        nivelMinimo: nivelMin != null && Number.isFinite(nivelMin) ? nivelMin : null,
        precoUnitario: preco != null && Number.isFinite(preco) ? preco : null,
        fornecedor: form.fornecedor.trim() || null,
        observacoes: form.observacoes.trim() || null,
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[min(100%,100rem)] px-3 sm:px-5 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Package className="w-7 h-7 text-sky-600" />
              Estoque
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Controle de insumos, datas sugeridas de compra e projeção de esgotamento com base no consumo.
            </p>
          </div>
        </div>

        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="surface-panel p-4 border border-border/60 rounded-xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground">
                <Wallet className="w-3.5 h-3.5" />
                Valor total
              </div>
              <p className="text-xl font-bold mt-1">{fmtMoney(kpis.valorTotalInventario)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpis.totalItens} itens</p>
            </div>
            <div className="surface-panel p-4 border border-border/60 rounded-xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground">
                <TrendingDown className="w-3.5 h-3.5" />
                Custo consumo / mês
              </div>
              <p className="text-xl font-bold mt-1">{fmtMoney(kpis.custoConsumoMensalEstimado)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Soma do consumo diário × 30 × preço</p>
            </div>
            <div className="surface-panel p-4 border border-amber-500/25 bg-amber-500/5 rounded-xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                Atenção / crítico
              </div>
              <p className="text-xl font-bold mt-1">
                {kpis.itensAtencao} / <span className="text-destructive">{kpis.itensCriticos}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Compra atrasada ou &lt; 14 dias de cobertura</p>
            </div>
            <div className="surface-panel p-4 border border-border/60 rounded-xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground">
                <Boxes className="w-3.5 h-3.5" />
                Cobertura média
              </div>
              <p className="text-xl font-bold mt-1">
                {kpis.diasMedioCobertura != null ? `${fmtNum(kpis.diasMedioCobertura, 0)} dias` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Média de dias até esgotar (itens com uso)</p>
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as EstoqueTab)} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value={TAB_GERAL} className="text-xs gap-1">
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                Visão geral
                {kpis != null && (
                  <span className="ml-0.5 text-muted-foreground">({kpis.totalItens})</span>
                )}
              </TabsTrigger>
              {CATEGORIAS_ESTOQUE.map((c) => (
                <TabsTrigger key={c} value={c} className="text-xs">
                  {LABEL_CATEGORIA[c]}
                  {kpis?.porCategoria[c] != null && (
                    <span className="ml-1 text-muted-foreground">({kpis.porCategoria[c].count})</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Novo item
            </Button>
          </div>

          <TabsContent value={TAB_GERAL} className="space-y-4 mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Compra atrasada</p>
                <p className="text-lg font-bold text-destructive">{atencaoPainel.compraAtrasada}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Comprar em 7 dias</p>
                <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{atencaoPainel.compraProx7}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Abaixo do mínimo</p>
                <p className="text-lg font-bold">{atencaoPainel.abaixoMin}</p>
              </div>
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-amber-900 dark:text-amber-200">
                  Cadastro incompleto
                </p>
                <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  {atencaoPainel.cadastroIncompleto}
                </p>
                <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                  Fornecedor, preço ou nível mín.
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Sem preço unit.</p>
                <p className="text-lg font-bold">{atencaoPainel.semPreco}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Sem fornecedor</p>
                <p className="text-lg font-bold">{atencaoPainel.semFornecedor}</p>
              </div>
              <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 col-span-2 sm:col-span-1 lg:col-span-1">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Curva ABC</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  A = ~80% do valor · B ~15% · C resto
                </p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar nome, fornecedor ou observações…"
                    className="pl-9"
                    value={overviewSearch}
                    onChange={(e) => setOverviewSearch(e.target.value)}
                  />
                </div>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm w-full sm:w-[200px]"
                  value={overviewFiltroCategoria}
                  onChange={(e) =>
                    setOverviewFiltroCategoria(e.target.value as "todas" | EstoqueCategoria)
                  }
                >
                  <option value="todas">Todas as categorias</option>
                  {CATEGORIAS_ESTOQUE.map((c) => (
                    <option key={c} value={c}>
                      {LABEL_CATEGORIA[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const rows = overviewFiltered.map(toExportRow);
                    const csv = linhasParaCsv(rows);
                    const d = format(new Date(), "yyyy-MM-dd");
                    downloadCsvUtf8Bom(csv, `inventario-estoque-${d}.csv`);
                    toast.success("CSV exportado");
                  }}
                >
                  <FileDown className="w-4 h-4" />
                  Exportar CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const ok = abrirImpressaoInventario(overviewFiltered.map(toExportRow), {
                      titulo: "Inventário de estoque",
                      geradoEm: format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR }),
                      subtitulo:
                        overviewFiltroCategoria === "todas"
                          ? "Todos os itens"
                          : LABEL_CATEGORIA[overviewFiltroCategoria],
                    });
                    if (!ok) toast.error("Permita pop-ups para imprimir o inventário");
                  }}
                >
                  <Printer className="w-4 h-4" />
                  Imprimir inventário
                </Button>
              </div>
            </div>

            <div className="grid xl:grid-cols-[minmax(0,1fr)_220px] gap-3 min-w-0">
              <div className="rounded-xl border border-border/70 min-w-0 [&_[data-slot=table-container]]:overflow-x-visible">
                <Table className="w-full table-fixed text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[9%] px-1.5">Categoria</TableHead>
                      <TableHead className="w-[14%] px-1.5">Item</TableHead>
                      <TableHead className="w-[10%] px-1.5 text-right">Qtd</TableHead>
                      <TableHead className="w-[6%] px-1.5 text-right">Mín.</TableHead>
                      <TableHead className="w-[8%] px-1.5">Uso / freq.</TableHead>
                      <TableHead className="w-[6%] px-1.5 text-right">Dias cob.</TableHead>
                      <TableHead className="w-[5%] px-1.5">Entrega</TableHead>
                      <TableHead className="w-[7%] px-1.5">Compra sug.</TableHead>
                      <TableHead className="w-[7%] px-1.5">Esgot.</TableHead>
                      <TableHead className="w-[8%] px-1.5 text-right">Valor</TableHead>
                      <TableHead className="w-[7%] px-1.5 text-right">Custo/d</TableHead>
                      <TableHead className="w-[4%] px-1 text-center">ABC</TableHead>
                      <TableHead className="w-[6%] px-1.5">Status</TableHead>
                      <TableHead className="w-[6%] px-0.5" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-muted-foreground text-sm">
                          A carregar…
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && overviewFiltered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-muted-foreground text-sm">
                          Nenhum item com estes filtros.
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading &&
                      overviewFiltered.map((row) => {
                        const abc = abcMap[row.id] ?? "C";
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="px-1.5 align-top whitespace-normal break-words">
                              {LABEL_CATEGORIA[row.categoria as EstoqueCategoria] ?? row.categoria}
                            </TableCell>
                            <TableCell className="px-1.5 align-top font-medium min-w-0 max-w-0">
                              <div className="flex items-start gap-1.5 min-w-0">
                                <div className="min-w-0 flex-1">
                                  <div className="truncate" title={row.nome}>
                                    {row.nome}
                                  </div>
                                  {row.fornecedor && (
                                    <div
                                      className="text-[10px] text-muted-foreground truncate"
                                      title={row.fornecedor ?? undefined}
                                    >
                                      {row.fornecedor}
                                    </div>
                                  )}
                                </div>
                                <CadastroIncompletoIndicador row={row} />
                              </div>
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums whitespace-normal break-words">
                              {fmtNum(row.quantidadeTotal, 2)}{" "}
                              {labelUnidadeEstoque(row.unidadeTipo)}
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums whitespace-normal">
                              {row.nivelMinimo != null ? fmtNum(row.nivelMinimo, 2) : "—"}
                              {abaixoDoMinimo(row) && (
                                <span className="ml-1 text-destructive font-semibold" title="Abaixo do mínimo">
                                  !
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-1.5 align-top tabular-nums whitespace-normal break-words">
                              {fmtNum(row.usoPorEvento, 2)} / {fmtNum(row.frequenciaDias, 1)} d
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums">
                              {row.diasAteEsgotar != null ? fmtNum(row.diasAteEsgotar, 0) : "—"}
                            </TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal">{row.prazoEntregaDias} d</TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal break-words">
                              {row.dataCompraSugeridaIso
                                ? format(parseISO(row.dataCompraSugeridaIso), "dd MMM yy", { locale: ptBR })
                                : "—"}
                            </TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal break-words">
                              {row.dataEsgotamentoIso
                                ? format(parseISO(row.dataEsgotamentoIso), "dd MMM yy", { locale: ptBR })
                                : "—"}
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums whitespace-normal break-words">
                              {fmtMoney(row.valorLinha)}
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums whitespace-normal break-words">
                              {row.custoConsumoDiario != null ? fmtMoney(row.custoConsumoDiario) : "—"}
                            </TableCell>
                            <TableCell className="px-1 align-top text-center">
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-1 py-0.5 rounded border inline-block min-w-[1.25rem]",
                                  badgeAbc(abc),
                                )}
                                title="Curva ABC pelo valor em estoque"
                              >
                                {abc}
                              </span>
                            </TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border inline-block max-w-full truncate align-middle",
                                  statusBadge(row.status),
                                )}
                                title={statusLabel(row.status)}
                              >
                                {statusLabel(row.status)}
                              </span>
                            </TableCell>
                            <TableCell className="px-0.5 align-top">
                              <div className="flex gap-0 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(row)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-destructive"
                                  onClick={() => {
                                    if (window.confirm(`Remover "${row.nome}"?`)) deleteMut.mutate({ id: row.id });
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4 min-w-0">
                <div className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                    <Building2 className="w-4 h-4" />
                    Concentração por fornecedor
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Identifique dependência de um único fornecedor e risco de ruptura.
                  </p>
                  {fornecedoresAgg.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-[220px] overflow-y-auto text-xs">
                      {fornecedoresAgg.slice(0, 12).map((f) => (
                        <li key={f.fornecedor} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                          <span className="truncate" title={f.fornecedor}>
                            {f.fornecedor}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {f.itens} it. · {fmtMoney(f.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CalendarClock className="w-4 h-4" />
                    Calendário (todos os itens filtrados)
                  </div>
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    className="rounded-xl border border-border/70 p-2 w-full"
                    modifiers={{
                      compra: collectIsoDates(overviewFiltered, "dataCompraSugeridaIso"),
                      esgotamento: collectIsoDates(overviewFiltered, "dataEsgotamentoIso"),
                    }}
                    modifiersClassNames={{
                      compra: "bg-amber-400/90 text-amber-950 font-semibold rounded-md",
                      esgotamento: "bg-red-500/85 text-white font-semibold rounded-md",
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {CATEGORIAS_ESTOQUE.map((c) => {
            const rows = (itens as ItemEnriquecido[]).filter((i) => i.categoria === c);
            const compraDates = collectIsoDates(rows, "dataCompraSugeridaIso");
            const esgDates = collectIsoDates(rows, "dataEsgotamentoIso");
            return (
            <TabsContent key={c} value={c} className="space-y-4 mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                {kpis?.porCategoria[c] != null && (
                  <p className="text-xs text-muted-foreground">
                    Valor nesta categoria: <strong>{fmtMoney(kpis.porCategoria[c].valor)}</strong>
                    {kpis.porCategoria[c].criticos > 0 && (
                      <span className="text-destructive ml-2">
                        · {kpis.porCategoria[c].criticos} em estado crítico
                      </span>
                    )}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0 self-start sm:self-auto"
                  onClick={() => {
                    const csv = linhasParaCsv(rows.map(toExportRow));
                    const d = format(new Date(), "yyyy-MM-dd");
                    downloadCsvUtf8Bom(csv, `inventario-${c}-${d}.csv`);
                    toast.success("CSV exportado");
                  }}
                >
                  <FileDown className="w-4 h-4" />
                  CSV desta categoria
                </Button>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_240px] gap-3 min-w-0">
                <div className="rounded-xl border border-border/70 min-w-0 [&_[data-slot=table-container]]:overflow-x-visible">
                  <Table className="w-full table-fixed text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[20%] px-1.5">Item</TableHead>
                        <TableHead className="w-[11%] px-1.5 text-right">Qtd</TableHead>
                        <TableHead className="w-[9%] px-1.5">Uso / freq.</TableHead>
                        <TableHead className="w-[6%] px-1.5">Entrega</TableHead>
                        <TableHead className="w-[11%] px-1.5">Compra sug.</TableHead>
                        <TableHead className="w-[11%] px-1.5">Esgot.</TableHead>
                        <TableHead className="w-[10%] px-1.5 text-right">Valor</TableHead>
                        <TableHead className="w-[9%] px-1.5 text-right">Custo/d</TableHead>
                        <TableHead className="w-[8%] px-1.5">Status</TableHead>
                        <TableHead className="w-[5%] px-0.5" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-muted-foreground text-sm">
                            A carregar…
                          </TableCell>
                        </TableRow>
                      )}
                      {!isLoading && rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-muted-foreground text-sm">
                            Nenhum item nesta categoria. Use &quot;Novo item&quot;.
                          </TableCell>
                        </TableRow>
                      )}
                      {!isLoading &&
                        rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="px-1.5 align-top font-medium min-w-0 max-w-0">
                              <div className="flex items-start gap-1.5 min-w-0">
                                <div className="min-w-0 flex-1">
                                  <div className="truncate" title={row.nome}>
                                    {row.nome}
                                  </div>
                                  {row.fornecedor && (
                                    <div
                                      className="text-[10px] text-muted-foreground truncate"
                                      title={row.fornecedor ?? undefined}
                                    >
                                      {row.fornecedor}
                                    </div>
                                  )}
                                </div>
                                <CadastroIncompletoIndicador row={row} />
                              </div>
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums whitespace-normal break-words">
                              {fmtNum(row.quantidadeTotal, 2)}{" "}
                              {labelUnidadeEstoque(row.unidadeTipo)}
                            </TableCell>
                            <TableCell className="px-1.5 align-top tabular-nums whitespace-normal break-words">
                              {fmtNum(row.usoPorEvento, 2)} / {fmtNum(row.frequenciaDias, 1)} d
                            </TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal">{row.prazoEntregaDias} d</TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal break-words">
                              {row.dataCompraSugeridaIso
                                ? format(parseISO(row.dataCompraSugeridaIso), "dd MMM yy", { locale: ptBR })
                                : "—"}
                            </TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal break-words">
                              {row.dataEsgotamentoIso
                                ? format(parseISO(row.dataEsgotamentoIso), "dd MMM yy", { locale: ptBR })
                                : "—"}
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums whitespace-normal break-words">
                              {fmtMoney(row.valorLinha)}
                            </TableCell>
                            <TableCell className="px-1.5 align-top text-right tabular-nums whitespace-normal break-words">
                              {row.custoConsumoDiario != null ? fmtMoney(row.custoConsumoDiario) : "—"}
                            </TableCell>
                            <TableCell className="px-1.5 align-top whitespace-normal">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border inline-block max-w-full truncate align-middle",
                                  statusBadge(row.status),
                                )}
                                title={statusLabel(row.status)}
                              >
                                {statusLabel(row.status)}
                              </span>
                            </TableCell>
                            <TableCell className="px-0.5 align-top">
                              <div className="flex gap-0 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(row)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-destructive"
                                  onClick={() => {
                                    if (window.confirm(`Remover "${row.nome}"?`)) deleteMut.mutate({ id: row.id });
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CalendarClock className="w-4 h-4" />
                    Calendário ({LABEL_CATEGORIA[c]})
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1 align-middle" />
                    Compra sugerida ·
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-2 mr-1 align-middle" />
                    Esgotamento estimado
                  </p>
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    className="rounded-xl border border-border/70 p-2 w-full"
                    modifiers={{
                      compra: compraDates,
                      esgotamento: esgDates,
                    }}
                    modifiersClassNames={{
                      compra: "bg-amber-400/90 text-amber-950 font-semibold rounded-md",
                      esgotamento: "bg-red-500/85 text-white font-semibold rounded-md",
                    }}
                  />
                </div>
              </div>
            </TabsContent>
            );
          })}
        </Tabs>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId != null ? "Editar item" : "Novo item"} —{" "}
              {LABEL_CATEGORIA[
                editId != null
                  ? (editCategoria ?? "sementes")
                  : tab === TAB_GERAL
                    ? formCategoria
                    : tab
              ]}
            </DialogTitle>
            <DialogDescription>
              Fornecedor, preço unitário e nível mínimo são esperados para cada item. Pode guardar mesmo com campos vazios:
              a lista mostra o indicador &quot;Falta dados&quot; (ícone de alerta) até completar o cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {editId == null && tab === TAB_GERAL && (
              <div>
                <Label>Categoria do novo item</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value as EstoqueCategoria)}
                >
                  {CATEGORIAS_ESTOQUE.map((c) => (
                    <option key={c} value={c}>
                      {LABEL_CATEGORIA[c]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantidade total</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.quantidadeTotal}
                  onChange={(e) => setForm({ ...form, quantidadeTotal: e.target.value })}
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={form.unidadeTipo}
                  onChange={(e) => setForm({ ...form, unidadeTipo: e.target.value as EstoqueUnidadeTipo })}
                >
                  <option value="unidade">Unidade (contagem)</option>
                  <option value="kg">Quilogramas (kg)</option>
                  <option value="l">Litros (L)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Uso por evento</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.usoPorEvento}
                  onChange={(e) => setForm({ ...form, usoPorEvento: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Na mesma unidade da quantidade</p>
              </div>
              <div>
                <Label>Frequência (dias)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.frequenciaDias}
                  onChange={(e) => setForm({ ...form, frequenciaDias: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Intervalo médio entre utilizações</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Prazo de entrega (dias)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.prazoEntregaDias}
                  onChange={(e) => setForm({ ...form, prazoEntregaDias: e.target.value })}
                />
              </div>
              <div>
                <Label>Margem antes do esgotamento (dias)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.diasMargemCompra}
                  onChange={(e) => setForm({ ...form, diasMargemCompra: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Antecedência para encomendar</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nível mínimo</Label>
                <Input
                  placeholder="Ex.: 2,5 (mesma unidade da quantidade)"
                  value={form.nivelMinimo}
                  onChange={(e) => setForm({ ...form, nivelMinimo: e.target.value })}
                />
              </div>
              <div>
                <Label>Preço unitário (R$)</Label>
                <Input
                  placeholder="Ex.: 12,50"
                  value={form.precoUnitario}
                  onChange={(e) => setForm({ ...form, precoUnitario: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitForm} disabled={createMut.isPending || updateMut.isPending}>
              {editId != null ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
