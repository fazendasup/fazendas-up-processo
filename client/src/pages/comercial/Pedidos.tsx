import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Package,
  PackageCheck,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  ShoppingBasket,
  Sprout,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const STATUS = ["PENDENTE", "PRONTO", "ENTREGUE", "CANCELADO"] as const;
const TIPOS = [
  ["RECORRENTE_SEMANAL", "Recorrente Semanal"],
  ["RECORRENTE_QUINZENAL", "Recorrente Quinzenal"],
  ["PLANO", "Plano"],
  ["AVULSO", "Avulso"],
] as const;
const CATEGORIAS = ["Buque", "Desfolhado", "Pote"];

function isoLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hojeIso() {
  return isoLocal(new Date());
}

function diaOperacionalInicial() {
  const date = new Date();
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  return isoLocal(date);
}

function fmtMoney(v: unknown) {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtQtd(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function fmtDate(v: string | Date) {
  return new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function labelStatus(s: string) {
  return s.toLowerCase().replace("_", " ");
}

function statusAccentClass(status: string) {
  const classes: Record<string, string> = {
    PENDENTE: "border-l-amber-500",
    PRONTO: "border-l-blue-500",
    ENTREGUE: "border-l-emerald-500",
    CANCELADO: "border-l-rose-500",
  };
  return classes[status] ?? "border-l-slate-400";
}

function statusSelectClass(status: string) {
  const classes: Record<string, string> = {
    PENDENTE: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
    PRONTO: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
    ENTREGUE: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
    CANCELADO: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
  };
  return classes[status] ?? "border-border bg-background";
}

function statusBarClass(status: string) {
  const classes: Record<string, string> = {
    PENDENTE: "bg-amber-500",
    PRONTO: "bg-blue-500",
    ENTREGUE: "bg-emerald-500",
    CANCELADO: "bg-rose-500",
  };
  return classes[status] ?? "bg-slate-400";
}

type ProdutoLinha = { produtoId: string; quantidade: string; observacoes: string };
type AvariaLinha = { produtoId: string; quantidade: string; observacoes: string };

type PedidosTab = "operacional" | "agenda" | "regras" | "produtos" | "compras";

export function Pedidos({ abaInicial = "operacional" }: { abaInicial?: PedidosTab } = {}) {
  const utils = trpc.useUtils();
  const [dia, setDia] = useState(diaOperacionalInicial);
  const [busca, setBusca] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [pedidoEditId, setPedidoEditId] = useState<string | null>(null);
  const [pedidoAuditoriaId, setPedidoAuditoriaId] = useState<string | null>(null);
  const [tipoVenda, setTipoVenda] = useState("");
  const [obsPedido, setObsPedido] = useState("");
  const [linhas, setLinhas] = useState<ProdutoLinha[]>([{ produtoId: "", quantidade: "1", observacoes: "" }]);
  const [avarias, setAvarias] = useState<AvariaLinha[]>([]);
  const [clienteRegrasId, setClienteRegrasId] = useState("");
  const [produtoEdit, setProdutoEdit] = useState<any>(null);

  const diaDate = useMemo(() => new Date(`${dia}T12:00:00`), [dia]);
  const me = trpc.comercial.pedidos.me.useQuery();
  const isAdmin = me.data?.perfil === "ADMIN" || me.data?.perfil === "GERENTE_COMERCIAL";
  const clientes = trpc.comercial.pedidos.clientes.useQuery({ busca: clienteBusca || undefined, limite: 80 });
  const clientesDoDia = trpc.comercial.pedidos.clientes.useQuery({ dia: diaDate, limite: 100 });
  const produtos = trpc.comercial.pedidos.produtos.useQuery({ incluirInativos: true });
  const contextoCliente = trpc.comercial.pedidos.contextoCliente.useQuery(
    { contaAzulCustomerId: clienteId },
    { enabled: Boolean(clienteId) },
  );
  const avisoAvariasCliente = trpc.comercial.pedidos.avisoAvariasCliente.useQuery(
    { contaAzulCustomerId: clienteId, dia: diaDate, janelaDias: 14 },
    { enabled: Boolean(clienteId) },
  );
  const contextoRegras = trpc.comercial.pedidos.contextoCliente.useQuery(
    { contaAzulCustomerId: clienteRegrasId },
    { enabled: Boolean(clienteRegrasId) },
  );
  const agenda = trpc.comercial.pedidos.agenda.useQuery({
    dia: diaDate,
    contaAzulCustomerId: clienteId || undefined,
    busca: busca || undefined,
  });
  const auditoriaPedido = trpc.comercial.pedidos.auditoriaPedido.useQuery(
    { pedidoId: pedidoAuditoriaId! },
    { enabled: Boolean(pedidoAuditoriaId) },
  );
  const dashboard = trpc.comercial.pedidos.dashboard.useQuery({ dia: diaDate });
  const compras = trpc.comercial.pedidos.compras.useQuery({ dia: diaDate, incluirOcultos: false });
  const statusSemana = trpc.comercial.pedidos.statusSemana.useQuery({ dia: diaDate });
  const bloqueioSemana = statusSemana.data?.bloqueio ?? null;
  const podeCriarPedidos = statusSemana.data ? statusSemana.data.podeCriarPedidos : true;

  const salvarPedido = trpc.comercial.pedidos.salvarPedido.useMutation({
    onSuccess: async () => {
      toast.success("Pedido salvo e agenda atualizada.");
      setPedidoEditId(null);
      setObsPedido("");
      setLinhas([{ produtoId: "", quantidade: "1", observacoes: "" }]);
      setAvarias([]);
      await Promise.all([
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.dashboard.invalidate(),
        utils.comercial.pedidos.compras.invalidate(),
        utils.comercial.pedidos.statusSemana.invalidate(),
        utils.comercial.pedidos.avisoAvariasCliente.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Não foi possível salvar o pedido."),
  });
  const mudarStatus = trpc.comercial.pedidos.atualizarStatusClienteDia.useMutation({
    onSuccess: () => {
      void utils.comercial.pedidos.dashboard.invalidate();
      void utils.comercial.pedidos.agenda.invalidate();
      void utils.comercial.pedidos.statusSemana.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const copiarSemanaAnterior = trpc.comercial.pedidos.copiarSemanaAnterior.useMutation({
    onSuccess: async (result) => {
      if (result.criados === 0) {
        toast.message(result.mensagem ?? "Nenhum pedido novo foi copiado.", {
          description: result.ignorados ? `${result.ignorados} cliente(s) já tinham pedido no dia.` : undefined,
        });
      } else {
        toast.success(`${result.criados} pedido(s) copiado(s) da semana anterior.`, {
          description: result.ignorados ? `${result.ignorados} cliente(s) ignorado(s) para evitar duplicidade.` : undefined,
        });
      }
      await Promise.all([
        utils.comercial.pedidos.dashboard.invalidate(),
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.compras.invalidate(),
        utils.comercial.pedidos.clientes.invalidate(),
        utils.comercial.pedidos.relatorioHistorico.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Não foi possível trazer a semana anterior."),
  });
  const fecharSemana = trpc.comercial.pedidos.fecharSemana.useMutation({
    onSuccess: async () => {
      toast.success("Semana fechada. Histórico validado e próxima semana liberada.");
      await Promise.all([
        utils.comercial.pedidos.statusSemana.invalidate(),
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.dashboard.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Não foi possível fechar a semana."),
  });
  const reabrirSemana = trpc.comercial.pedidos.reabrirSemana.useMutation({
    onSuccess: async () => {
      toast.success("Semana reaberta para ajustes.");
      await Promise.all([
        utils.comercial.pedidos.statusSemana.invalidate(),
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.dashboard.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Não foi possível reabrir a semana."),
  });
  const mudarPrioridade = trpc.comercial.pedidos.atualizarPrioridadeClienteDia.useMutation({
    onSuccess: () => void utils.comercial.pedidos.dashboard.invalidate(),
    onError: (err) => toast.error(err.message),
  });
  const cancelarPedido = trpc.comercial.pedidos.cancelarPedido.useMutation({
    onSuccess: async (result) => {
      toast.success(result.alreadyCancelled ? "Pedido já estava cancelado." : "Pedido cancelado e mantido no histórico.");
      await Promise.all([
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.dashboard.invalidate(),
        utils.comercial.pedidos.compras.invalidate(),
        utils.comercial.pedidos.relatorioHistorico.invalidate(),
        utils.comercial.pedidos.statusSemana.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message || "Não foi possível cancelar o pedido."),
  });
  const salvarProduto = trpc.comercial.pedidos.salvarProduto.useMutation({
    onSuccess: () => {
      toast.success("Produto salvo.");
      setProdutoEdit(null);
      void utils.comercial.pedidos.produtos.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const excluirProduto = trpc.comercial.pedidos.excluirProduto.useMutation({
    onSuccess: () => {
      toast.success("Produto removido/inativado.");
      void utils.comercial.pedidos.produtos.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const salvarRegra = trpc.comercial.pedidos.salvarRegraCliente.useMutation({
    onSuccess: () => {
      toast.success("Regras comerciais salvas.");
      void utils.comercial.pedidos.contextoCliente.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const atualizarCompra = trpc.comercial.pedidos.atualizarCompraProduto.useMutation({
    onSuccess: () => {
      void utils.comercial.pedidos.compras.invalidate();
      void utils.comercial.pedidos.produtos.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const salvarMixFolha = trpc.comercial.pedidos.salvarConfigMixFolhaLeve.useMutation({
    onSuccess: () => {
      void utils.comercial.pedidos.compras.invalidate();
      toast.success("Mix folha leve salvo.");
    },
    onError: (err) => toast.error(err.message),
  });

  const clienteSelecionado = contextoCliente.data?.cliente;
  const regra = contextoCliente.data?.regra;
  const precosEspeciais = new Map((regra?.precosEspeciais ?? []).map((p: any) => [p.produtoId, p.preco]));
  const dashboardKpis = useMemo(() => {
    const grupos = dashboard.data ?? [];
    const status = STATUS.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: 0 }), {});
    const produtosMap = new Map<string, { nome: string; categoria: string; quantidade: number; linhas: number; clientes: Set<string> }>();
    const categoriasMap = new Map<string, number>();
    let pedidos = 0;
    let unidades = 0;
    let linhas = 0;
    let observacoes = 0;
    let clientesSemRegras = 0;
    let clientesComTaxa = 0;

    for (const grupo of grupos as any[]) {
      status[grupo.status] = (status[grupo.status] ?? 0) + 1;
      pedidos += grupo.pedidos?.length ?? 0;
      if (!grupo.regras) clientesSemRegras++;
      if (grupo.regras?.cobraTaxaEntrega) clientesComTaxa++;

      for (const item of grupo.itens ?? []) {
        const quantidade = Number(item.quantidade ?? 0) || 0;
        const nome = item.produtoNome || "Produto sem nome";
        const categoria = item.categoria || "Sem categoria";
        const atual = produtosMap.get(nome) ?? { nome, categoria, quantidade: 0, linhas: 0, clientes: new Set<string>() };
        atual.quantidade += quantidade;
        atual.linhas += 1;
        atual.clientes.add(grupo.contaAzulCustomerId);
        produtosMap.set(nome, atual);
        categoriasMap.set(categoria, (categoriasMap.get(categoria) ?? 0) + quantidade);
        unidades += quantidade;
        linhas += 1;
        if (item.pedidoObservacoes) observacoes += 1;
      }
    }

    const produtos = Array.from(produtosMap.values())
      .map((p) => ({ ...p, clientes: p.clientes.size }))
      .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));
    const categorias = Array.from(categoriasMap.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));

    return {
      pedidos,
      unidades,
      clientes: grupos.length,
      produtosDistintos: produtos.length,
      linhas,
      observacoes,
      clientesSemRegras,
      clientesComTaxa,
      status,
      produtos,
      categorias,
    };
  }, [dashboard.data]);

  function salvarPedidoAtual() {
    if (!pedidoEditId && !podeCriarPedidos && bloqueioSemana) {
      return toast.error(
        `Feche a semana de ${bloqueioSemana.rotulo} antes de criar novos pedidos.`,
      );
    }
    if (!clienteId) return toast.error("Selecione um cliente Conta Azul.");
    if (!tipoVenda) return toast.error("Tipo de venda é obrigatório.");
    const itens = linhas
      .map((l) => ({ ...l, quantidadeNum: Number(l.quantidade) }))
      .filter((l) => l.produtoId && Number.isFinite(l.quantidadeNum) && l.quantidadeNum > 0);
    const avariasValidas = avarias
      .map((l) => ({ ...l, quantidadeNum: Number(l.quantidade) }))
      .filter((l) => l.produtoId && Number.isFinite(l.quantidadeNum) && l.quantidadeNum > 0);
    if (itens.length === 0 && avariasValidas.length === 0) {
      return toast.error("Informe pelo menos um produto ou uma avaria com quantidade maior que zero.");
    }
    salvarPedido.mutate({
      contaAzulCustomerId: clienteId,
      ...(pedidoEditId ? { id: pedidoEditId } : {}),
      dataEntrega: diaDate,
      tipoVenda: tipoVenda as any,
      observacoes: obsPedido,
      itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidadeNum, observacoes: i.observacoes })),
      avarias: avariasValidas.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidadeNum, observacoes: i.observacoes })),
    });
  }

  function irParaSemanaPendente() {
    if (!bloqueioSemana) return;
    setDia(isoLocal(new Date(bloqueioSemana.inicio)));
  }

  function fecharSemanaAtual() {
    const info = statusSemana.data?.semanaAtual;
    if (!info) return;
    const ok = window.confirm(
      `Fechar a semana de ${info.rotulo}?\n\nIsso valida o histórico (${info.entregues} entregue(s), ${info.cancelados} cancelado(s)) e libera a criação de pedidos da próxima semana. Você poderá reabrir depois, se necessário.`,
    );
    if (!ok) return;
    fecharSemana.mutate({ dia: diaDate });
  }

  function fecharSemanaBloqueante() {
    if (!bloqueioSemana) return;
    const ok = window.confirm(
      `Fechar a semana de ${bloqueioSemana.rotulo}?\n\nTodos os pedidos estão revisados. Isso valida o histórico e libera a criação de novos pedidos.`,
    );
    if (!ok) return;
    fecharSemana.mutate({ dia: new Date(bloqueioSemana.inicio) });
  }

  function trazerSemanaAnterior() {
    if (!podeCriarPedidos && bloqueioSemana) {
      return toast.error(`Feche a semana de ${bloqueioSemana.rotulo} antes de trazer pedidos.`);
    }
    const origem = new Date(diaDate);
    origem.setDate(origem.getDate() - 7);
    const origemLabel = origem.toLocaleDateString("pt-BR");
    const destinoLabel = diaDate.toLocaleDateString("pt-BR");
    const ok = window.confirm(
      `Trazer pedidos de ${origemLabel} para ${destinoLabel}?\n\nO histórico da semana anterior será mantido. Clientes que já têm pedido no dia selecionado serão ignorados para evitar duplicidade.`,
    );
    if (!ok) return;
    copiarSemanaAnterior.mutate({ dia: diaDate });
  }

  function confirmarCancelamentoPedido(pedido: any) {
    const nome = pedido.cliente?.nome ?? pedido.contaAzulCustomerId;
    const ok = window.confirm(
      `Cancelar o pedido de ${nome}?\n\nEle não será apagado: ficará como cancelado e continuará disponível no histórico e na rastreabilidade.`,
    );
    if (!ok) return;
    cancelarPedido.mutate({ pedidoId: pedido.id });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pedidos</p>
          <h1 className="text-2xl font-bold">Operação comercial e agenda de pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Clientes vêm da Conta Azul; aqui ficam somente regras Fazendas Up, pedidos e rastreabilidade.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Dia operacional</Label>
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="h-9" />
          </div>
          <Button variant="outline" onClick={() => setDia(hojeIso())}>
            Hoje
          </Button>
          <Button
            variant="outline"
            disabled={copiarSemanaAnterior.isPending || !podeCriarPedidos}
            onClick={trazerSemanaAnterior}
          >
            {copiarSemanaAnterior.isPending ? "Copiando..." : "Trazer semana anterior"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/comercial/pedidos-historico">Histórico</Link>
          </Button>
        </div>
      </div>

      {/* Gate de fechamento semanal */}
      {bloqueioSemana ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-0.5">
                <p className="font-semibold text-red-800 dark:text-red-200">
                  Semana de {bloqueioSemana.rotulo} ainda não foi fechada
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {bloqueioSemana.pendentes > 0
                    ? `Há ${bloqueioSemana.pendentes} pedido(s) sem definição de entregue/cancelado. Revise e feche a semana para liberar novos pedidos.`
                    : "Os pedidos já estão revisados, mas a semana ainda não foi fechada. Finalize o fechamento para liberar novos pedidos."}
                </p>
                {!isAdmin && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Apenas administradores/gerentes podem fechar a semana.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={irParaSemanaPendente}>
                Revisar semana de {bloqueioSemana.rotulo}
              </Button>
              {isAdmin && bloqueioSemana.pendentes === 0 && (
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={fecharSemana.isPending}
                  onClick={fecharSemanaBloqueante}
                >
                  {fecharSemana.isPending ? "Fechando..." : `Fechar semana ${bloqueioSemana.rotulo}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : statusSemana.data?.semanaAtual ? (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {statusSemana.data.semanaAtual.fechada ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-600" />
              )}
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  Semana de {statusSemana.data.semanaAtual.rotulo}
                  {statusSemana.data.semanaAtual.fechada ? " · fechada" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statusSemana.data.semanaAtual.totalPedidos} pedido(s) ·{" "}
                  {statusSemana.data.semanaAtual.entregues} entregue(s) ·{" "}
                  {statusSemana.data.semanaAtual.cancelados} cancelado(s) ·{" "}
                  {statusSemana.data.semanaAtual.pendentes} pendente(s)
                  {statusSemana.data.semanaAtual.fechada && statusSemana.data.semanaAtual.fechadoPorNome
                    ? ` · por ${statusSemana.data.semanaAtual.fechadoPorNome}`
                    : ""}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {statusSemana.data.semanaAtual.fechada ? (
                  <Button
                    variant="outline"
                    disabled={reabrirSemana.isPending}
                    onClick={() => {
                      if (window.confirm(`Reabrir a semana de ${statusSemana.data!.semanaAtual.rotulo} para ajustes?`)) {
                        reabrirSemana.mutate({ dia: diaDate });
                      }
                    }}
                  >
                    {reabrirSemana.isPending ? "Reabrindo..." : "Reabrir semana"}
                  </Button>
                ) : statusSemana.data.podeFecharSemanaAtual ? (
                  <Button disabled={fecharSemana.isPending} onClick={fecharSemanaAtual}>
                    {fecharSemana.isPending ? "Fechando..." : "Fechar semana"}
                  </Button>
                ) : statusSemana.data.semanaAtual.totalPedidos > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Defina entregue/cancelado em todos os pedidos para fechar.
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Tabs defaultValue={abaInicial} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="operacional">Dashboard operacional</TabsTrigger>
          <TabsTrigger value="agenda">Emissão / Agenda</TabsTrigger>
          <TabsTrigger value="regras">Regras comerciais</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="compras">Estoque vivo / compras</TabsTrigger>
        </TabsList>

        <TabsContent value="operacional" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" /> {DIAS[diaDate.getDay()]} · {dia}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PedidosKpiDashboard kpis={dashboardKpis} />
              {(dashboard.data ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhuma entrega para o dia selecionado.
                </p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {dashboard.data?.map((grupo: any) => (
                    <Card key={grupo.contaAzulCustomerId} className={`border-l-4 ${statusAccentClass(grupo.status)}`}>
                    <CardContent className="space-y-3 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{grupo.cliente?.nome ?? grupo.contaAzulCustomerId}</p>
                          <p className="text-xs text-muted-foreground">
                            {grupo.cliente?.cnpjCpf || "Sem documento"} · {grupo.pedidos.length} pedido(s)
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {isAdmin && (
                            <Input
                              type="number"
                              placeholder="Ordem"
                              defaultValue={grupo.prioridadeEntrega ?? ""}
                              className="h-8 w-20"
                              onBlur={(e) =>
                                mudarPrioridade.mutate({
                                  contaAzulCustomerId: grupo.contaAzulCustomerId,
                                  dia: diaDate,
                                  prioridadeEntrega: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                            />
                          )}
                          <select
                            className={`h-8 rounded-md border px-2 text-xs font-semibold ${statusSelectClass(grupo.status)}`}
                            value={grupo.status}
                            onChange={(e) =>
                              mudarStatus.mutate({
                                contaAzulCustomerId: grupo.contaAzulCustomerId,
                                dia: diaDate,
                                status: e.target.value as any,
                              })
                            }
                          >
                            {STATUS.map((s) => (
                              <option key={s} value={s}>
                                {labelStatus(s)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <RegrasResumo regra={grupo.regras} />
                      <div className="grid gap-2">
                        {grupo.itens.map((item: any) => (
                          <div key={item.id} className="rounded-lg bg-muted/40 px-2 py-1.5 text-sm">
                            <p className="font-medium">
                              {Number(item.quantidade)} × {item.produtoNome}
                              {item.categoria ? <span className="ml-1 text-xs text-muted-foreground">({item.categoria})</span> : null}
                            </p>
                            {item.pedidoObservacoes && <p className="text-xs text-muted-foreground">Obs. pedido: {item.pedidoObservacoes}</p>}
                          </div>
                        ))}
                      </div>
                      {grupo.avarias?.length ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/60 dark:bg-amber-950/10">
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">Avarias</p>
                          <div className="flex flex-wrap gap-2">
                            {grupo.avarias.map((a: any) => (
                              <span key={a.id} className="rounded-lg bg-background px-2 py-1 text-xs">
                                <span className="font-medium">
                                  {Number(a.quantidade)} × {a.produtoNome}{a.categoria ? ` · ${a.categoria}` : ""}
                                </span>
                                {a.observacoes ? <span className="block text-muted-foreground">{a.observacoes}</span> : null}
                                {a.criadoPor?.nome || a.criadoPor?.email ? (
                                  <span className="block text-[10px] text-muted-foreground">
                                    Lançado por {a.criadoPor?.nome ?? a.criadoPor?.email}
                                  </span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda" className="grid gap-4 xl:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" /> Emitir / agendar pedido
              </CardTitle>
              {pedidoEditId && <p className="text-xs text-muted-foreground">Editando pedido existente. Salvar criará registro de auditoria.</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              <ClientePicker
                busca={clienteBusca}
                setBusca={setClienteBusca}
                clientes={clientes.data ?? []}
                value={clienteId}
                onChange={setClienteId}
              />
              {clienteSelecionado && (
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="font-semibold">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-muted-foreground">{clienteSelecionado.cnpjCpf || "Sem documento"}</p>
                </div>
              )}
              {clienteId && (
                <AvisoAvariasPedido aviso={avisoAvariasCliente.data} isLoading={avisoAvariasCliente.isLoading} />
              )}
              <PainelRegrasVenda regra={regra} precos={regra?.precosEspeciais ?? []} />
              <div>
                <Label className="text-xs">Tipo de venda *</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={tipoVenda} onChange={(e) => setTipoVenda(e.target.value)}>
                  <option value="">Selecione...</option>
                  {TIPOS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Observações do pedido</Label>
                <Input value={obsPedido} onChange={(e) => setObsPedido(e.target.value)} placeholder="Observação deste pedido (não altera a regra do cliente)" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Produtos vendidos</Label>
                  <Button size="sm" variant="outline" onClick={() => setLinhas((p) => [...p, { produtoId: "", quantidade: "1", observacoes: "" }])}>
                    + Linha
                  </Button>
                </div>
                {linhas.map((linha, idx) => {
                  const produto = produtos.data?.find((p: any) => p.id === linha.produtoId) as any;
                  const especial = linha.produtoId ? precosEspeciais.get(linha.produtoId) : null;
                  return (
                    <div key={idx} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_7rem_auto]">
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={linha.produtoId}
                        onChange={(e) => setLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, produtoId: e.target.value } : l))}
                      >
                        <option value="">Produto...</option>
                        {(produtos.data ?? []).filter((p: any) => p.ativo).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.nome}{p.categoria ? ` · ${p.categoria}` : ""}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={linha.quantidade}
                        onChange={(e) => setLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, quantidade: e.target.value } : l))}
                      />
                      <Button variant="ghost" onClick={() => setLinhas((prev) => prev.filter((_, i) => i !== idx))}>Remover</Button>
                      {produto && (
                        <p className="text-xs text-muted-foreground sm:col-span-3">
                          Categoria: {produto.categoria || "sem categoria"} · preço usado: {fmtMoney(especial ?? produto.precoBase ?? 0)}
                          {especial ? " (especial do cliente)" : ""}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/60 dark:bg-amber-950/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs">Avarias</Label>
                    <p className="text-xs text-muted-foreground">Registre perdas/devoluções por variedade. Não entram no volume normal do pedido.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setAvarias((p) => [...p, { produtoId: "", quantidade: "1", observacoes: "" }])}>
                    + Avaria
                  </Button>
                </div>
                {avarias.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma avaria lançada neste pedido.</p>
                ) : (
                  avarias.map((linha, idx) => (
                    <div key={idx} className="grid gap-2 rounded-lg border bg-background/70 p-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={linha.produtoId}
                        onChange={(e) => setAvarias((prev) => prev.map((l, i) => i === idx ? { ...l, produtoId: e.target.value } : l))}
                      >
                        <option value="">Variedade...</option>
                        {(produtos.data ?? []).filter((p: any) => p.ativo).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.nome}{p.categoria ? ` · ${p.categoria}` : ""}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={linha.quantidade}
                        onChange={(e) => setAvarias((prev) => prev.map((l, i) => i === idx ? { ...l, quantidade: e.target.value } : l))}
                      />
                      <Button variant="ghost" onClick={() => setAvarias((prev) => prev.filter((_, i) => i !== idx))}>Remover</Button>
                      <Input
                        className="sm:col-span-3"
                        value={linha.observacoes}
                        onChange={(e) => setAvarias((prev) => prev.map((l, i) => i === idx ? { ...l, observacoes: e.target.value } : l))}
                        placeholder="Observação da avaria (opcional)"
                        aria-label="Motivo ou observação da avaria"
                      />
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={salvarPedidoAtual} disabled={salvarPedido.isPending} className="flex-1">
                  <Save className="mr-2 h-4 w-4" /> {pedidoEditId ? "Salvar edição" : "Salvar pedido"}
                </Button>
                {pedidoEditId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPedidoEditId(null);
                      setObsPedido("");
                      setLinhas([{ produtoId: "", quantidade: "1", observacoes: "" }]);
                      setAvarias([]);
                    }}
                  >
                    Cancelar edição
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" /> Agenda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                <Input placeholder="Buscar cliente/produto/observação" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Clientes com pedido no dia...</option>
                  {(clientesDoDia.data ?? []).map((c: any) => (
                    <option key={c.externalId} value={c.externalId}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {(agenda.data ?? []).map((p: any) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-semibold">{p.cliente?.nome ?? p.contaAzulCustomerId}</p>
                        <p className="text-xs text-muted-foreground">{TIPOS.find(([v]) => v === p.tipoVenda)?.[1]} · {labelStatus(p.status)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Criado por {p.criadoPor?.nome ?? "n/d"} · editado por {p.editadoPor?.nome ?? "n/d"}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.itens.map((i: any) => (
                        <span key={i.id} className="rounded-full bg-muted px-2 py-1 text-xs">
                          {Number(i.quantidade)} × {i.produtoNome}{i.categoria ? ` · ${i.categoria}` : ""}
                        </span>
                      ))}
                    </div>
                    {p.avarias?.length ? (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900/60 dark:bg-amber-950/10">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">Avarias</p>
                        <div className="flex flex-wrap gap-2">
                          {p.avarias.map((a: any) => (
                            <span key={a.id} className="rounded-lg bg-background px-2 py-1 text-xs">
                              <span className="font-medium">
                                {Number(a.quantidade)} × {a.produtoNome}{a.categoria ? ` · ${a.categoria}` : ""}
                              </span>
                              {a.observacoes ? <span className="block text-muted-foreground">{a.observacoes}</span> : null}
                              {a.criadoPor?.nome || a.criadoPor?.email ? (
                                <span className="block text-[10px] text-muted-foreground">
                                  Lançado por {a.criadoPor?.nome ?? a.criadoPor?.email}
                                </span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {p.observacoes && <p className="mt-2 text-sm text-muted-foreground">{p.observacoes}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPedidoEditId(p.id);
                          setClienteId(p.contaAzulCustomerId);
                          setTipoVenda(p.tipoVenda);
                          setObsPedido(p.observacoes ?? "");
                          setLinhas(
                            p.itens.map((i: any) => ({
                              produtoId: i.produtoId,
                              quantidade: String(Number(i.quantidade)),
                              observacoes: i.observacoes ?? "",
                            })),
                          );
                          setAvarias(
                            (p.avarias ?? []).map((a: any) => ({
                              produtoId: a.produtoId,
                              quantidade: String(Number(a.quantidade)),
                              observacoes: a.observacoes ?? "",
                            })),
                          );
                        }}
                      >
                        Editar pedido
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPedidoAuditoriaId(p.id)}>
                        Rastreabilidade
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={p.status === "CANCELADO" || cancelarPedido.isPending}
                        onClick={() => confirmarCancelamentoPedido(p)}
                      >
                        {p.status === "CANCELADO" ? "Cancelado" : "Excluir pedido"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {pedidoAuditoriaId && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Rastreabilidade do pedido</p>
                    <Button size="sm" variant="ghost" onClick={() => setPedidoAuditoriaId(null)}>Fechar</Button>
                  </div>
                  {(auditoriaPedido.data ?? []).length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">Sem eventos de auditoria.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {auditoriaPedido.data?.map((a: any) => (
                        <div key={a.id} className="rounded-md bg-background p-2 text-xs">
                          <p className="font-medium">{a.acao} · {new Date(a.criadoEm).toLocaleString("pt-BR")}</p>
                          <p className="text-muted-foreground">Usuário: {a.usuarioNome ?? "n/d"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regras">
          <RegrasClienteArea
            clientes={clientes.data ?? []}
            busca={clienteBusca}
            setBusca={setClienteBusca}
            clienteId={clienteRegrasId}
            setClienteId={setClienteRegrasId}
            contexto={contextoRegras.data}
            produtos={produtos.data ?? []}
            onSalvar={(payload: any) => salvarRegra.mutate(payload)}
            disabled={!isAdmin || salvarRegra.isPending}
          />
        </TabsContent>

        <TabsContent value="produtos">
          <ProdutosArea
            produtos={produtos.data ?? []}
            edit={produtoEdit}
            setEdit={setProdutoEdit}
            onSalvar={(payload: any) => salvarProduto.mutate(payload)}
            onExcluir={(id: string) => excluirProduto.mutate({ id })}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="compras">
          <ComprasArea
            estoque={compras.data}
            produtos={produtos.data ?? []}
            isLoading={compras.isLoading}
            isAdmin={isAdmin}
            onUpdate={(payload: any) => atualizarCompra.mutate(payload)}
            onSalvarMixFolha={(payload: any) => salvarMixFolha.mutate(payload)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientePicker({ busca, setBusca, clientes, value, onChange }: any) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Cliente Conta Azul *</Label>
      <Input placeholder="Buscar cliente Conta Azul..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione cliente...</option>
        {clientes.map((c: any) => (
          <option key={c.externalId} value={c.externalId}>{c.nome} {c.cnpjCpf ? `· ${c.cnpjCpf}` : ""}</option>
        ))}
      </select>
    </div>
  );
}

function AvisoAvariasPedido({ aviso, isLoading }: { aviso: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
        Verificando avarias recentes da unidade...
      </div>
    );
  }

  if (!aviso) return null;

  if (!aviso.possuiAvarias) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Sem avarias recentes para esta unidade.</p>
            <p className="text-xs opacity-80">Nenhuma avaria lançada nos últimos {aviso.janelaDias} dias. Pode seguir com o pedido normal.</p>
          </div>
        </div>
      </div>
    );
  }

  const produtos = (aviso.produtos ?? []).slice(0, 3);
  const lancamentos = (aviso.lancamentos ?? []).slice(0, 3);

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Atenção: esta unidade teve avarias recentes.</p>
          <p className="text-xs opacity-80">
            {fmtQtd(aviso.quantidadeTotal)} un em {aviso.lancamentos?.length ?? 0} lançamento(s) nos últimos {aviso.janelaDias} dias. Considere isso antes de confirmar as quantidades.
          </p>
        </div>
      </div>
      {produtos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {produtos.map((p: any) => (
            <span key={p.produtoId} className="rounded-full bg-background/70 px-2 py-1 text-xs">
              {p.produtoNome}: {fmtQtd(p.quantidade)} un
            </span>
          ))}
        </div>
      )}
      {lancamentos.length > 0 && (
        <div className="space-y-1 text-xs opacity-90">
          {lancamentos.map((l: any) => (
            <p key={l.id}>
              {fmtDate(l.dataEntrega)}: {fmtQtd(l.quantidade)} un de {l.produtoNome}
              {l.observacoes ? ` - ${l.observacoes}` : ""}
            </p>
          ))}
        </div>
      )}
      <Link href="/comercial/acompanhamento-avarias" className="inline-flex text-xs font-semibold underline-offset-4 hover:underline">
        Ver sugestão de pedido no Acompanhamento avarias
      </Link>
    </div>
  );
}

function PedidosKpiDashboard({ kpis }: { kpis: any }) {
  const totalStatus = Math.max(1, Object.values(kpis.status ?? {}).reduce((sum: number, n: any) => sum + Number(n ?? 0), 0));
  const topProdutos = (kpis.produtos ?? []).slice(0, 8);
  const topCategorias = (kpis.categorias ?? []).slice(0, 5);

  return (
    <div className="space-y-3">
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-500/20 dark:text-cyan-300">
            <BarChart3 className="h-4 w-4" />
          </span>
          Indicadores do dia
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiResumoCard
            icon={<ClipboardList className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />}
            label="Pedidos do dia"
            value={kpis.pedidos}
            hint={`${kpis.linhas} linha(s) de produto`}
            className="bg-cyan-500/[0.07] dark:bg-cyan-500/15"
          />
          <KpiResumoCard
            icon={<PackageCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
            label="Unidades do dia"
            value={formatQuantidade(kpis.unidades)}
            hint="Soma das quantidades"
            className="bg-emerald-500/[0.07] dark:bg-emerald-500/15"
          />
          <KpiResumoCard
            icon={<Users className="h-4 w-4 text-blue-700 dark:text-blue-300" />}
            label="Clientes do dia"
            value={kpis.clientes}
            hint={`${kpis.clientesComTaxa} com taxa entrega`}
            className="bg-blue-500/[0.07] dark:bg-blue-500/15"
          />
          <KpiResumoCard
            icon={<Sprout className="h-4 w-4 text-lime-700 dark:text-lime-300" />}
            label="Produtos do dia"
            value={kpis.produtosDistintos}
            hint="Variedades distintas"
            className="bg-lime-500/[0.08] dark:bg-lime-500/15"
          />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" /> Status das entregas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUS.map((status) => {
              const total = Number(kpis.status?.[status] ?? 0);
              const pct = Math.round((total / totalStatus) * 100);
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-semibold ${statusSelectClass(status)}`}>
                      {status === "ENTREGUE" ? <CheckCircle2 className="h-3 w-3" /> : null}
                      {status === "CANCELADO" ? <XCircle className="h-3 w-3" /> : null}
                      {status === "PENDENTE" ? <Clock className="h-3 w-3" /> : null}
                      {status === "PRONTO" ? <PackageCheck className="h-3 w-3" /> : null}
                      {labelStatus(status)}
                    </span>
                    <span className="font-bold">{total} cliente(s)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${statusBarClass(status)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <MiniInsight icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Sem regras" value={kpis.clientesSemRegras} />
              <MiniInsight icon={<Search className="h-3.5 w-3.5" />} label="Com observação" value={kpis.observacoes} />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShoppingBasket className="h-4 w-4" /> Produtos por variedade
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-2">
              {topProdutos.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Sem produtos no dia.</p>
              ) : (
                topProdutos.map((produto: any, index: number) => {
                  const max = Math.max(1, Number(topProdutos[0]?.quantidade ?? 0));
                  const pct = Math.max(4, Math.round((Number(produto.quantidade ?? 0) / max) * 100));
                  return (
                    <div key={produto.nome} className="rounded-lg border bg-muted/20 p-2">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {index + 1}. {produto.nome}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {produto.categoria} · {produto.clientes} cliente(s)
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-background px-2 py-1 text-xs font-bold">
                          {formatQuantidade(produto.quantidade)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Por categoria</p>
              <div className="space-y-2">
                {topCategorias.map((categoria: any) => (
                  <div key={categoria.nome} className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-2 py-1.5 text-sm">
                    <span className="truncate font-medium">{categoria.nome}</span>
                    <span className="font-bold">{formatQuantidade(categoria.quantidade)}</span>
                  </div>
                ))}
                {topCategorias.length === 0 ? <p className="text-xs text-muted-foreground">Sem categorias no dia.</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiResumoCard({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 shadow-sm ${className}`}>
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function MiniInsight({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function formatQuantidade(value: unknown) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function RegrasResumo({ regra }: { regra: any }) {
  if (!regra) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Sem regras comerciais definidas. Usando valores padrão.
      </p>
    );
  }
  const entrega = `${regra.periodoEntrega || "Sem período"}${regra.horarioMaximoEntrega ? ` até ${regra.horarioMaximoEntrega}` : ""}`;
  const boleto = regra.prazoBoletoDias == null ? "Padrão" : `${regra.prazoBoletoDias} dias`;
  const acumulacao = regra.acumulaPedidos ? `Acumula ${regra.diasAcumulo ?? "?"} dias` : "Não acumula";
  const entregaTaxa = regra.cobraTaxaEntrega ? "Cobra entrega" : "Sem taxa entrega";

  return (
    <div className="rounded-xl border bg-card/80 p-2 shadow-sm">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Regras comerciais</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <RegraChip label="Entrega" value={entrega} className="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100" />
        <RegraChip label="Boleto" value={boleto} className="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100" />
        <RegraChip label="Faturamento" value={acumulacao} className="border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100" />
        <RegraChip label="Taxa" value={entregaTaxa} className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" />
      </div>
      {regra.observacoesGerais && (
        <p className="mt-2 rounded-lg bg-muted/50 px-2 py-1.5 text-xs text-foreground">
          <span className="font-semibold">Obs. comercial:</span> {regra.observacoesGerais}
        </p>
      )}
    </div>
  );
}

function RegraChip({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function PainelRegrasVenda({ regra, precos }: { regra: any; precos: any[] }) {
  return (
    <div className="rounded-lg border bg-blue-50/60 p-3 text-sm dark:bg-blue-950/20">
      <p className="font-semibold">Regras comerciais do cliente</p>
      <RegrasResumo regra={regra} />
      {precos.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold">Preços especiais disponíveis</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {precos.map((p: any) => (
              <span key={p.id} className="rounded-full bg-background px-2 py-1 text-xs">
                {p.produto?.nome}: {fmtMoney(p.preco)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegrasClienteArea({ clientes, busca, setBusca, clienteId, setClienteId, contexto, produtos, onSalvar, disabled }: any) {
  const regra = contexto?.regra;
  const [form, setForm] = useState<any>({});
  const precos = new Map((regra?.precosEspeciais ?? []).map((p: any) => [p.produtoId, String(Number(p.preco))]));
  const [precosForm, setPrecosForm] = useState<Record<string, string>>({});
  const merged = { ...regra, ...form };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4" /> Regras comerciais por cliente</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ClientePicker busca={busca} setBusca={setBusca} clientes={clientes} value={clienteId} onChange={(v: string) => { setClienteId(v); setForm({}); setPrecosForm({}); }} />
        {contexto?.semRegras && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Sem regras comerciais definidas para este cliente.</p>}
        {clienteId && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <Label className="text-xs">Observações gerais</Label>
                <Input value={merged.observacoesGerais ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, observacoesGerais: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Período de entrega</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={merged.periodoEntrega ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, periodoEntrega: e.target.value || null }))}>
                  <option value="">Vazio</option><option value="MANHA">Manhã</option><option value="TARDE">Tarde</option>
                </select>
              </div>
              <Field label="Horário máximo" value={merged.horarioMaximoEntrega ?? ""} onChange={(v: string) => setForm((f: any) => ({ ...f, horarioMaximoEntrega: v }))} type="time" />
              <Field label="Prazo boleto (dias)" value={merged.prazoBoletoDias ?? ""} onChange={(v: string) => setForm((f: any) => ({ ...f, prazoBoletoDias: v ? Number(v) : null }))} type="number" />
              <Check label="Cobra taxa de entrega" checked={Boolean(merged.cobraTaxaEntrega)} onChange={(v: boolean) => setForm((f: any) => ({ ...f, cobraTaxaEntrega: v }))} />
              <Check label="Acumula pedidos" checked={Boolean(merged.acumulaPedidos)} onChange={(v: boolean) => setForm((f: any) => ({ ...f, acumulaPedidos: v }))} />
              <Field label="Dias de acúmulo" value={merged.diasAcumulo ?? ""} onChange={(v: string) => setForm((f: any) => ({ ...f, diasAcumulo: v ? Number(v) : null }))} type="number" />
              <Field label="Prazo boleto com acúmulo" value={merged.prazoBoletoAcumuloDias ?? ""} onChange={(v: string) => setForm((f: any) => ({ ...f, prazoBoletoAcumuloDias: v ? Number(v) : null }))} type="number" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Preços especiais por produto</p>
              <div className="grid gap-2 md:grid-cols-3">
                {produtos.filter((p: any) => p.ativo).map((p: any) => (
                  <div key={p.id}>
                    <Label className="text-xs">{p.nome}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={fmtMoney(p.precoBase ?? 0)}
                      value={precosForm[p.id] ?? precos.get(p.id) ?? ""}
                      onChange={(e) => setPrecosForm((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <Button
              disabled={disabled}
              onClick={() =>
                onSalvar({
                  contaAzulCustomerId: clienteId,
                  observacoesGerais: merged.observacoesGerais ?? null,
                  periodoEntrega: merged.periodoEntrega ?? null,
                  horarioMaximoEntrega: merged.horarioMaximoEntrega ?? null,
                  cobraTaxaEntrega: Boolean(merged.cobraTaxaEntrega),
                  prazoBoletoDias: merged.prazoBoletoDias ?? null,
                  acumulaPedidos: Boolean(merged.acumulaPedidos),
                  diasAcumulo: merged.diasAcumulo ?? null,
                  prazoBoletoAcumuloDias: merged.prazoBoletoAcumuloDias ?? null,
                  precosEspeciais: Object.entries(precosForm)
                    .filter(([, v]) => v !== "")
                    .map(([produtoId, preco]) => ({ produtoId, preco: Number(preco) })),
                })
              }
            >
              Salvar regras
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProdutosArea({ produtos, edit, setEdit, onSalvar, onExcluir, isAdmin }: any) {
  const p = edit ?? { nome: "", precoBase: "", categoria: "", ativo: true };
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> Catálogo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!isAdmin && <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">Somente administrativo pode criar, editar ou excluir produtos.</p>}
          <Field label="Nome" value={p.nome} onChange={(v: string) => setEdit({ ...p, nome: v })} disabled={!isAdmin} />
          <Field label="Preço base" value={p.precoBase ?? ""} onChange={(v: string) => setEdit({ ...p, precoBase: v })} type="number" disabled={!isAdmin} />
          <div>
            <Label className="text-xs">Categoria</Label>
            <select disabled={!isAdmin} className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={p.categoria ?? ""} onChange={(e) => setEdit({ ...p, categoria: e.target.value })}>
              <option value="">Sem categoria</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Button disabled={!isAdmin} onClick={() => onSalvar({ ...p, precoBase: p.precoBase === "" ? null : Number(p.precoBase), ativo: p.ativo ?? true })}>Salvar produto</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-4">
          {produtos.map((prod: any) => (
            <div key={prod.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="font-semibold">{prod.nome} {!prod.ativo && <span className="text-xs text-muted-foreground">(inativo)</span>}</p>
                <p className="text-xs text-muted-foreground">{prod.categoria || "sem categoria"} · {fmtMoney(prod.precoBase ?? 0)} · usado em {prod.usoPedidos ?? 0} item(ns)</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!isAdmin} onClick={() => setEdit({ ...prod, precoBase: prod.precoBase == null ? "" : String(Number(prod.precoBase)) })}>Editar</Button>
                <Button variant="ghost" size="sm" disabled={!isAdmin} onClick={() => onExcluir(prod.id)}>Excluir</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ComprasArea({ estoque, produtos, isLoading, isAdmin, onUpdate, onSalvarMixFolha }: any) {
  const cfg = estoque?.cfgMix;
  const linhas = estoque?.linhas ?? [];
  const desativados = estoque?.desativados ?? [];
  const totais = estoque?.totais;
  const [mixRef, setMixRef] = useState("");
  const [mixVars, setMixVars] = useState("");
  const produtoIdPorNome = useMemo(
    () => new Map(produtos.map((p: any) => [p.nome, p.id])),
    [produtos],
  );

  useEffect(() => {
    if (!cfg) return;
    setMixRef(cfg.referenciaProduto ?? "");
    setMixVars((cfg.variedades ?? []).join("\n"));
  }, [cfg?.referenciaProduto, cfg?.variedades?.join("|")]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Calculando estoque vivo…</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBasket className="h-4 w-4" /> Estoque vivo — compras do dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cfg && (
            <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              Referência «{cfg.referenciaProduto}»: <strong>{cfg.qtdReferencia ?? 0}</strong> un. no dia
              {cfg.variedades?.length > 0
                ? ` → ${cfg.partePorVariedade?.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} un./variedade (${cfg.variedades.length} partes)`
                : ""}
              {" · "}Demais linhas com mix: ×1,34
            </p>
          )}

          {isAdmin && (
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-semibold">Mix folha leve · referência</summary>
              <div className="mt-3 space-y-2">
                <Label className="text-xs">Produto referência (nome nos pedidos)</Label>
                <Input value={mixRef} onChange={(e) => setMixRef(e.target.value)} />
                <Label className="text-xs">Variedades do mix (1 por linha)</Label>
                <textarea
                  className="min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={mixVars}
                  onChange={(e) => setMixVars(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    onSalvarMixFolha({
                      referenciaProduto: mixRef.trim(),
                      variedades: mixVars.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
                    })
                  }
                >
                  Salvar mix folha
                </Button>
                <p className="text-xs text-muted-foreground">
                  Nas variedades listadas, com Mix marcado soma 1/N do total do referência. Demais produtos: Mix aplica +34% sobre a linha.
                </p>
              </div>
            </details>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Nec.</th>
                  <th className="px-3 py-2">U/K</th>
                  <th className="px-3 py-2" title="Modo unidade">Fat.</th>
                  <th className="px-3 py-2" title="Produtos por 1 kg">Rend.</th>
                  <th className="px-3 py-2">Mix</th>
                  <th className="px-3 py-2">Total</th>
                  {isAdmin ? <th className="px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhum pedido para este dia (ou todos desativados).
                    </td>
                  </tr>
                ) : (
                  linhas.map((row: any) => {
                    const pid = row.produto?.id ?? row.produtoId;
                    const oculto = row.oculto;
                    return (
                      <tr key={row.nome} className={`border-b ${oculto ? "opacity-50" : ""}`}>
                        <td className="px-3 py-2 font-medium">
                          {row.nome}
                          {row.inMixFolha ? (
                            <span className="ml-1 rounded bg-lime-500/15 px-1 text-[10px] text-lime-800 dark:text-lime-200">folha</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.quantidadePedido}</td>
                        <td className="px-3 py-2">
                          {isAdmin && pid ? (
                            <select
                              className="h-8 rounded-md border bg-background px-1 text-xs"
                              value={row.modoCompra === "kilo" ? "KG" : "UNIDADE"}
                              onChange={(e) => onUpdate({ produtoId: pid, modoCompra: e.target.value })}
                            >
                              <option value="UNIDADE">Un.</option>
                              <option value="KG">Kg</option>
                            </select>
                          ) : (
                            row.modoCompra === "kilo" ? "Kg" : "Un."
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.modoCompra === "kilo" ? (
                            "—"
                          ) : isAdmin && pid ? (
                            <Input
                              type="number"
                              min={0.01}
                              step={0.01}
                              className="h-8 w-20 text-xs"
                              defaultValue={row.fator ?? ""}
                              placeholder="1"
                              onBlur={(e) => {
                                const raw = e.target.value.trim();
                                onUpdate({
                                  produtoId: pid,
                                  fatorCompraUnidade: raw === "" ? null : Number(raw.replace(",", ".")),
                                });
                              }}
                            />
                          ) : (
                            row.fator ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.modoCompra === "unidade" ? (
                            "—"
                          ) : isAdmin && pid ? (
                            <Input
                              type="number"
                              min={0.01}
                              step={0.01}
                              className="h-8 w-20 text-xs"
                              defaultValue={row.rendimento > 0 ? row.rendimento : ""}
                              placeholder="8"
                              onBlur={(e) => {
                                const raw = e.target.value.trim();
                                onUpdate({
                                  produtoId: pid,
                                  rendimentoPorKg: raw === "" ? null : Number(raw.replace(",", ".")),
                                });
                              }}
                            />
                          ) : (
                            row.rendimento > 0 ? row.rendimento : "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin && pid ? (
                            <input
                              type="checkbox"
                              checked={row.mixAtivo}
                              onChange={(e) => onUpdate({ produtoId: pid, mixAtivo: e.target.checked })}
                            />
                          ) : row.mixAtivo ? "Sim" : "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold tabular-nums">
                          {row.comprarTexto}
                          {row.unidadesParaCompra !== row.quantidadePedido && (
                            <span className="ml-1 block text-[10px] font-normal text-muted-foreground">
                              pós-mix: {row.unidadesParaCompra.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
                            </span>
                          )}
                        </td>
                        {isAdmin && pid ? (
                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => onUpdate({ produtoId: pid, ocultoListaCompra: !oculto })}
                            >
                              {oculto ? <RefreshCcw className="h-3 w-3" /> : "−"}
                            </Button>
                          </td>
                        ) : isAdmin ? (
                          <td />
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {linhas.length > 0 && totais && (
                <tfoot>
                  <tr className="bg-muted/30 text-xs font-semibold">
                    <td className="px-3 py-2" colSpan={2}>
                      Totais pedidos: {totais.sumNec}
                    </td>
                    <td colSpan={4} />
                    <td className="px-3 py-2">
                      {totais.sumUn > 0 ? `${totais.sumUn} un.` : ""}
                      {totais.sumUn > 0 && totais.sumKg > 0 ? " · " : ""}
                      {totais.sumKg > 0 ? `${totais.sumKg.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg` : ""}
                    </td>
                    {isAdmin ? <td /> : null}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {desativados.length > 0 && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Desativados na lista</p>
              <ul className="flex flex-wrap gap-2">
                {desativados.map((nome: string) => {
                  const pid = produtoIdPorNome.get(nome);
                  return (
                    <li key={nome} className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
                      <span>{nome}</span>
                      {isAdmin && pid ? (
                        <button type="button" className="text-primary underline" onClick={() => onUpdate({ produtoId: pid, ocultoListaCompra: false })}>
                          Reativar
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false }: any) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Check({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
