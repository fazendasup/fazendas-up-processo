import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, BarChart3, CalendarDays, Download, PackageCheck, Search, ShoppingBasket, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ocultarValoresComerciais } from "@/lib/accessPolicy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS = ["PENDENTE", "PRONTO", "ENTREGUE", "CANCELADO"] as const;

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function inicioMesIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function labelStatus(status: string) {
  return status.toLowerCase();
}

function fmtQtd(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function fmtMoney(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    PENDENTE: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
    PRONTO: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
    ENTREGUE: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
    CANCELADO: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
  };
  return map[status] ?? "border-border bg-muted";
}

function statusBarClass(status: string) {
  const map: Record<string, string> = {
    PENDENTE: "bg-amber-500",
    PRONTO: "bg-blue-500",
    ENTREGUE: "bg-emerald-500",
    CANCELADO: "bg-rose-500",
  };
  return map[status] ?? "bg-primary";
}

function exportCsv(rows: any[], filename: string) {
  const header = [
    "data_entrega",
    "cliente",
    "status",
    "tipo_venda",
    "produto",
    "categoria",
    "quantidade",
    "preco_unit",
    "numero_venda_conta_azul",
    "observacoes",
    "criado_por",
    "editado_por",
  ];
  const body = rows.flatMap((pedido) =>
    (pedido.itens ?? []).map((item: any) =>
      [
        new Date(pedido.dataEntrega).toISOString().slice(0, 10),
        pedido.cliente?.nome ?? pedido.contaAzulCustomerId,
        pedido.status,
        pedido.tipoVenda,
        item.produtoNome,
        item.categoria ?? "",
        String(item.quantidade ?? ""),
        String(item.precoUnit ?? ""),
        pedido.pedidoContaAzul?.numeroVenda ?? "",
        pedido.observacoes ?? "",
        pedido.criadoPor?.nome ?? "",
        pedido.editadoPor?.nome ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAvariasCsv(rows: any[], filename: string) {
  const header = ["data_entrega", "cliente", "produto", "categoria", "quantidade", "observacoes", "pedido_id", "criado_por"];
  const body = rows.map((avaria) =>
    [
      new Date(avaria.dataEntrega).toISOString().slice(0, 10),
      avaria.cliente?.nome ?? avaria.contaAzulCustomerId,
      avaria.produtoNome,
      avaria.categoria ?? "",
      String(avaria.quantidade ?? ""),
      avaria.observacoes ?? "",
      avaria.pedidoId ?? "",
      avaria.criadoPor?.nome ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PedidosHistorico() {
  const [inicio, setInicio] = useState(inicioMesIso());
  const [fim, setFim] = useState(hojeIso());
  const [clienteBusca, setClienteBusca] = useState("");
  const [contaAzulCustomerId, setContaAzulCustomerId] = useState("");
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");

  const me = trpc.comercial.pedidos.me.useQuery();
  const podeVerValores = !ocultarValoresComerciais(me.data?.perfil);
  const clientes = trpc.comercial.pedidos.clientes.useQuery({ busca: clienteBusca || undefined, limite: 100 });
  const relatorio = trpc.comercial.pedidos.relatorioHistorico.useQuery({
    inicio: new Date(`${inicio}T12:00:00`),
    fim: new Date(`${fim}T12:00:00`),
    contaAzulCustomerId: contaAzulCustomerId || undefined,
    status: (status || undefined) as any,
    busca: busca || undefined,
  });
  const relatorioAvarias = trpc.comercial.pedidos.relatorioAvarias.useQuery({
    inicio: new Date(`${inicio}T12:00:00`),
    fim: new Date(`${fim}T12:00:00`),
    contaAzulCustomerId: contaAzulCustomerId || undefined,
    busca: busca || undefined,
  });

  const rows = relatorio.data?.pedidos ?? [];
  const avariasRows = relatorioAvarias.data?.avarias ?? [];
  const resumo = relatorio.data?.resumo;
  const resumoAvarias = relatorioAvarias.data?.resumo;
  const statusTotal = useMemo(
    () => Math.max(1, Object.values(resumo?.status ?? {}).reduce((s: number, n: any) => s + Number(n ?? 0), 0)),
    [resumo?.status],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pedidos</p>
          <h1 className="text-2xl font-bold">Histórico e relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Consulte períodos, clientes, produtos e rastreabilidade dos pedidos operacionais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/comercial/pedidos">Voltar ao dashboard</Link>
          </Button>
          <Button
            variant="outline"
            disabled={!rows.length}
            onClick={() => exportCsv(rows, `pedidos_historico_${inicio}_${fim}.csv`)}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            disabled={!avariasRows.length}
            onClick={() => exportAvariasCsv(avariasRows, `avarias_${inicio}_${fim}.csv`)}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar avarias
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div className="xl:col-span-2">
            <Label className="text-xs">Cliente</Label>
            <Input placeholder="Buscar cliente..." value={clienteBusca} onChange={(e) => setClienteBusca(e.target.value)} />
            <select
              className="mt-2 h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={contaAzulCustomerId}
              onChange={(e) => setContaAzulCustomerId(e.target.value)}
            >
              <option value="">Todos os clientes</option>
              {(clientes.data ?? []).map((c: any) => (
                <option key={c.externalId} value={c.externalId}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Busca</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Produto, obs..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <HistoricoKpi icon={<CalendarDays className="h-4 w-4 text-cyan-700" />} label="Pedidos" value={resumo?.pedidos ?? 0} />
        <HistoricoKpi icon={<PackageCheck className="h-4 w-4 text-emerald-700" />} label="Unidades" value={fmtQtd(resumo?.unidades ?? 0)} />
        <HistoricoKpi icon={<Users className="h-4 w-4 text-blue-700" />} label="Clientes" value={resumo?.clientes ?? 0} />
        <HistoricoKpi icon={<ShoppingBasket className="h-4 w-4 text-lime-700" />} label="Produtos" value={resumo?.produtos ?? 0} />
        {podeVerValores ? (
          <HistoricoKpi icon={<BarChart3 className="h-4 w-4 text-violet-700" />} label="Valor estimado" value={fmtMoney(resumo?.valorEstimado ?? 0)} />
        ) : null}
      </section>

      <Card className="border-amber-200/70 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-700" /> Relatório de avarias
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Avarias lançadas na agenda por cliente, data e variedade. Estes volumes não entram nas unidades normais dos pedidos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HistoricoKpi icon={<AlertTriangle className="h-4 w-4 text-amber-700" />} label="Registros" value={resumoAvarias?.registros ?? 0} />
            <HistoricoKpi icon={<PackageCheck className="h-4 w-4 text-amber-700" />} label="Qtd. avariada" value={fmtQtd(resumoAvarias?.quantidade ?? 0)} />
            <HistoricoKpi icon={<Users className="h-4 w-4 text-amber-700" />} label="Clientes" value={resumoAvarias?.clientes ?? 0} />
            <HistoricoKpi icon={<ShoppingBasket className="h-4 w-4 text-amber-700" />} label="Variedades" value={resumoAvarias?.produtos ?? 0} />
          </div>

          <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Variedades com mais avaria</p>
              <div className="space-y-2">
                {(relatorioAvarias.data?.produtos ?? []).slice(0, 8).map((p: any) => (
                  <div key={p.nome} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1.5 text-sm">
                    <span className="truncate font-medium">{p.nome}</span>
                    <span className="font-bold">{fmtQtd(p.quantidade)}</span>
                  </div>
                ))}
                {!relatorioAvarias.data?.produtos?.length ? <p className="text-sm text-muted-foreground">Sem avarias no filtro.</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              {relatorioAvarias.isLoading ? <p className="text-sm text-muted-foreground">Carregando avarias...</p> : null}
              {avariasRows.slice(0, 12).map((avaria: any) => (
                <div key={avaria.id} className="rounded-xl border bg-background/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{avaria.cliente?.nome ?? avaria.contaAzulCustomerId}</p>
                      <p className="text-xs text-muted-foreground">{new Date(avaria.dataEntrega).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {fmtQtd(avaria.quantidade)} un.
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    <strong>{avaria.produtoNome}</strong>
                    {avaria.categoria ? <span className="ml-1 text-xs text-muted-foreground">({avaria.categoria})</span> : null}
                  </p>
                  {avaria.observacoes ? <p className="mt-1 text-xs text-muted-foreground">Obs.: {avaria.observacoes}</p> : null}
                </div>
              ))}
              {!relatorioAvarias.isLoading && avariasRows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma avaria encontrada.</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {podeVerValores ? (
      <Card className="border-cyan-200/70 bg-cyan-50/40 dark:border-cyan-900/60 dark:bg-cyan-950/10">
        <CardHeader>
          <CardTitle className="text-base">Conciliação com Conta Azul</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compara os pedidos operacionais desta tela com as vendas reais sincronizadas do Conta Azul no mesmo período.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <HistoricoKpi icon={<CalendarDays className="h-4 w-4 text-cyan-700" />} label="Vendas Conta Azul" value={resumo?.contaAzulPedidos ?? 0} />
            <HistoricoKpi icon={<PackageCheck className="h-4 w-4 text-emerald-700" />} label="Unid. Conta Azul" value={fmtQtd(resumo?.contaAzulUnidades ?? 0)} />
            <HistoricoKpi icon={<BarChart3 className="h-4 w-4 text-violet-700" />} label="Valor Conta Azul" value={fmtMoney(resumo?.contaAzulValor ?? 0)} />
            <HistoricoKpi icon={<BarChart3 className="h-4 w-4 text-amber-700" />} label="Diferença valor" value={fmtMoney(resumo?.diferencaValorContaAzul ?? 0)} />
            <HistoricoKpi icon={<Users className="h-4 w-4 text-rose-700" />} label="Divergências reais" value={resumo?.clientesDivergentesContaAzul ?? 0} />
            <HistoricoKpi icon={<Users className="h-4 w-4 text-sky-700" />} label="Aguardando venda" value={resumo?.clientesAguardandoVendaContaAzul ?? 0} />
          </div>

          <div className="grid gap-2 xl:grid-cols-2">
            {(relatorio.data?.contaAzul?.conciliacao ?? []).slice(0, 12).map((row: any) => (
              <div
                key={row.contaAzulCustomerId}
                className={`rounded-xl border p-3 ${
                  row.status === "divergente" || row.divergente
                    ? "border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
                    : row.status === "aguardando_venda"
                      ? "border-sky-300 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20"
                      : row.status === "venda_sem_pedido"
                        ? "border-violet-300 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20"
                        : "bg-background/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.clienteNome}</p>
                    <p className="text-xs text-muted-foreground">Operacional × Conta Azul</p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                      row.status === "divergente" || row.divergente
                        ? "border-amber-300 text-amber-800 dark:text-amber-200"
                        : row.status === "aguardando_venda"
                          ? "border-sky-300 text-sky-800 dark:text-sky-200"
                          : row.status === "venda_sem_pedido"
                            ? "border-violet-300 text-violet-800 dark:text-violet-200"
                            : "border-emerald-300 text-emerald-700 dark:text-emerald-200"
                    }`}
                  >
                    {row.status === "aguardando_venda"
                      ? "aguardando venda"
                      : row.status === "venda_sem_pedido"
                        ? "venda sem pedido"
                        : row.status === "divergente" || row.divergente
                          ? "divergente"
                          : "ok"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <CompareMetric label="Pedidos" left={row.operacional.pedidos} right={row.contaAzul.pedidos} diff={row.diffPedidos} />
                  <CompareMetric label="Unidades" left={fmtQtd(row.operacional.unidades)} right={fmtQtd(row.contaAzul.unidades)} diff={fmtQtd(row.diffUnidades)} />
                  <CompareMetric label="Valor" left={fmtMoney(row.operacional.valorEstimado)} right={fmtMoney(row.contaAzul.valorLiquido)} diff={fmtMoney(row.diffValor)} />
                </div>
                <p className="mt-2 rounded-lg bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                  {detalheConciliacaoHistorico(row)}
                </p>
              </div>
            ))}
            {!relatorio.data?.contaAzul?.conciliacao?.length ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Sem vendas Conta Azul sincronizadas para o período/filtro.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status no período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUS.map((s) => {
              const total = Number(resumo?.status?.[s] ?? 0);
              const pct = Math.round((total / statusTotal) * 100);
              return (
                <div key={s} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(s)}`}>{labelStatus(s)}</span>
                    <strong>{total}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${statusBarClass(s)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos no período</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {(relatorio.data?.produtos ?? []).slice(0, 12).map((p: any) => (
              <div key={p.nome} className="rounded-lg border bg-muted/20 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria || "Sem categoria"} · {p.pedidos} linha(s)</p>
                  </div>
                  <span className="rounded-full bg-background px-2 py-1 text-xs font-bold">{fmtQtd(p.quantidade)}</span>
                </div>
              </div>
            ))}
            {!relatorio.data?.produtos.length ? <p className="text-sm text-muted-foreground">Sem produtos no período.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos do período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {relatorio.isLoading ? <p className="text-sm text-muted-foreground">Carregando histórico...</p> : null}
          {!relatorio.isLoading && rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p> : null}
          {rows.map((pedido: any) => (
            <div key={pedido.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{pedido.cliente?.nome ?? pedido.contaAzulCustomerId}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(pedido.dataEntrega).toLocaleDateString("pt-BR")} · {pedido.tipoVenda.replace(/_/g, " ").toLowerCase()} · criado por{" "}
                    {pedido.criadoPor?.nome ?? "não informado"}
                    {pedido.pedidoContaAzul?.numeroVenda ? ` · venda Conta Azul nº ${pedido.pedidoContaAzul.numeroVenda}` : ""}
                    {pedido.statusConciliacao && pedido.statusConciliacao !== "PLANEJADO"
                      ? ` · conciliação: ${String(pedido.statusConciliacao).toLowerCase().replace(/_/g, " ")}`
                      : ""}
                  </p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(pedido.status)}`}>{labelStatus(pedido.status)}</span>
              </div>
              {pedido.observacoes ? <p className="mt-2 rounded-lg bg-muted/40 p-2 text-xs">Obs.: {pedido.observacoes}</p> : null}
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {pedido.itens.map((item: any) => (
                  <div key={item.id} className="rounded-lg bg-muted/30 px-2 py-1.5 text-sm">
                    <strong>{fmtQtd(item.quantidade)} × {item.produtoNome}</strong>
                    {item.categoria ? <span className="ml-1 text-xs text-muted-foreground">({item.categoria})</span> : null}
                    {podeVerValores && item.precoUnit ? <span className="ml-2 text-xs text-muted-foreground">{fmtMoney(item.precoUnit)}</span> : null}
                  </div>
                ))}
              </div>
              {pedido.avarias?.length ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/60 dark:bg-amber-950/10">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">Avarias</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {pedido.avarias.map((avaria: any) => (
                      <div key={avaria.id} className="rounded-lg bg-background/70 px-2 py-1.5 text-sm">
                        <strong>{fmtQtd(avaria.quantidade)} × {avaria.produtoNome}</strong>
                        {avaria.categoria ? <span className="ml-1 text-xs text-muted-foreground">({avaria.categoria})</span> : null}
                        {avaria.observacoes ? <p className="text-xs text-muted-foreground">Obs.: {avaria.observacoes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {pedido.auditoria?.length ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Última alteração: {pedido.auditoria[0].acao} por {pedido.auditoria[0].usuarioNome ?? "não informado"} em{" "}
                  {new Date(pedido.auditoria[0].criadoEm).toLocaleString("pt-BR")}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoricoKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card/80 p-3.5 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function CompareMetric({
  label,
  left,
  right,
  diff,
}: {
  label: string;
  left: string | number;
  right: string | number;
  diff: string | number;
}) {
  return (
    <div className="rounded-lg bg-background/70 p-2">
      <p className="font-bold text-muted-foreground">{label}</p>
      <p>Op.: <strong>{left}</strong></p>
      <p>CA: <strong>{right}</strong></p>
      <p className="text-muted-foreground">Dif.: {diff}</p>
    </div>
  );
}

function detalheConciliacaoHistorico(row: any) {
  if (row.status === "aguardando_venda") {
    return "Aguardando a venda aparecer no Conta Azul; não é divergência real.";
  }
  if (row.status === "venda_sem_pedido") {
    return "Crie pedido operacional a partir da venda CA ou vincule a um pedido existente.";
  }
  const partes: string[] = [];
  if ((row.diffPedidos ?? 0) !== 0) partes.push("número de pedidos");
  if (Math.abs(Number(row.diffUnidades ?? 0)) > 0.001) partes.push("quantidade");
  if (Math.abs(Number(row.diffValor ?? 0)) > 0.05) partes.push("valor/frete");
  if (partes.length === 0) return "Sem diferença recalculada; sincronize novamente.";
  return `Corrigir: ${partes.join(", ")}. Para frete, revisar Regras do cliente > Valor taxa de entrega.`;
}
