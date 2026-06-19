// ============================================================
// Custos de produção — painel CFO, custos comuns (rateio), por variedade
// ============================================================

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import {
  GRUPOS_CUSTO_PRODUCAO,
  LABEL_GRUPO_CUSTO_PRODUCAO,
  LABEL_MODO_CUSTO_PRODUCAO,
  LABEL_RATEIO_METODO_CUSTOS,
  MODOS_CUSTO_PRODUCAO,
  RATEIO_METODOS_CUSTOS,
  type GrupoCustoProducao,
  type ModoCustoProducao,
  type RateioMetodoCustos,
} from "@shared/custosProducao";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  Coins,
  Layers,
  Lightbulb,
  LineChart,
  Package,
  Pencil,
  Plus,
  Sprout,
  Trash2,
  Wallet,
} from "lucide-react";
import { CustosProdutosPainelResumo, CustosProdutosTab } from "@/components/custos/CustosProdutosPanel";
import { CustosRentabilidadePanel } from "@/components/custos/CustosRentabilidadePanel";
import { useProjeto } from "@/contexts/ProjetoContext";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type PorVariedadeOut = inferRouterOutputs<AppRouter>["custosProducao"]["porVariedade"];
type LinhaDetalhe = PorVariedadeOut["itens"][number];
type LinhaCompartilhada = inferRouterOutputs<AppRouter>["custosProducao"]["compartilhados"][number];

type FormState = {
  grupo: GrupoCustoProducao;
  rubrica: string;
  descricao: string;
  modo: ModoCustoProducao;
  /** Rubrica do projeto: repartir valor mensal entre variedades */
  ratearEntreVariedades: boolean;
  /** Só para rateio_projeto */
  rateioMetodo: RateioMetodoCustos;
  rateioDiasColheita: string;
  precoReferencia: string;
  unidadeCompra: string;
  quantidadePorPlanta: string;
  valorPorPlanta: string;
  valorPorCiclo: string;
  plantasPorCicloEstimado: string;
  valorMensal: string;
  plantasMesEstimativa: string;
  ordem: string;
  ativo: boolean;
};

function emptyFormVariedade(): FormState {
  return {
    grupo: "insumos_sementes",
    rubrica: "",
    descricao: "",
    modo: "por_planta",
    ratearEntreVariedades: false,
    rateioMetodo: "igual",
    rateioDiasColheita: "30",
    precoReferencia: "",
    unidadeCompra: "kg",
    quantidadePorPlanta: "",
    valorPorPlanta: "",
    valorPorCiclo: "",
    plantasPorCicloEstimado: "",
    valorMensal: "",
    plantasMesEstimativa: "",
    ordem: "0",
    ativo: true,
  };
}

function emptyFormComum(): FormState {
  return {
    ...emptyFormVariedade(),
    modo: "por_planta",
    ratearEntreVariedades: false,
    grupo: "overhead",
    rateioMetodo: "igual",
    rateioDiasColheita: "30",
  };
}

function formFromLinhaVar(row: LinhaDetalhe): FormState {
  return {
    grupo: row.grupo as GrupoCustoProducao,
    rubrica: row.rubrica,
    descricao: row.descricao ?? "",
    modo: row.modo as ModoCustoProducao,
    ratearEntreVariedades: row.modo === "rateio_projeto",
    rateioMetodo: (row.rateioMetodo as RateioMetodoCustos) ?? "igual",
    rateioDiasColheita: row.rateioDiasColheita != null ? String(row.rateioDiasColheita) : "30",
    precoReferencia: row.precoReferencia != null ? String(row.precoReferencia) : "",
    unidadeCompra: row.unidadeCompra ?? "",
    quantidadePorPlanta: row.quantidadePorPlanta != null ? String(row.quantidadePorPlanta) : "",
    valorPorPlanta: row.valorPorPlanta != null ? String(row.valorPorPlanta) : "",
    valorPorCiclo: row.valorPorCiclo != null ? String(row.valorPorCiclo) : "",
    plantasPorCicloEstimado:
      row.plantasPorCicloEstimado != null ? String(row.plantasPorCicloEstimado) : "",
    valorMensal: row.valorMensal != null ? String(row.valorMensal) : "",
    plantasMesEstimativa: row.plantasMesEstimativa != null ? String(row.plantasMesEstimativa) : "",
    ordem: String(row.ordem ?? 0),
    ativo: row.ativo,
  };
}

function formFromLinhaCom(row: LinhaCompartilhada): FormState {
  return formFromLinhaVar(row as unknown as LinhaDetalhe);
}

function parseOptFloat(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseOptInt(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function sevBadge(s: "alta" | "media" | "baixa") {
  if (s === "alta") return <Badge variant="destructive">Prioridade</Badge>;
  if (s === "media") return <Badge className="bg-amber-600 hover:bg-amber-600">Atenção</Badge>;
  return <Badge variant="secondary">Monitorar</Badge>;
}

export default function CustosProducaoPage() {
  const utils = trpc.useUtils();
  const { modulosAtivos } = useProjeto();
  const moduloAtivo = modulosAtivos?.custos_producao === true;
  const [tab, setTab] = useState("painel");
  const resumoQuery = trpc.custosProducao.resumo.useQuery(undefined, { enabled: moduloAtivo });
  const insightsQuery = trpc.custosProducao.insightsCfo.useQuery(undefined, { enabled: moduloAtivo });
  const basesQuery = trpc.custosProducao.basesRateio.useQuery(undefined, { enabled: moduloAtivo });
  const compartilhadosQuery = trpc.custosProducao.compartilhados.useQuery(undefined, { enabled: moduloAtivo });
  const variedadesQuery = trpc.variedades.list.useQuery(undefined, { enabled: moduloAtivo });
  const [selectedVarId, setSelectedVarId] = useState<number | null>(null);

  const detQuery = trpc.custosProducao.porVariedade.useQuery(
    { variedadeId: selectedVarId ?? 0 },
    { enabled: moduloAtivo && selectedVarId != null && selectedVarId > 0 },
  );

  useEffect(() => {
    const list = variedadesQuery.data;
    if (!list?.length) return;
    if (selectedVarId == null || !list.some((v) => v.id === selectedVarId)) {
      setSelectedVarId(list[0]!.id);
    }
  }, [variedadesQuery.data, selectedVarId]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formContext, setFormContext] = useState<"variedade" | "comum">("variedade");
  const [form, setForm] = useState<FormState>(emptyFormVariedade());

  const invalidateAll = async () => {
    await Promise.all([
      utils.custosProducao.resumo.invalidate(),
      utils.custosProducao.insightsCfo.invalidate(),
      utils.custosProducao.basesRateio.invalidate(),
      utils.custosProducao.compartilhados.invalidate(),
      selectedVarId
        ? utils.custosProducao.porVariedade.invalidate({ variedadeId: selectedVarId })
        : Promise.resolve(),
    ]);
  };

  const createMut = trpc.custosProducao.create.useMutation({
    onSuccess: async () => {
      toast.success("Rubrica criada");
      setDialogOpen(false);
      await invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.custosProducao.update.useMutation({
    onSuccess: async () => {
      toast.success("Rubrica atualizada");
      setDialogOpen(false);
      setEditingId(null);
      await invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.custosProducao.delete.useMutation({
    onSuccess: async () => {
      toast.success("Removido");
      await invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreateVariedade = () => {
    setFormContext("variedade");
    setEditingId(null);
    setForm(emptyFormVariedade());
    setDialogOpen(true);
  };

  const openCreateComum = () => {
    setFormContext("comum");
    setEditingId(null);
    setForm(emptyFormComum());
    setDialogOpen(true);
  };

  const openEditVar = (row: LinhaDetalhe) => {
    setFormContext("variedade");
    setEditingId(row.id);
    setForm(formFromLinhaVar(row));
    setDialogOpen(true);
  };

  const openEditCom = (row: LinhaCompartilhada) => {
    setFormContext("comum");
    setEditingId(row.id);
    setForm(formFromLinhaCom(row));
    setDialogOpen(true);
  };

  const submitForm = () => {
    const rubrica = form.rubrica.trim();
    if (!rubrica) {
      toast.error("Informe o nome da rubrica.");
      return;
    }

    const escopoProjeto = formContext === "comum";
    const modo: ModoCustoProducao =
      escopoProjeto && form.ratearEntreVariedades ? "rateio_projeto" : form.modo;
    const variedadeId = escopoProjeto ? null : selectedVarId;
    if (!escopoProjeto && !variedadeId) {
      toast.error("Selecione uma variedade.");
      return;
    }
    if (escopoProjeto && form.ratearEntreVariedades && modo !== "rateio_projeto") {
      toast.error("Ative «Ratear entre variedades» ou escolha outro modo de cálculo.");
      return;
    }

    const payload = {
      variedadeId: variedadeId ?? undefined,
      grupo: form.grupo,
      rubrica,
      descricao: form.descricao.trim() || null,
      modo,
      rateioMetodo: modo === "rateio_projeto" ? form.rateioMetodo : null,
      rateioDiasColheita: modo === "rateio_projeto" ? parseOptInt(form.rateioDiasColheita) ?? 30 : null,
      precoReferencia: parseOptFloat(form.precoReferencia),
      unidadeCompra: form.unidadeCompra.trim() || null,
      quantidadePorPlanta: parseOptFloat(form.quantidadePorPlanta),
      valorPorPlanta: parseOptFloat(form.valorPorPlanta),
      valorPorCiclo: parseOptFloat(form.valorPorCiclo),
      plantasPorCicloEstimado: parseOptInt(form.plantasPorCicloEstimado),
      valorMensal: parseOptFloat(form.valorMensal),
      plantasMesEstimativa: parseOptInt(form.plantasMesEstimativa),
      ordem: parseOptInt(form.ordem) ?? 0,
      ativo: form.ativo,
    };

    if (editingId != null) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const totaisResumo = useMemo(() => {
    const rows = resumoQuery.data ?? [];
    const max = rows.reduce((a, r) => Math.max(a, r.custoTotalPorPlanta), 0);
    const min = rows.filter((r) => r.custoTotalPorPlanta > 0).reduce((a, r) => Math.min(a, r.custoTotalPorPlanta), Infinity);
    return { max, min: Number.isFinite(min) ? min : 0, n: rows.length };
  }, [resumoQuery.data]);

  const detItens = detQuery.data?.itens ?? [];
  const parcelas = detQuery.data?.parcelasRateio ?? [];
  const detTotalDireto = useMemo(
    () =>
      detItens.reduce((s, r) => {
        if (!r.ativo || r.custoPorPlantaCalculado == null) return s;
        return s + r.custoPorPlantaCalculado;
      }, 0),
    [detItens],
  );
  const detTotalRateio = useMemo(
    () => parcelas.reduce((s, p) => s + (p.rPorPlanta ?? 0), 0),
    [parcelas],
  );

  const drivers = insightsQuery.data?.driversCusto ?? [];
  const maxDriver = drivers[0]?.valorAproximado ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-16 md:p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Coins className="h-7 w-7 text-amber-600" aria-hidden />
              Custos de produção
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Custos <strong>por cultura</strong> (R$/planta), rubricas <strong>compartilhadas</strong> do projeto e
              fichas por <strong>produto vendido</strong> (produção própria, revenda processada e mix). O painel sugere
              onde agir como num olhar de CFO.
            </p>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="painel" className="gap-1.5">
                <LineChart className="h-3.5 w-3.5" />
                Painel &amp; insights
              </TabsTrigger>
              <TabsTrigger value="variedade" className="gap-1.5">
                <Sprout className="h-3.5 w-3.5" />
                Por cultura
              </TabsTrigger>
              <TabsTrigger value="produtos" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Produtos vendidos
              </TabsTrigger>
              <TabsTrigger value="comuns" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Compartilhados
              </TabsTrigger>
              <TabsTrigger value="rentabilidade" className="gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                Rentabilidade
              </TabsTrigger>
              <TabsTrigger value="simulador" className="gap-1.5">
                <Calculator className="h-3.5 w-3.5" />
                Simulador
              </TabsTrigger>
            </TabsList>

            <TabsContent value="painel" className="space-y-6 mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pico R$/planta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{fmtMoney(totaisResumo.max)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Mediana (insights)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">
                      {fmtMoney(insightsQuery.data?.resumoMedianaPorPlanta ?? 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Só variedades com custo &gt; 0</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Variedades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold tabular-nums">{totaisResumo.n}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Onde priorizar
                    </CardTitle>
                    <CardDescription>
                      Combina custos lançados, ocupação em furos, colheitas e estoque — sugestões operacionais, não
                      consultoria fiscal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                    {insightsQuery.isLoading && (
                      <p className="text-sm text-muted-foreground">Gerando insights…</p>
                    )}
                    {(insightsQuery.data?.alertas ?? []).length === 0 && !insightsQuery.isLoading && (
                      <p className="text-sm text-muted-foreground">
                        Sem alertas fortes com os dados atuais. Continue lançando rubricas e colheitas para o painel
                        ganhar densidade.
                      </p>
                    )}
                    {(insightsQuery.data?.alertas ?? []).map((a, i) => (
                      <div
                        key={i}
                        className="rounded-lg border bg-card/60 p-3 text-sm space-y-2 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {sevBadge(a.severidade)}
                          <span className="font-semibold leading-tight">{a.titulo}</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{a.texto}</p>
                        {a.acao ? (
                          <p className="text-xs flex gap-1.5 items-start text-foreground/90">
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{a.acao}</span>
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Principais rubricas (ordem de grandeza)</CardTitle>
                    <CardDescription>Peso aproximado por grupo — inclui rateios mensais e custos × plantas ocupadas.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {drivers.length === 0 && (
                      <p className="text-sm text-muted-foreground">Cadastre rubricas para ver o gráfico.</p>
                    )}
                    {drivers.map((d) => (
                      <div key={d.grupo} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium line-clamp-1 pr-2">{d.label}</span>
                          <span className="tabular-nums text-muted-foreground shrink-0">
                            {fmtMoney(d.valorAproximado)}
                          </span>
                        </div>
                        <Progress value={Math.min(100, (d.valorAproximado / maxDriver) * 100)} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Comparativo por variedade</CardTitle>
                  <CardDescription>
                    Direto + parcela de <strong>custos comuns</strong> normalizada pelas plantas «plantado» (quando
                    há rateio sem ocupação, o detalhe da variedade explica).
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variedade</TableHead>
                        <TableHead className="text-right">Ocupação</TableHead>
                        <TableHead className="text-right">Direto</TableHead>
                        <TableHead className="text-right">Rateio</TableHead>
                        <TableHead className="text-right font-semibold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(resumoQuery.data ?? []).map((r) => (
                        <TableRow key={r.variedadeId}>
                          <TableCell className="font-medium">{r.variedadeNome}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.plantasOcupadasFuros}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {fmtMoney(r.custoDiretoPorPlanta)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {r.custoRateioPorPlanta != null ? fmtMoney(r.custoRateioPorPlanta) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {fmtMoney(r.custoTotalPorPlanta)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <CustosProdutosPainelResumo />
            </TabsContent>

            <TabsContent value="produtos">
              <CustosProdutosTab modo="lista" />
            </TabsContent>

            <TabsContent value="rentabilidade">
              <CustosRentabilidadePanel />
            </TabsContent>

            <TabsContent value="simulador">
              <CustosProdutosTab modo="simulador" />
            </TabsContent>

            <TabsContent value="comuns" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Rubricas do projeto</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Use esta aba para custos que não pertencem a uma variedade só. Ative{" "}
                  <strong>Ratear entre variedades</strong> quando o valor mensal deve ser repartido (energia, aluguel,
                  overhead…). Deixe desligado para referências globais (contratos, seguros, estimativas fixas) que{" "}
                  <strong>não entram</strong> no R$/planta de cada cultura — ou cadastre o custo direto na aba Por
                  variedade.
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="gap-1" onClick={openCreateComum}>
                  <Plus className="h-4 w-4" />
                  Nova rubrica comum
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bases usadas no rateio</CardTitle>
                  <CardDescription>
                    Ocupação = furos <code className="text-xs">plantado</code>. Colheita = registros nos últimos 30 / 90 dias.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variedade</TableHead>
                        <TableHead className="text-right">Plantado</TableHead>
                        <TableHead className="text-right">Kg 30d</TableHead>
                        <TableHead className="text-right">Plantas colhidas 30d</TableHead>
                        <TableHead className="text-right">Kg/pl colhida 30d</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(basesQuery.data?.variedades ?? []).map((v) => (
                        <TableRow key={v.variedadeId}>
                          <TableCell className="font-medium">{v.variedadeNome}</TableCell>
                          <TableCell className="text-right tabular-nums">{v.plantasOcupadas}</TableCell>
                          <TableCell className="text-right tabular-nums">{v.colheitaKg30d.toFixed(2)}</TableCell>
                          <TableCell className="text-right tabular-nums">{v.colheitaPlantas30d}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {v.kgPorPlantaColhida30d != null ? v.kgPorPlantaColhida30d.toFixed(4) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Rubrica</TableHead>
                      <TableHead>Rateio</TableHead>
                      <TableHead>Modo / critério</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(compartilhadosQuery.data ?? []).map((row) => {
                      const comRateio = row.modo === "rateio_projeto";
                      return (
                      <TableRow key={row.id} className={row.ativo ? undefined : "opacity-50"}>
                        <TableCell className="text-xs max-w-[140px]">
                          {LABEL_GRUPO_CUSTO_PRODUCAO[row.grupo as GrupoCustoProducao] ?? row.grupo}
                        </TableCell>
                        <TableCell className="font-medium">{row.rubrica}</TableCell>
                        <TableCell>
                          {comRateio ? (
                            <Badge variant="secondary" className="text-[10px]">Entre variedades</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Sem rateio</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px]">
                          {comRateio ? (
                            <>
                              {row.rateioMetodo
                                ? LABEL_RATEIO_METODO_CUSTOS[row.rateioMetodo as RateioMetodoCustos]
                                : "—"}
                              {row.rateioDiasColheita != null ? ` · ${row.rateioDiasColheita}d` : ""}
                            </>
                          ) : (
                            LABEL_MODO_CUSTO_PRODUCAO[row.modo as ModoCustoProducao]
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-sm">
                          {comRateio ? (
                            row.valorMensal != null ? (
                              <span title="Valor mensal total">{fmtMoney(Number(row.valorMensal))}/mês</span>
                            ) : (
                              "—"
                            )
                          ) : row.custoPorPlantaCalculado != null ? (
                            <span title="Referência por planta (não rateado)">
                              {fmtMoney(row.custoPorPlantaCalculado)}/pl
                            </span>
                          ) : (
                            <span className="text-xs text-amber-700 dark:text-amber-300">{row.calculoDetalhe}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEditCom(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Remover esta rubrica comum?")) deleteMut.mutate({ id: row.id });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="variedade" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
                  <div>
                    <CardTitle>Custos específicos + repartição recebida</CardTitle>
                    <CardDescription>
                      Rubricas próprias da variedade e parcelas dos custos comuns (rateio).
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1 min-w-[200px]">
                      <Label className="text-xs">Variedade</Label>
                      <Select
                        value={selectedVarId != null ? String(selectedVarId) : ""}
                        onValueChange={(v) => setSelectedVarId(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {(variedadesQuery.data ?? []).map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="sm" className="gap-1" onClick={openCreateVariedade} disabled={!selectedVarId}>
                      <Plus className="h-4 w-4" />
                      Nova rubrica
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedVarId && (
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        <strong>{detQuery.data?.variedade?.nome ?? "…"}</strong> — direto{" "}
                        <span className="font-mono">{fmtMoney(detTotalDireto)}</span>
                        {" · "}
                        rateio <span className="font-mono">{fmtMoney(detTotalRateio)}</span>
                        {" · "}
                        <span className="text-foreground font-semibold">
                          total {fmtMoney(detTotalDireto + detTotalRateio)}
                        </span>
                      </span>
                    </div>
                  )}

                  {parcelas.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Parcelas de custos comuns (rateio)</h3>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rubrica</TableHead>
                              <TableHead className="text-right">Parcela R$</TableHead>
                              <TableHead className="text-right">R$/planta</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parcelas.map((p) => (
                              <TableRow key={p.fonteItemId + p.rubrica}>
                                <TableCell>
                                  <div className="font-medium text-sm">{p.rubrica}</div>
                                  <div className="text-[10px] text-muted-foreground line-clamp-2">{p.detalhe}</div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm tabular-nums">
                                  {fmtMoney(p.parcelaReais)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm tabular-nums">
                                  {p.rPorPlanta != null ? fmtMoney(p.rPorPlanta) : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <h3 className="text-sm font-semibold">Rubricas diretas da variedade</h3>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Grupo</TableHead>
                          <TableHead>Rubrica</TableHead>
                          <TableHead>Modo</TableHead>
                          <TableHead className="text-right">R$/planta</TableHead>
                          <TableHead className="w-[100px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detQuery.isLoading && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-muted-foreground text-sm">
                              Carregando…
                            </TableCell>
                          </TableRow>
                        )}
                        {!detQuery.isLoading &&
                          detItens.map((row) => (
                            <TableRow key={row.id} className={row.ativo ? undefined : "opacity-50"}>
                              <TableCell className="text-xs max-w-[140px]">
                                {LABEL_GRUPO_CUSTO_PRODUCAO[row.grupo as GrupoCustoProducao] ?? row.grupo}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{row.rubrica}</div>
                                {row.descricao ? (
                                  <div className="text-[10px] text-muted-foreground line-clamp-2">{row.descricao}</div>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                                {LABEL_MODO_CUSTO_PRODUCAO[row.modo as ModoCustoProducao]}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.custoPorPlantaCalculado != null ? (
                                  <span className="font-mono font-medium tabular-nums">
                                    {fmtMoney(row.custoPorPlantaCalculado)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-700 dark:text-amber-300">{row.calculoDetalhe}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right space-x-1 whitespace-nowrap">
                                <Button type="button" variant="ghost" size="icon" onClick={() => openEditVar(row)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm("Remover esta rubrica?")) deleteMut.mutate({ id: row.id });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId != null
                    ? "Editar rubrica"
                    : formContext === "comum"
                      ? "Nova rubrica comum (projeto)"
                      : "Nova rubrica da variedade"}
                </DialogTitle>
                <DialogDescription>
                  {formContext === "comum" && form.ratearEntreVariedades
                    ? "Valor mensal total e critério de repartição entre variedades."
                    : formContext === "comum"
                      ? "Referência do projeto — não reparte automaticamente entre variedades."
                      : "Preencha os campos do modo escolhido."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>Grupo</Label>
                  <Select
                    value={form.grupo}
                    onValueChange={(v) => setForm((f) => ({ ...f, grupo: v as GrupoCustoProducao }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {GRUPOS_CUSTO_PRODUCAO.map((g) => (
                        <SelectItem key={g} value={g}>
                          {LABEL_GRUPO_CUSTO_PRODUCAO[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Rubrica</Label>
                  <Input
                    value={form.rubrica}
                    onChange={(e) => setForm((f) => ({ ...f, rubrica: e.target.value }))}
                    placeholder="Ex.: Luz + climatização; Nutriente master; Aluguer…"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    rows={2}
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Fornecedor, contrato, notas…"
                  />
                </div>

                {formContext === "comum" && (
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="ratear-entre-variedades" className="cursor-pointer">
                        Ratear entre variedades
                      </Label>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Ligado: o valor mensal entra no R$/planta de cada cultura. Desligado: só referência global.
                      </p>
                    </div>
                    <Switch
                      id="ratear-entre-variedades"
                      checked={form.ratearEntreVariedades}
                      onCheckedChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          ratearEntreVariedades: v,
                          modo: v ? "rateio_projeto" : f.modo === "rateio_projeto" ? "por_planta" : f.modo,
                        }))
                      }
                    />
                  </div>
                )}

                {(formContext === "variedade" || (formContext === "comum" && !form.ratearEntreVariedades)) && (
                  <div className="grid gap-2">
                    <Label>Modo de cálculo</Label>
                    <Select
                      value={form.modo === "rateio_projeto" ? "por_planta" : form.modo}
                      onValueChange={(v) => setForm((f) => ({ ...f, modo: v as ModoCustoProducao }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODOS_CUSTO_PRODUCAO.filter((m) => m !== "rateio_projeto").map((m) => (
                          <SelectItem key={m} value={m}>
                            {LABEL_MODO_CUSTO_PRODUCAO[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formContext === "comum" && form.ratearEntreVariedades && (
                  <>
                    <div className="grid gap-2">
                      <Label>Valor mensal total (R$)</Label>
                      <Input
                        inputMode="decimal"
                        value={form.valorMensal}
                        onChange={(e) => setForm((f) => ({ ...f, valorMensal: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Como repartir entre variedades</Label>
                      <Select
                        value={form.rateioMetodo}
                        onValueChange={(v) => setForm((f) => ({ ...f, rateioMetodo: v as RateioMetodoCustos }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RATEIO_METODOS_CUSTOS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {LABEL_RATEIO_METODO_CUSTOS[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Janela (dias) para colheita</Label>
                      <Input
                        inputMode="numeric"
                        value={form.rateioDiasColheita}
                        onChange={(e) => setForm((f) => ({ ...f, rateioDiasColheita: e.target.value }))}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Usado quando o método envolve dados de colheita; ignorado em «igual» ou «capacidade».
                      </p>
                    </div>
                  </>
                )}

                {form.modo === "calculado" && (
                  <>
                    <div className="grid gap-2">
                      <Label>Preço unitário de compra (R$)</Label>
                      <Input
                        inputMode="decimal"
                        value={form.precoReferencia}
                        onChange={(e) => setForm((f) => ({ ...f, precoReferencia: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Unidade de compra</Label>
                      <Input
                        value={form.unidadeCompra}
                        onChange={(e) => setForm((f) => ({ ...f, unidadeCompra: e.target.value }))}
                        placeholder="kg, L, un, g…"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Quantidade por planta</Label>
                      <Input
                        inputMode="decimal"
                        value={form.quantidadePorPlanta}
                        onChange={(e) => setForm((f) => ({ ...f, quantidadePorPlanta: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {form.modo === "por_planta" && (
                  <div className="grid gap-2">
                    <Label>Valor por planta (R$)</Label>
                    <Input
                      inputMode="decimal"
                      value={form.valorPorPlanta}
                      onChange={(e) => setForm((f) => ({ ...f, valorPorPlanta: e.target.value }))}
                    />
                  </div>
                )}

                {form.modo === "por_ciclo" && (
                  <>
                    <div className="grid gap-2">
                      <Label>Custo total do ciclo / lote (R$)</Label>
                      <Input
                        inputMode="decimal"
                        value={form.valorPorCiclo}
                        onChange={(e) => setForm((f) => ({ ...f, valorPorCiclo: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Plantas no ciclo</Label>
                      <Input
                        inputMode="numeric"
                        value={form.plantasPorCicloEstimado}
                        onChange={(e) => setForm((f) => ({ ...f, plantasPorCicloEstimado: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {form.modo === "mensal_rateio" && (
                  <>
                    <div className="grid gap-2">
                      <Label>Valor mensal (R$)</Label>
                      <Input
                        inputMode="decimal"
                        value={form.valorMensal}
                        onChange={(e) => setForm((f) => ({ ...f, valorMensal: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Plantas estimadas no mês</Label>
                      <Input
                        inputMode="numeric"
                        value={form.plantasMesEstimativa}
                        onChange={(e) => setForm((f) => ({ ...f, plantasMesEstimativa: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label>Ordem</Label>
                    <Input
                      inputMode="numeric"
                      value={form.ordem}
                      onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
                    <Label className="cursor-pointer">Ativa</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={submitForm} disabled={createMut.isPending || updateMut.isPending}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </main>
    </div>
  );
}
