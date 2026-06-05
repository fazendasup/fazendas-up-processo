import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Link2,
  Percent,
  Plus,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { PeriodoFiltro } from "@/components/comercial/ui/PeriodoFiltro";
import {
  hojeIsoLocal,
  intervaloDoPreset,
  type PeriodoPreset,
} from "@/lib/comercial/periodo";

const TODAS_UNIDADES = "__todas__";

function fmtQtd(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function fmtMoney(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(value: unknown) {
  if (!value) return "—";
  return new Date(value as string | Date).toLocaleDateString("pt-BR");
}

function fmtPct(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function taxaCor(taxa: number | null | undefined) {
  if (taxa == null) return "text-muted-foreground";
  if (taxa >= 7) return "text-red-600 dark:text-red-400";
  if (taxa >= 3) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AcompanhamentoAvarias() {
  const utils = trpc.useUtils();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, { staleTime: 60_000 });
  const canEditarComercial =
    me.data?.perfil === "ADMIN" ||
    me.data?.perfil === "GERENTE_COMERCIAL" ||
    me.data?.perfil === "COMERCIAL" ||
    me.data?.perfil === "OPERACOES";

  const [grupoId, setGrupoId] = useState("");
  const [unidadeId, setUnidadeId] = useState(TODAS_UNIDADES);
  const [preset, setPreset] = useState<PeriodoPreset>("mes_atual");
  const [customInicio, setCustomInicio] = useState(hojeIsoLocal());
  const [customFim, setCustomFim] = useState(hojeIsoLocal());
  const [gerenciar, setGerenciar] = useState(false);
  const [novaRede, setNovaRede] = useState("");
  const [unidadeParaVincular, setUnidadeParaVincular] = useState("");
  const [avariaUnidadeId, setAvariaUnidadeId] = useState("");
  const [avariaData, setAvariaData] = useState(hojeIsoLocal());
  const [avariaProdutoId, setAvariaProdutoId] = useState("");
  const [avariaQuantidade, setAvariaQuantidade] = useState("1");
  const [avariaObservacoes, setAvariaObservacoes] = useState("");
  const [avariaPedidoOperacionalId, setAvariaPedidoOperacionalId] = useState("");

  const intervalo = useMemo(
    () => intervaloDoPreset(preset, { inicio: customInicio, fim: customFim }),
    [preset, customInicio, customFim],
  );

  const redes = trpc.comercial.varejo.listarRedes.useQuery(undefined);
  const clientesSuper = trpc.comercial.varejo.clientesSupermercado.useQuery();
  const produtos = trpc.comercial.pedidos.produtos.useQuery({ incluirInativos: false });

  const redeSelecionada = redes.data?.find((r) => r.id === grupoId);
  const unidadesDaRede = redeSelecionada?.unidades ?? [];

  useEffect(() => {
    if (!grupoId) {
      setAvariaUnidadeId("");
      return;
    }
    if (unidadeId !== TODAS_UNIDADES) {
      setAvariaUnidadeId(unidadeId);
      return;
    }
    setAvariaUnidadeId((atual) =>
      unidadesDaRede.some((u) => u.id === atual) ? atual : "",
    );
  }, [grupoId, unidadeId, redeSelecionada?.id, unidadesDaRede]);

  const referenciasAvaria = trpc.comercial.pedidos.conciliacaoReferenciasAvaria.useQuery(
    {
      clienteId: avariaUnidadeId,
      dataEntrega: new Date(`${avariaData}T12:00:00`),
    },
    { enabled: Boolean(avariaUnidadeId && avariaData) },
  );

  useEffect(() => {
    setAvariaPedidoOperacionalId("");
  }, [avariaUnidadeId, avariaData]);

  const relatorio = trpc.comercial.varejo.relatorio.useQuery(
    {
      grupoId: grupoId || undefined,
      unidadeClienteId: unidadeId !== TODAS_UNIDADES ? unidadeId : undefined,
      inicio: intervalo.inicio,
      fim: intervalo.fim,
    },
    { enabled: Boolean(grupoId) },
  );

  const salvarRede = trpc.comercial.varejo.salvarRede.useMutation({
    onSuccess: () => {
      toast.success("Rede salva.");
      setNovaRede("");
      void utils.comercial.varejo.listarRedes.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const vincularUnidades = trpc.comercial.varejo.vincularUnidades.useMutation({
    onSuccess: () => {
      toast.success("Unidade vinculada à rede.");
      setUnidadeParaVincular("");
      void utils.comercial.varejo.listarRedes.invalidate();
      void utils.comercial.varejo.clientesSupermercado.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const desvincularUnidade = trpc.comercial.varejo.desvincularUnidade.useMutation({
    onSuccess: () => {
      toast.success("Unidade desvinculada.");
      void utils.comercial.varejo.listarRedes.invalidate();
      void utils.comercial.varejo.clientesSupermercado.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const registrarAvariaCampo = trpc.comercial.varejo.registrarAvariaCampo.useMutation({
    onSuccess: async (result) => {
      toast.success("Avaria registrada.", {
        description: result.pedidoCriado
          ? "Foi criado um registro em Pedidos para essa unidade/data."
          : "A avaria foi vinculada ao pedido existente da unidade/data.",
      });
      setAvariaProdutoId("");
      setAvariaQuantidade("1");
      setAvariaObservacoes("");
      await Promise.all([
        utils.comercial.varejo.relatorio.invalidate(),
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.dashboard.invalidate(),
        utils.comercial.pedidos.relatorioHistorico.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message),
  });

  const dados = relatorio.data;

  function registrarAvaria() {
    const quantidade = Number(avariaQuantidade.replace(",", "."));
    if (!avariaUnidadeId) return toast.error("Selecione a unidade conferida.");
    if (!avariaData) return toast.error("Informe a data em que a avaria deve aparecer em Pedidos.");
    if (!avariaProdutoId) return toast.error("Selecione a variedade/produto.");
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return toast.error("Informe uma quantidade maior que zero.");
    }
    registrarAvariaCampo.mutate({
      clienteId: avariaUnidadeId,
      dataEntrega: new Date(`${avariaData}T12:00:00`),
      pedidoOperacionalId: avariaPedidoOperacionalId || undefined,
      produtoId: avariaProdutoId,
      quantidade,
      observacoes: avariaObservacoes,
    });
  }

  function exportarCsv() {
    if (!dados) return;
    const linhas = [
      ["Indicador", "Valor"],
      ["Volume entregue", String(dados.kpis.volumeEntregue)],
      ["Quantidade avariada", String(dados.kpis.avariaQtdTotal)],
      ["Valor perdido", String(dados.kpis.valorPerdidoTotal)],
      ["Taxa de avaria (%)", String(dados.kpis.taxaAvaria.toFixed(2))],
      ["Pontualidade (%)", String(dados.kpis.pontualidade.toFixed(2))],
      ["Pedidos avaliados", String(dados.kpis.pedidosTotais)],
      ["Entregas validadas", String(dados.kpis.pedidosEntregues)],
      [],
      ["Produto", "Categoria", "Entregue", "Avaria", "Taxa avaria %", "Valor perdido"],
      ...dados.topProdutosAvaria.map((p) => [
        p.nome,
        p.categoria ?? "",
        String(p.entregueQtd),
        String(p.quantidade),
        p.taxaAvaria != null ? p.taxaAvaria.toFixed(2) : "",
        String(p.valorPerdido),
      ]),
      [],
      ["Unidade", "Produto", "Qtd sugerida", "Media entregue", "Media avaria", "Taxa avaria %", "Acao"],
      ...dados.sugestoesPedido.map((s: any) => [
        s.unidade,
        s.produtoNome,
        String(s.quantidadeSugerida),
        String(s.mediaEntregue.toFixed(1)),
        String(s.mediaAvaria.toFixed(1)),
        String(s.taxaAvaria.toFixed(1)),
        s.acao,
      ]),
    ];
    const csv = linhas
      .map((cols) => cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acompanhamento_avarias_${redeSelecionada?.nome ?? "rede"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxAvariaCategoria = Math.max(1, ...(dados?.avariaCategorias.map((c) => c.quantidade) ?? [0]));
  const maxAvariaDia = Math.max(1, ...(dados?.avariaDias.map((d) => d.quantidade) ?? [0]));
  const maxSerie = Math.max(
    1,
    ...(dados?.serieSemanal.flatMap((s) => [s.entregue, s.avaria]) ?? [0]),
  );
  const lancamentoAvariaCard = (
    <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lançar avaria em campo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Uso do promoter no varejo: selecione a unidade, a data em que isso deve aparecer em Pedidos
          (normalmente a próxima entrega), a variedade e a quantidade conferida.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(160px,0.8fr)_minmax(220px,1.2fr)_8rem]">
        <div>
          <Label className="text-xs">Unidade conferida *</Label>
          <Select
            value={avariaUnidadeId}
            onValueChange={setAvariaUnidadeId}
            disabled={!grupoId || unidadesDaRede.length === 0}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder={grupoId ? "Selecione a unidade..." : "Selecione a rede acima"} />
            </SelectTrigger>
            <SelectContent>
              {unidadesDaRede.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data em Pedidos *</Label>
          <Input
            type="date"
            className="h-10 bg-background"
            value={avariaData}
            onChange={(e) => setAvariaData(e.target.value)}
          />
        </div>
        <div className="lg:col-span-4">
          <Label className="text-xs">Pedido / venda de referência</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            value={avariaPedidoOperacionalId}
            onChange={(e) => setAvariaPedidoOperacionalId(e.target.value)}
            disabled={!avariaUnidadeId || referenciasAvaria.isLoading}
          >
            <option value="">
              {referenciasAvaria.isLoading
                ? "Carregando pedidos..."
                : (referenciasAvaria.data?.operacionais?.length ?? 0) > 0
                  ? "Selecione o pedido operacional (recomendado)"
                  : "Nenhum pedido no dia — será criado automaticamente"}
            </option>
            {(referenciasAvaria.data?.operacionais ?? []).map((op: any) => (
              <option key={op.id} value={op.id}>
                Pedido {op.status.toLowerCase()}
                {op.numeroVenda ? ` · venda nº ${op.numeroVenda}` : ""}
                {" · "}
                {(op.itens ?? []).map((i: any) => `${i.produtoNome} (${Number(i.quantidade)})`).join(", ").slice(0, 80)}
              </option>
            ))}
          </select>
          {(referenciasAvaria.data?.vendas ?? []).length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Vendas Conta Azul no dia:{" "}
              {referenciasAvaria.data!.vendas
                .map((v: any) => (v.numeroVenda ? `nº ${v.numeroVenda}` : v.externalId?.slice(0, 8)))
                .join(", ")}
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs">Variedade/produto *</Label>
          <Select value={avariaProdutoId} onValueChange={setAvariaProdutoId}>
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder="Selecione a variedade..." />
            </SelectTrigger>
            <SelectContent>
              {(produtos.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                  {p.categoria ? ` · ${p.categoria}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Qtd. *</Label>
          <Input
            inputMode="decimal"
            className="h-10 bg-background"
            value={avariaQuantidade}
            onChange={(e) => setAvariaQuantidade(e.target.value)}
            placeholder="Ex.: 3"
          />
        </div>
        <div className="lg:col-span-3">
          <Label className="text-xs">Observação de campo</Label>
          <Input
            className="h-10 bg-background"
            value={avariaObservacoes}
            onChange={(e) => setAvariaObservacoes(e.target.value)}
            placeholder="Ex.: produto murcho na gôndola, validade curta, manuseio, quebra..."
          />
        </div>
        <div className="flex items-end">
          <Button
            className="h-10 w-full"
            disabled={registrarAvariaCampo.isPending}
            onClick={registrarAvaria}
          >
            {registrarAvariaCampo.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </div>
        <p className="lg:col-span-4 text-xs text-muted-foreground">
          Ao salvar, o sistema vincula a avaria ao pedido existente da unidade/data. Se não houver pedido,
          cria um registro operacional só de avaria, mantendo rastreabilidade por pedido, data, variedade e usuário.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Comercial · Cliente"
        title="Acompanhamento avarias"
        subtitle="Relatório por rede e unidade de supermercado, usando os pedidos validados. Mostra apenas indicadores compartilháveis com o cliente."
        actions={
          <>
            {canEditarComercial && (
              <Button variant="outline" onClick={() => setGerenciar((v) => !v)}>
                <Store className="mr-1.5 h-4 w-4" />
                {gerenciar ? "Fechar gestão de redes" : "Gerenciar redes"}
              </Button>
            )}
            <Button variant="outline" disabled={!dados} onClick={exportarCsv}>
              <Download className="mr-1.5 h-4 w-4" />
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* Gestão de redes (comercial completo) */}
      {canEditarComercial && gerenciar && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Configuração interna: redes e unidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Área interna de gestão comercial. O cliente vê apenas filtros, KPIs e gráficos do acompanhamento.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grow">
                <Label className="text-xs">Nova rede (supermercado)</Label>
                <Input
                  value={novaRede}
                  onChange={(e) => setNovaRede(e.target.value)}
                  placeholder="Ex.: Rede Supermercados ABC"
                  className="h-9"
                />
              </div>
              <Button
                disabled={!novaRede.trim() || salvarRede.isPending}
                onClick={() => salvarRede.mutate({ nome: novaRede, tipo: "SUPERMERCADO" })}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Criar rede
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-2 border-t pt-3">
              <div className="min-w-[220px] grow">
                <Label className="text-xs">Vincular unidade (cliente supermercado)</Label>
                <Select value={unidadeParaVincular} onValueChange={setUnidadeParaVincular}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(clientesSuper.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                        {c.grupoId ? " (já vinculado)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={!unidadeParaVincular || !grupoId || vincularUnidades.isPending}
                onClick={() =>
                  vincularUnidades.mutate({ grupoId, clienteIds: [unidadeParaVincular] })
                }
              >
                <Link2 className="mr-1.5 h-4 w-4" />
                Vincular à rede selecionada
              </Button>
              {!grupoId && (
                <p className="text-xs text-muted-foreground">Selecione uma rede abaixo para vincular unidades.</p>
              )}
            </div>

            {redeSelecionada && (
              <div className="space-y-1 border-t pt-3">
                <p className="text-sm font-semibold">Unidades de {redeSelecionada.nome}</p>
                {unidadesDaRede.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma unidade vinculada ainda.</p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {unidadesDaRede.map((u) => (
                      <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>{u.nome}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => desvincularUnidade.mutate({ clienteId: u.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div className="min-w-[220px]">
            <Label className="text-xs">Rede de supermercado</Label>
            <Select
              value={grupoId}
              onValueChange={(v) => {
                setGrupoId(v);
                setUnidadeId(TODAS_UNIDADES);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione uma rede..." />
              </SelectTrigger>
              <SelectContent>
                {(redes.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome} ({r.totalUnidades})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <Label className="text-xs">Unidade</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId} disabled={!grupoId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas as unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_UNIDADES}>Todas as unidades</SelectItem>
                {unidadesDaRede.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PeriodoFiltro
            preset={preset}
            onPresetChange={setPreset}
            customInicio={customInicio}
            customFim={customFim}
            onCustomInicio={setCustomInicio}
            onCustomFim={setCustomFim}
          />
        </CardContent>
      </Card>

      {!grupoId ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Selecione uma rede de supermercado para ver o acompanhamento de avarias.
        </div>
      ) : relatorio.isLoading ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Carregando relatório...
        </div>
      ) : relatorio.isError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {relatorio.error?.message ?? "Não foi possível carregar o relatório."}
        </div>
      ) : dados ? (
        <>
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<Truck className="h-4 w-4" />}
              label="Volume entregue"
              valor={`${fmtQtd(dados.kpis.volumeEntregue)} un`}
              sub={`${dados.kpis.pedidosEntregues} pedido(s) entregue(s)`}
            />
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Entregas validadas"
              valor={`${dados.kpis.pedidosEntregues}`}
              sub={`${dados.kpis.pedidosTotais} pedido(s) avaliados no período`}
            />
            <KpiCard
              icon={<Percent className="h-4 w-4" />}
              label="Taxa de avaria"
              valor={fmtPct(dados.kpis.taxaAvaria)}
              valorClass={taxaCor(dados.kpis.taxaAvaria)}
              sub={`${fmtQtd(dados.kpis.avariaQtdTotal)} un avariadas`}
            />
            <KpiCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Valor perdido em avaria"
              valor={fmtMoney(dados.kpis.valorPerdidoTotal)}
              valorClass="text-red-600 dark:text-red-400"
              sub={`Pontualidade ${fmtPct(dados.kpis.pontualidade)}`}
            />
          </div>

          {/* Insights */}
          {dados.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Insights para o cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dados.insights.map((ins, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
                      ins.tipo === "alerta"
                        ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                        : ins.tipo === "atencao"
                          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                    }`}
                  >
                    {ins.tipo === "ok" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{ins.texto}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {dados.sugestoesPedido.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sugestão de pedido para próxima entrega</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Baseada na média entregue e na taxa de avaria do histórico filtrado. Use como ponto de partida antes de confirmar o próximo pedido.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 lg:grid-cols-2">
                  {dados.sugestoesPedido.map((s: any) => (
                    <div key={`${s.contaAzulCustomerId}:${s.produtoId}`} className="rounded-lg border bg-background p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {s.produtoNome}
                            {s.categoria ? <span className="text-muted-foreground"> · {s.categoria}</span> : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{s.unidade}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            s.acao === "reduzir"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                              : s.acao === "ajustar"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {s.acao === "reduzir" ? "Reduzir" : s.acao === "ajustar" ? "Ajustar" : "Manter"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Sugerido</p>
                          <p className="text-lg font-bold">{fmtQtd(s.quantidadeSugerida)}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Média entregue</p>
                          <p className="font-semibold">{fmtQtd(s.mediaEntregue)}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <p className="text-muted-foreground">Avaria</p>
                          <p className={`font-semibold ${taxaCor(s.taxaAvaria)}`}>{fmtPct(s.taxaAvaria)}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {s.motivo} Confiança {s.confianca === "alta" ? "alta" : s.confianca === "media" ? "média" : "baixa"} ({s.entregasConsideradas} entrega(s)).
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {dados.lancamentosRecentes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Últimos lançamentos de campo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dados.lancamentosRecentes.map((l: any) => (
                  <div key={l.id} className="rounded-lg border bg-background p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {fmtQtd(l.quantidade)} × {l.produtoNome}
                          {l.categoria ? <span className="text-muted-foreground"> · {l.categoria}</span> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.unidade} · aparece em Pedidos em {fmtDate(l.dataEntrega)} · pedido {l.pedidoId}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {l.statusPedido?.toLowerCase?.() ?? l.statusPedido}
                      </span>
                    </div>
                    {l.observacoes ? <p className="mt-2 text-xs text-muted-foreground">{l.observacoes}</p> : null}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Lançado por {l.criadoPorNome ?? "n/d"} em {fmtDate(l.criadoEm)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Top produtos por taxa de avaria */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Produtos com maior avaria</CardTitle>
              </CardHeader>
              <CardContent>
                {dados.topProdutosAvaria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem avarias no período.</p>
                ) : (
                  <div className="space-y-2">
                    {dados.topProdutosAvaria.map((p) => (
                      <div key={p.produtoId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate">{p.nome}</span>
                          <span className={`font-semibold ${taxaCor(p.taxaAvaria)}`}>{fmtPct(p.taxaAvaria)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {fmtQtd(p.quantidade)} de {fmtQtd(p.entregueQtd)} un
                          </span>
                          <span>{fmtMoney(p.valorPerdido)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avaria por categoria + por dia */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Onde concentra a perda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por categoria</p>
                  {dados.avariaCategorias.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dados.avariaCategorias.map((c) => (
                        <div key={c.categoria} className="space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span>{c.categoria}</span>
                            <span className="text-muted-foreground">{fmtQtd(c.quantidade)} un</span>
                          </div>
                          <Barra valor={c.quantidade} max={maxAvariaCategoria} cor="bg-red-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por dia da semana</p>
                  <div className="space-y-1.5">
                    {dados.avariaDias.map((d) => (
                      <div key={d.dia} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-xs text-muted-foreground">{d.dia}</span>
                        <Barra valor={d.quantidade} max={maxAvariaDia} cor="bg-amber-400" />
                        <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                          {fmtQtd(d.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Série semanal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução semanal: entregas x avarias</CardTitle>
            </CardHeader>
            <CardContent>
              {dados.serieSemanal.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              ) : (
                <div className="space-y-2">
                  {dados.serieSemanal.map((s, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{s.rotulo}</span>
                        <span>
                          {fmtQtd(s.entregue)} entregue · {fmtQtd(s.avaria)} avaria · {fmtMoney(s.valorPerdido)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Barra valor={s.entregue} max={maxSerie} cor="bg-emerald-400" />
                        <Barra valor={s.avaria} max={maxSerie} cor="bg-red-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdown por unidade */}
          {unidadeId === TODAS_UNIDADES && dados.breakdownUnidades.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Comparativo por unidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2">Unidade</th>
                        <th className="py-2 text-right">Entregue</th>
                        <th className="py-2 text-right">Avaria</th>
                        <th className="py-2 text-right">Taxa</th>
                        <th className="py-2 text-right">Valor perdido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.breakdownUnidades.map((u) => (
                        <tr key={u.contaAzulCustomerId} className="border-b last:border-0">
                          <td className="py-2">{u.nome}</td>
                          <td className="py-2 text-right">{fmtQtd(u.entregueQtd)}</td>
                          <td className="py-2 text-right">{fmtQtd(u.avariaQtd)}</td>
                          <td className={`py-2 text-right font-semibold ${taxaCor(u.taxaAvaria)}`}>
                            {fmtPct(u.taxaAvaria)}
                          </td>
                          <td className="py-2 text-right">{fmtMoney(u.valorPerdido)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Visão preparada para cliente: não expõe custos, margem, estoque, fornecedores, produção ou dados operacionais
            internos. O valor perdido usa as regras comerciais aplicáveis ao cliente.
          </p>
        </>
      ) : null}

      {lancamentoAvariaCard}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  valor,
  valorClass,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  valorClass?: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className={`mt-1 text-2xl font-bold ${valorClass ?? ""}`}>{valor}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
