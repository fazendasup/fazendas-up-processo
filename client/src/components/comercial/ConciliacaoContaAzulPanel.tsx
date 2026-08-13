import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Link2, RefreshCw, Unlink, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSyncContaAzul } from "@/hooks/useSyncContaAzul";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AcoesPedidoConciliacao,
  AjustarFreteConciliacaoDialog,
  EditarPedidoConciliacaoDialog,
} from "@/components/comercial/ConciliacaoResolucaoDialogs";

function labelStatusConciliacaoSemanal(status: string) {
  switch (status) {
    case "aguardando_venda":
      return "aguardando venda";
    case "venda_sem_pedido":
      return "venda sem pedido";
    case "divergente":
      return "divergente";
    default:
      return "ok";
  }
}

function detalheConciliacaoSemanal(c: any) {
  if (typeof c.detalhe === "string" && c.detalhe.trim()) return c.detalhe;
  if (c.status === "aguardando_venda") {
    return `Há mais pedidos operacionais (${c.operacional?.pedidos ?? 0}) do que vendas CA (${c.contaAzul?.pedidos ?? 0}). Aguarde/sincronize a venda ou confira se o pedido deve ser cancelado.`;
  }
  if (c.status === "venda_sem_pedido") {
    return `Há mais vendas CA (${c.contaAzul?.pedidos ?? 0}) do que pedidos operacionais (${c.operacional?.pedidos ?? 0}). Vincule a um pedido existente ou crie o operacional do mesmo dia.`;
  }
  const problemas: string[] = [];
  if ((c.diffPedidos ?? 0) !== 0) {
    problemas.push(`pedidos ${c.operacional?.pedidos ?? 0}/${c.contaAzul?.pedidos ?? 0}`);
  }
  if (Math.abs(Number(c.diffUnidades ?? 0)) > 0.001) {
    problemas.push(
      `quantidade ${Number(c.operacional?.unidades ?? 0).toLocaleString("pt-BR")}/${Number(c.contaAzul?.unidades ?? 0).toLocaleString("pt-BR")}`,
    );
  }
  if (Math.abs(Number(c.diffValor ?? 0)) > 0.05) {
    problemas.push(
      `valor ${fmtMoney(c.operacional?.valorEstimado ?? 0)}/${fmtMoney(c.contaAzul?.valorLiquido ?? 0)}`,
    );
  }
  if (problemas.length === 0) {
    return "Revise os vínculos e sincronize novamente.";
  }
  const acumula = Boolean(c.acumulaPedidos);
  const sufixoAcumulo = acumula
    ? " Este cliente acumula faturamento: o total da semana no Conta Azul costuma ser a venda consolidada do período, não o orçamento diário. Use «Vincular entregas» na venda/orçamento principal e selecione todas as entregas do intervalo."
    : " Compare apenas venda e pedido do mesmo dia.";
  return `Corrija ${problemas.join(", ")}.${sufixoAcumulo}`;
}

function vendaSemVinculoOperacional(v: {
  pedidosOperacionaisVinculo?: unknown[];
  statusConciliacao?: string | null;
}) {
  return (
    (v.pedidosOperacionaisVinculo?.length ?? 0) === 0 &&
    v.statusConciliacao !== "IGNORADA" &&
    v.statusConciliacao !== "VENDA_ERRADA"
  );
}

function fmtDate(v: string | Date) {
  return new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function fmtMoney(v: unknown) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDivergenciaValor(v: unknown) {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const data = v as { itens?: unknown; taxaEntrega?: unknown; total?: unknown };
    const partes = [];
    if (data.itens != null) partes.push(`itens ${fmtMoney(data.itens)}`);
    if (data.taxaEntrega != null && Number(data.taxaEntrega) > 0) {
      partes.push(`taxa/frete ${fmtMoney(data.taxaEntrega)}`);
    }
    if (data.total != null) partes.push(`total ${fmtMoney(data.total)}`);
    return partes.length > 0 ? partes.join(" + ") : JSON.stringify(v);
  }
  return typeof v === "number" || !Number.isNaN(Number(v)) ? fmtMoney(v) : String(v ?? "-");
}

function detalheDivergencia(d: any) {
  const campo = String(d?.campo ?? "");
  if (campo === "data") {
    return {
      titulo: "Data diferente",
      acao: `Corrija a data de entrega do pedido operacional (${d.operacional}) ou a data de execução/entrega da venda no Conta Azul (${d.contaAzul}).`,
      valores: `Operacional ${d.operacional} × Conta Azul/execução ${d.contaAzul}`,
    };
  }
  if (campo === "valor_estimado") {
    const opTotal =
      d.operacional && typeof d.operacional === "object" && !Array.isArray(d.operacional)
        ? Number((d.operacional as any).total ?? 0)
        : Number(d.operacional ?? 0);
    const caTotal = Number(d.contaAzul ?? 0);
    const diff = opTotal - caTotal;
    return {
      titulo: "Valor diferente",
      acao:
        "Verifique preço dos itens e frete. Se a diferença for entrega, preencha o valor em Regras do cliente > Valor taxa de entrega.",
      valores: `Operacional ${fmtDivergenciaValor(d.operacional)} × Conta Azul ${fmtMoney(d.contaAzul)} · diferença ${fmtMoney(diff)}`,
    };
  }
  if (campo.startsWith("item:")) {
    const produto = campo.replace(/^item:/, "").replace(/^(pid|nome):/, "") || "produto";
    return {
      titulo: `Quantidade diferente: ${produto}`,
      acao: "Ajuste a quantidade no pedido operacional ou corrija os itens da venda no Conta Azul e sincronize novamente.",
      valores: `Operacional ${Number(d.operacional ?? 0).toLocaleString("pt-BR")} un × Conta Azul ${Number(d.contaAzul ?? 0).toLocaleString("pt-BR")} un`,
    };
  }
  return {
    titulo: campo || "Divergência",
    acao: "Revise os dados do pedido operacional e da venda Conta Azul.",
    valores: `Operacional ${String(d.operacional)} × Conta Azul ${String(d.contaAzul)}`,
  };
}

function labelStatusConciliacao(status: string) {
  const map: Record<string, string> = {
    PLANEJADO: "planejado",
    VINCULO_SUGERIDO: "sugestão",
    CONCILIADO: "conciliado",
    DIVERGENTE: "divergente",
    VENDA_ERRADA: "venda errada",
    NAO_CONCILIADA: "sem vínculo",
    SUGERIDA: "sugestão",
    CONCILIADA: "conciliada",
    IGNORADA: "ignorada",
  };
  return map[status] ?? status.toLowerCase();
}

function tipoDocumentoContaAzul(status: string | null | undefined) {
  const s = String(status ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/orcament|orcamento|cotac|proposta/.test(s)) return "Orçamento";
  return "Venda";
}

const TIPOS_VENDA = [
  ["RECORRENTE_SEMANAL", "Recorrente Semanal"],
  ["RECORRENTE_QUINZENAL", "Recorrente Quinzenal"],
  ["PLANO", "Plano"],
  ["AVULSO", "Avulso"],
] as const;

type TipoVenda = (typeof TIPOS_VENDA)[number][0];

export function ConciliacaoContaAzulPanel({
  inicio,
  fim,
  clienteFoco,
  onLimparClienteFoco,
  diaFechamento,
  podeFecharSemConciliacao,
  rotuloSemanaFechamento,
  canEditarComercial = true,
}: {
  inicio: Date;
  fim: Date;
  clienteFoco?: string | null;
  onLimparClienteFoco?: () => void;
  /** Segunda-feira da semana a fechar (para «Fechar sem conciliar»). */
  diaFechamento?: Date;
  podeFecharSemConciliacao?: boolean;
  rotuloSemanaFechamento?: string;
  canEditarComercial?: boolean;
}) {
  const utils = trpc.useUtils();
  const { sync: syncContaAzul, busy: syncBusy } = useSyncContaAzul();
  const [vendaCandidatosId, setVendaCandidatosId] = useState<string | null>(null);
  const [pedidoEdit, setPedidoEdit] = useState<any | null>(null);
  const [freteClienteId, setFreteClienteId] = useState<string | null>(null);
  const painel = trpc.comercial.pedidos.conciliacaoPainel.useQuery({ inicio, fim });
  const candidatos = trpc.comercial.pedidos.conciliacaoCandidatosVenda.useQuery(
    { pedidoContaAzulId: vendaCandidatosId ?? "", janelaDias: 14 },
    { enabled: Boolean(vendaCandidatosId) },
  );

  const invalidarCachesConciliacao = () => {
    void utils.comercial.pedidos.conciliacaoPainel.invalidate();
    void utils.comercial.pedidos.agenda.invalidate(undefined, { refetchType: "all" });
    void utils.comercial.pedidos.dashboard.invalidate(undefined, {
      refetchType: "all",
    });
    void utils.comercial.pedidos.relatorioHistorico.invalidate();
    void utils.comercial.pedidos.statusSemana.invalidate();
    void utils.comercial.pedidos.compras.invalidate(undefined, { refetchType: "all" });
  };

  const confirmar = trpc.comercial.pedidos.conciliacaoConfirmarVinculo.useMutation({
    onSuccess: (r) => {
      setVendaCandidatosId(null);
      toast.success(
        r.divergencias?.length
          ? "Vínculo confirmado com divergências registradas."
          : "Vínculo confirmado com sucesso.",
      );
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const confirmarMultiplo = trpc.comercial.pedidos.conciliacaoConfirmarVinculoMultiplo.useMutation({
    onSuccess: (r) => {
      setVendaCandidatosId(null);
      toast.success(
        r.divergencias?.length
          ? `Vínculo com ${r.pedidosVinculados} pedido(s) confirmado — há divergências no total acumulado.`
          : `Vínculo com ${r.pedidosVinculados} pedido(s) confirmado sem divergências.`,
      );
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const marcarErrada = trpc.comercial.pedidos.conciliacaoMarcarVendaErrada.useMutation({
    onSuccess: () => {
      toast.success("Venda marcada como incorreta.");
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const ignorar = trpc.comercial.pedidos.conciliacaoIgnorarVenda.useMutation({
    onSuccess: () => {
      toast.message("Venda ignorada na conciliação.");
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const manterOp = trpc.comercial.pedidos.conciliacaoManterOperacional.useMutation({
    onSuccess: () => {
      toast.success("Pedido operacional mantido como referência.");
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const criarDeVenda = trpc.comercial.pedidos.conciliacaoCriarOperacionalDeVenda.useMutation({
    onSuccess: () => {
      toast.success("Pedido operacional criado a partir da venda.");
      invalidarCachesConciliacao();
      void utils.comercial.pedidos.conciliacaoProdutosFaltantesVenda.invalidate();
      void utils.comercial.pedidos.compras.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const importarProdutos = trpc.comercial.pedidos.importarProdutosContaAzul.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.importados} produto(s) ativado(s). Tente criar o pedido novamente.`);
      void utils.comercial.pedidos.conciliacaoProdutosFaltantesVenda.invalidate();
      void utils.comercial.pedidos.produtos.invalidate();
      void utils.comercial.pedidos.catalogoContaAzul.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const desvincular = trpc.comercial.pedidos.conciliacaoDesvincular.useMutation({
    onSuccess: () => {
      toast.success("Vínculo removido.");
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const aplicarCorrecao = trpc.comercial.pedidos.conciliacaoAplicarCorrecao.useMutation({
    onSuccess: (r) => {
      toast.success(
        r.conciliado
          ? "Correção aplicada. Pedido alinhado com a Conta Azul."
          : "Correção aplicada. Ainda há divergências para revisar.",
      );
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const aplicarCorrecaoAgregada = trpc.comercial.pedidos.conciliacaoAplicarCorrecaoAgregada.useMutation({
    onSuccess: (r) => {
      toast.success(
        r.conciliado
          ? `Correção agregada aplicada em ${r.pedidosCorrigidos} entrega(s).`
          : `Correção aplicada em ${r.pedidosCorrigidos} entrega(s). Ainda há divergências.`,
      );
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const cancelarPedido = trpc.comercial.pedidos.cancelarPedido.useMutation({
    onSuccess: () => {
      toast.success("Pedido cancelado.");
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const reativarPedidos = trpc.comercial.pedidos.reativarPedidosCancelados.useMutation({
    onSuccess: () => {
      toast.success("Pedido reativado.");
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const atualizarStatus = trpc.comercial.pedidos.atualizarStatusClienteDia.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.count} pedido(s) atualizado(s).`);
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });
  const fecharSemana = trpc.comercial.pedidos.fecharSemana.useMutation({
    onSuccess: () => {
      toast.success("Semana fechada.");
      invalidarCachesConciliacao();
    },
    onError: (e) => toast.error(e.message),
  });

  const solicitarAplicarCorrecaoAgregada = (
    pedidoOperacionalIds: string[],
    pedidoContaAzulId: string,
    campos?: string[],
  ) => {
    const ok = window.confirm(
      campos?.length
        ? "A Conta Azul será usada como referência e os itens serão redistribuídos entre as entregas vinculadas. Confirma?"
        : "Todas as divergências agregadas serão corrigidas com base na venda Conta Azul, redistribuindo itens entre as entregas. Confirma?",
    );
    if (!ok) return;
    aplicarCorrecaoAgregada.mutate({ pedidoOperacionalIds, pedidoContaAzulId, campos });
  };

  function marcarEntregue(pedido: any) {
    atualizarStatus.mutate({
      contaAzulCustomerId: pedido.contaAzulCustomerId,
      dia: new Date(pedido.dataEntrega),
      status: "ENTREGUE",
      statusAtual: pedido.status,
    });
  }

  function cancelarPedidoOp(pedido: any) {
    const nome = pedido.cliente?.nome ?? pedido.contaAzulCustomerId;
    if (!window.confirm(`Cancelar o pedido de ${nome}?`)) return;
    cancelarPedido.mutate({ pedidoId: pedido.id });
  }

  function reativarPedidoOp(pedido: any) {
    if (!window.confirm("Reativar este pedido cancelado?")) return;
    reativarPedidos.mutate({ pedidoIds: [pedido.id] });
  }

  function fecharSemConciliacao() {
    if (!diaFechamento) return;
    const rotulo = rotuloSemanaFechamento ?? "semana pendente";
    if (
      !window.confirm(
        `Fechar a semana de ${rotulo} mesmo com divergências na conciliação?\n\nUse se os pedidos operacionais já foram revisados.`,
      )
    ) {
      return;
    }
    fecharSemana.mutate({ dia: diaFechamento, ignorarConciliacao: true });
  }

  const solicitarAplicarCorrecao = (
    pedidoOperacionalId: string,
    pedidoContaAzulId: string,
    campos?: string[],
    mensagem?: string,
  ) => {
    const texto =
      mensagem ??
      (campos?.length
        ? "A Conta Azul será usada como referência para esta divergência. O pedido operacional será atualizado em todo o sistema."
        : "Todas as divergências serão corrigidas no pedido operacional com base na venda Conta Azul. Confirma?");
    if (!window.confirm(texto)) return;
    aplicarCorrecao.mutate({ pedidoOperacionalId, pedidoContaAzulId, campos });
  };

  const resumo = painel.data?.resumo;
  const alertas = useMemo(() => {
    const d = painel.data;
    if (!d) return 0;
    return (
      (d.divergentes?.length ?? 0) +
      (d.sugestoes?.length ?? 0) +
      (d.vendasSemPedido?.length ?? 0) +
      (d.clientesSemana?.length ?? 0)
    );
  }, [painel.data]);

  const clientesSemanaExibidos = useMemo(() => {
    const lista = painel.data?.clientesSemana ?? [];
    if (!clienteFoco) return lista;
    const foco = lista.filter((c: any) => c.contaAzulCustomerId === clienteFoco);
    return foco.length > 0 ? foco : lista;
  }, [painel.data?.clientesSemana, clienteFoco]);

  if (painel.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando conciliação Conta Azul...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/20 dark:text-cyan-100">
          <strong>Hub de conciliação:</strong> vincule, corrija quantidades/preços, ajuste frete, marque entregue/cancelado e feche a semana — tudo nesta aba, sem ir ao dia na emissão.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={syncBusy}
            onClick={() => syncContaAzul.mutate()}
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncBusy ? "animate-spin" : ""}`} />
            {syncBusy ? "Sincronizando..." : "Sync Conta Azul"}
          </Button>
          {canEditarComercial && podeFecharSemConciliacao && diaFechamento ? (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400"
              disabled={fecharSemana.isPending}
              onClick={fecharSemConciliacao}
            >
              {fecharSemana.isPending
                ? "Fechando..."
                : `Fechar sem conciliar (${rotuloSemanaFechamento ?? "semana"})`}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <ResumoCard label="Sem venda CA" value={resumo?.semVenda ?? 0} />
        <ResumoCard label="Docs. CA sem pedido" value={resumo?.vendasSemPedido ?? 0} />
        <ResumoCard label="Sugestões" value={resumo?.sugestoes ?? 0} highlight={Boolean(resumo?.sugestoes)} />
        <ResumoCard label="Conciliados" value={resumo?.conciliados ?? 0} ok />
        <ResumoCard label="Divergentes (vínculo)" value={resumo?.divergentes ?? 0} alert={Boolean(resumo?.divergentes)} />
        <ResumoCard
          label="Semana pendente"
          value={resumo?.clientesSemanaPendentes ?? 0}
          alert={Boolean(resumo?.clientesSemanaPendentes)}
        />
      </div>

      {(clientesSemanaExibidos.length > 0 || painel.data?.semana) && (
        <Section
          title={`Conciliação semanal${painel.data?.semana?.rotulo ? ` (${painel.data.semana.rotulo})` : ""}`}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        >
          {clienteFoco && onLimparClienteFoco ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Filtrando cliente do dashboard.</span>
              <Button size="sm" variant="outline" className="h-7" onClick={onLimparClienteFoco}>
                Ver todos
              </Button>
            </div>
          ) : null}
          <p className="mb-3 text-xs text-muted-foreground">
            Sem acúmulo: compara e lista só o mesmo dia (UTC) — dia conciliado não entra no card de outro dia com pendência.
            Clientes com acúmulo (Licco/Spoleto/…) usam o total da semana. Mostra a{" "}
            <strong>semana passada</strong> (a que precisa ser fechada), não semanas anteriores acumuladas.
          </p>
          {clientesSemanaExibidos.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Nenhum cliente pendente nesta semana para o filtro atual.
            </p>
          ) : (
            clientesSemanaExibidos.map((c: any) => (
              <Card
                key={c.contaAzulCustomerId}
                className={`border-amber-200/80 ${clienteFoco === c.contaAzulCustomerId ? "ring-2 ring-amber-400" : ""}`}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelStatusConciliacaoSemanal(c.status)}
                        {" · pedidos "}
                        {c.operacional?.pedidos ?? 0}/{c.contaAzul?.pedidos ?? 0}
                        {" · un "}
                        {Number(c.operacional?.unidades ?? 0).toLocaleString("pt-BR")}/
                        {Number(c.contaAzul?.unidades ?? 0).toLocaleString("pt-BR")}
                        {" · valor "}
                        {fmtMoney(c.operacional?.valorEstimado ?? 0)}/{fmtMoney(c.contaAzul?.valorLiquido ?? 0)}
                      </p>
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                        {detalheConciliacaoSemanal(c)}
                      </p>
                    </div>
                  </div>
                  {(c.operacionais?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pedidos operacionais
                        {c.status === "venda_sem_pedido" ? " vinculados (outra data?)" : " da semana"}
                      </p>
                      {c.operacionais.map((op: any) => (
                        <div key={op.id} className="rounded-lg border bg-muted/10 p-3">
                          <BlocoPedido titulo={`Entrega ${fmtDate(op.dataEntrega)}`} pedido={op} />
                          {canEditarComercial ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <AcoesPedidoConciliacao
                                pedido={op}
                                disabled={
                                  cancelarPedido.isPending ||
                                  reativarPedidos.isPending ||
                                  atualizarStatus.isPending
                                }
                                onEditar={() => setPedidoEdit(op)}
                                onMarcarEntregue={() => marcarEntregue(op)}
                                onCancelar={() => cancelarPedidoOp(op)}
                                onReativar={() => reativarPedidoOp(op)}
                              />
                              {op.pedidoContaAzulId ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={desvincular.isPending}
                                  onClick={() => desvincular.mutate({ pedidoOperacionalId: op.id })}
                                >
                                  <Unlink className="mr-1 h-3 w-3" /> Desvincular
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                  {(c.vendas?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Documentos Conta Azul da semana
                        {c.acumulaPedidos ? " (orçamentos + vendas)" : ""}
                      </p>
                      {c.vendas.map((v: any) => {
                        const semVinculo = vendaSemVinculoOperacional(v);
                        const tipo = tipoDocumentoContaAzul(v.statusPedido);
                        const precisaCriar =
                          c.status === "venda_sem_pedido" || c.status === "aguardando_venda";
                        const vinculados = (v.pedidosOperacionaisVinculo ?? []) as Array<{
                          id: string;
                          dataEntrega?: string | Date;
                        }>;
                        return (
                          <div
                            key={v.id}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-muted/10 p-3"
                          >
                            <div className="min-w-0 flex-1 space-y-2">
                              <BlocoVenda
                                titulo={tipo}
                                venda={v}
                                acumulaPedidos={Boolean(c.acumulaPedidos)}
                              />
                              {!semVinculo && precisaCriar && canEditarComercial ? (
                                <p className="text-xs text-amber-800 dark:text-amber-200">
                                  Esta venda está vinculada a entrega de outra data. Desvincule para criar o
                                  operacional do dia da venda, ou corrija o vínculo.
                                </p>
                              ) : null}
                            </div>
                            {semVinculo && canEditarComercial ? (
                              <AcoesVendaSemVinculo
                                vendaId={v.id}
                                criarDeVenda={criarDeVenda}
                                ignorar={ignorar}
                                marcarErrada={marcarErrada}
                                vendaCandidatosId={vendaCandidatosId}
                                setVendaCandidatosId={setVendaCandidatosId}
                              />
                            ) : semVinculo ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setVendaCandidatosId((atual) => (atual === v.id ? null : v.id))
                                }
                              >
                                Vincular entregas
                              </Button>
                            ) : canEditarComercial && (precisaCriar || vinculados.length > 0) ? (
                              <div className="flex flex-wrap gap-2">
                                {vinculados.map((op) => (
                                  <Button
                                    key={op.id}
                                    size="sm"
                                    variant="outline"
                                    disabled={desvincular.isPending}
                                    onClick={() => desvincular.mutate({ pedidoOperacionalId: op.id })}
                                  >
                                    <Unlink className="mr-1 h-3 w-3" />
                                    Desvincular
                                    {op.dataEntrega ? ` ${fmtDate(op.dataEntrega)}` : ""}
                                  </Button>
                                ))}
                                {precisaCriar ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setVendaCandidatosId((atual) => (atual === v.id ? null : v.id))
                                    }
                                  >
                                    Vincular entregas
                                  </Button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {vendaCandidatosId &&
                    (c.vendas ?? []).some((v: any) => v.id === vendaCandidatosId) && (
                      <CandidatosVenda
                        isLoading={candidatos.isLoading}
                        candidatos={candidatos.data?.candidatos ?? []}
                        vendaId={vendaCandidatosId}
                        acumulaPedidos={Boolean(candidatos.data?.acumulaPedidos ?? c.acumulaPedidos)}
                        diasAcumulo={candidatos.data?.diasAcumulo ?? c.diasAcumulo ?? null}
                        selecionadosPadrao={candidatos.data?.selecionadosPadrao ?? []}
                        divergenciasAgregadas={candidatos.data?.divergenciasAgregadas ?? []}
                        vendaItens={candidatos.data?.venda?.itens ?? []}
                        confirmando={confirmar.isPending || confirmarMultiplo.isPending}
                        onConfirmar={(pedidoOperacionalId) =>
                          confirmar.mutate({
                            pedidoOperacionalId,
                            pedidoContaAzulId: vendaCandidatosId,
                            observacoes: "Vínculo manual a partir da conciliação semanal.",
                          })
                        }
                        onConfirmarMultiplo={(pedidoOperacionalIds) =>
                          confirmarMultiplo.mutate({
                            pedidoOperacionalIds,
                            pedidoContaAzulId: vendaCandidatosId,
                            observacoes: "Vínculo múltiplo — faturamento acumulado (conciliação semanal).",
                          })
                        }
                      />
                    )}
                  {c.acumulaPedidos &&
                    (c.vendas ?? []).some(
                      (v: any) => tipoDocumentoContaAzul(v.statusPedido) === "Orçamento"
                    ) &&
                    (c.vendas ?? []).some(
                      (v: any) => tipoDocumentoContaAzul(v.statusPedido) === "Venda"
                    ) && (
                      <p className="text-xs text-muted-foreground">
                        Cliente acumulador: os orçamentos diários podem coexistir com a venda
                        consolidada (ex.: 3 orçamentos + venda total). No fechamento, só a{" "}
                        <strong>venda faturada</strong> entra no total — compare a soma das
                        entregas operacionais com ela.
                      </p>
                    )}
                  {c.status === "divergente" && c.acumulaPedidos && (c.vendas?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      O resumo 7/28 compara entregas operacionais desta semana com a{" "}
                      <strong>venda faturada</strong> no Conta Azul (orçamentos diários não entram no total).
                      Os vínculos com orçamentos intermediários não impedem o fechamento — basta a soma
                      das entregas bater com a venda consolidada.
                    </p>
                  )}
                  {canEditarComercial && c.status === "divergente" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFreteClienteId(c.contaAzulCustomerId)}
                    >
                      Ajustar taxa de entrega
                    </Button>
                  ) : null}
                  {c.acumulaPedidos &&
                    !(c.vendas ?? []).some(
                      (v: any) => tipoDocumentoContaAzul(v.statusPedido) === "Venda"
                    ) &&
                    (c.vendas?.length ?? 0) > 0 && (
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        Ainda não há venda faturada nesta semana — só orçamentos diários. O fechamento
                        aguarda a venda consolidada do período ou «Fechar sem conciliar».
                      </p>
                    )}
                </CardContent>
              </Card>
            ))
          )}
        </Section>
      )}

      {alertas > 0 && (
        <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          {alertas} item(ns) precisam de revisão neste período.
        </p>
      )}

      {(painel.data?.sugestoes ?? []).length > 0 && (
        <Section title="Sugestões de vínculo" icon={<Link2 className="h-4 w-4" />}>
          <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3 text-xs text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/20 dark:text-cyan-100">
            <p className="font-semibold">Como decidir rápido:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>
                A sugestão automática só deve aparecer quando o pedido operacional e a venda Conta Azul forem do <strong>mesmo dia</strong>.
                Se a data for diferente, trate como registros separados ou corrija a data antes de vincular.
              </li>
              <li>
                <strong>Confirmar vínculo</strong> — junta os dois registros. O <strong>valor que vale para faturamento é o da Conta Azul</strong>;
                o pedido operacional continua valendo para produção/colheita.
              </li>
              <li>
                Clientes com <strong>faturamento acumulado</strong> recebem entregas diárias, mas a venda/orçamento no Conta Azul
                traz o volume do período. Selecione <strong>todos os pedidos operacionais do período</strong> para comparar a soma com o faturamento e apontar divergências reais.
              </li>
              <li>
                <strong>Manter operacional</strong> — o pedido operacional está certo e essa venda não é dele.
              </li>
              <li>
                <strong>Venda CA errada</strong> — a venda foi lançada errada na Conta Azul (corrigir lá e sincronizar).
              </li>
            </ul>
          </div>
          {painel.data!.sugestoes.map((s: any) => (
            <Card key={`${s.operacional.id}-${s.venda.id}`} className="border-amber-200/80">
              <CardContent className="space-y-3 p-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <BlocoPedido titulo="Pedido operacional" pedido={s.operacional} />
                  <BlocoVenda titulo="Venda Conta Azul" venda={s.venda} />
                </div>
                {s.divergencias?.length > 0 && (
                  <DivergenciasLista
                    divergencias={s.divergencias}
                    pedidoOperacionalId={s.operacional.id}
                    pedidoContaAzulId={s.venda.id}
                    aplicando={aplicarCorrecao.isPending}
                    onAplicarCorrecao={solicitarAplicarCorrecao}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={confirmar.isPending}
                    onClick={() =>
                      confirmar.mutate({
                        pedidoOperacionalId: s.operacional.id,
                        pedidoContaAzulId: s.venda.id,
                      })
                    }
                  >
                    Confirmar vínculo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setVendaCandidatosId((atual) => (atual === s.venda.id ? null : s.venda.id))}
                  >
                    Escolher outro pedido
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={manterOp.isPending}
                    onClick={() => manterOp.mutate({ pedidoOperacionalId: s.operacional.id })}
                  >
                    Manter operacional
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={marcarErrada.isPending}
                    onClick={() =>
                      marcarErrada.mutate({
                        pedidoContaAzulId: s.venda.id,
                        pedidoOperacionalId: s.operacional.id,
                      })
                    }
                  >
                    Venda CA errada
                  </Button>
                </div>
                {vendaCandidatosId === s.venda.id && (
                  <CandidatosVenda
                    isLoading={candidatos.isLoading}
                    candidatos={candidatos.data?.candidatos ?? []}
                    vendaId={s.venda.id}
                    acumulaPedidos={Boolean(candidatos.data?.acumulaPedidos)}
                    diasAcumulo={candidatos.data?.diasAcumulo ?? null}
                    selecionadosPadrao={candidatos.data?.selecionadosPadrao ?? []}
                    divergenciasAgregadas={candidatos.data?.divergenciasAgregadas ?? []}
                    vendaItens={candidatos.data?.venda?.itens ?? []}
                    suggestedId={s.operacional.id}
                    confirmando={confirmar.isPending || confirmarMultiplo.isPending}
                    onConfirmar={(pedidoOperacionalId) =>
                      confirmar.mutate({
                        pedidoOperacionalId,
                        pedidoContaAzulId: s.venda.id,
                        observacoes:
                          pedidoOperacionalId === s.operacional.id
                            ? undefined
                            : "Operador selecionou manualmente outro pedido operacional para esta venda.",
                      })
                    }
                    onConfirmarMultiplo={(pedidoOperacionalIds) =>
                      confirmarMultiplo.mutate({
                        pedidoOperacionalIds,
                        pedidoContaAzulId: s.venda.id,
                        observacoes: "Vínculo múltiplo — faturamento acumulado.",
                      })
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </Section>
      )}

      {(painel.data?.divergentes ?? []).length > 0 && (
        <Section title="Divergências após conciliação ou alteração no Conta Azul" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}>
          {painel.data!.divergentes.map((item: any) =>
            item.agregado ? (
              <Card key={item.pedidoContaAzulId} className="border-amber-300 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10">
                <CardContent className="space-y-2 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    Faturamento acumulado — {item.operacionais?.length ?? 0} entrega(s) operacionais
                  </p>
                  {item.pedidoContaAzul && (
                    <BlocoVenda titulo="Venda Conta Azul (período)" venda={item.pedidoContaAzul} acumulaPedidos />
                  )}
                  <div className="space-y-2">
                    {(item.operacionais ?? []).map((op: any) => (
                      <div key={op.id} className="rounded-lg border bg-background/60 p-2">
                        <BlocoPedido titulo={`Entrega ${fmtDate(op.dataEntrega)}`} pedido={op} />
                        {canEditarComercial ? (
                          <AcoesPedidoConciliacao
                            pedido={op}
                            onEditar={() => setPedidoEdit(op)}
                            onMarcarEntregue={() => marcarEntregue(op)}
                            onCancelar={() => cancelarPedidoOp(op)}
                            onReativar={() => reativarPedidoOp(op)}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <DivergenciasLista
                    divergencias={item.divergencias ?? []}
                    pedidoContaAzulId={item.pedidoContaAzulId}
                    aplicando={aplicarCorrecaoAgregada.isPending}
                    onAplicarCorrecaoAgregada={
                      canEditarComercial
                        ? (campos) =>
                            solicitarAplicarCorrecaoAgregada(
                              (item.operacionais ?? []).map((op: any) => op.id),
                              item.pedidoContaAzulId,
                              campos,
                            )
                        : undefined
                    }
                    onAjustarFrete={
                      canEditarComercial && item.operacionais?.[0]?.contaAzulCustomerId
                        ? () => setFreteClienteId(item.operacionais[0].contaAzulCustomerId)
                        : undefined
                    }
                  />
                  {canEditarComercial ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={aplicarCorrecaoAgregada.isPending}
                        onClick={() =>
                          solicitarAplicarCorrecaoAgregada(
                            (item.operacionais ?? []).map((op: any) => op.id),
                            item.pedidoContaAzulId,
                          )
                        }
                      >
                        Aplicar todas da Conta Azul (agregado)
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={marcarErrada.isPending}
                        onClick={() => {
                          if (!window.confirm("Marcar esta venda CA como incorreta?")) return;
                          marcarErrada.mutate({ pedidoContaAzulId: item.pedidoContaAzulId });
                        }}
                      >
                        Venda CA errada
                      </Button>
                      {(item.operacionais ?? []).map((op: any) => (
                        <Button
                          key={op.id}
                          size="sm"
                          variant="ghost"
                          disabled={desvincular.isPending}
                          onClick={() => desvincular.mutate({ pedidoOperacionalId: op.id })}
                        >
                          Desvincular {fmtDate(op.dataEntrega)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card key={item.id} className="border-amber-300 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10">
                <CardContent className="space-y-2 p-4">
                  <BlocoPedido titulo="Pedido operacional (referência)" pedido={item} />
                  {item.pedidoContaAzul && <BlocoVenda titulo="Venda Conta Azul atual" venda={item.pedidoContaAzul} />}
                  <DivergenciasLista
                    divergencias={item.divergencias ?? []}
                    pedidoOperacionalId={item.id}
                    pedidoContaAzulId={item.pedidoContaAzulId ?? item.pedidoContaAzul?.id}
                    aplicando={aplicarCorrecao.isPending}
                    onAplicarCorrecao={solicitarAplicarCorrecao}
                    onAjustarFrete={
                      canEditarComercial
                        ? () => setFreteClienteId(item.contaAzulCustomerId)
                        : undefined
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {canEditarComercial ? (
                      <>
                        <AcoesPedidoConciliacao
                          pedido={item}
                          onEditar={() => setPedidoEdit(item)}
                          onMarcarEntregue={() => marcarEntregue(item)}
                          onCancelar={() => cancelarPedidoOp(item)}
                          onReativar={() => reativarPedidoOp(item)}
                        />
                        <Button size="sm" variant="outline" disabled={manterOp.isPending} onClick={() => manterOp.mutate({ pedidoOperacionalId: item.id })}>
                          Manter operacional como verdade
                        </Button>
                        {item.pedidoContaAzulId ? (
                          <>
                            <Button size="sm" variant="ghost" disabled={desvincular.isPending} onClick={() => desvincular.mutate({ pedidoOperacionalId: item.id })}>
                              <Unlink className="mr-1 h-3 w-3" /> Desvincular
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={marcarErrada.isPending}
                              onClick={() => {
                                if (!window.confirm("Marcar venda CA como incorreta?")) return;
                                marcarErrada.mutate({
                                  pedidoContaAzulId: item.pedidoContaAzulId,
                                  pedidoOperacionalId: item.id,
                                });
                              }}
                            >
                              Venda CA errada
                            </Button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </Section>
      )}

      {(painel.data?.vendasSemPedido ?? []).length > 0 && (
        <Section title="Vendas/orçamentos Conta Azul sem pedido operacional" icon={<XCircle className="h-4 w-4" />}>
          {painel.data!.vendasSemPedido.map((v: any) => (
            <VendaSemPedidoCard
              key={v.id}
              venda={v}
              criarDeVenda={criarDeVenda}
              ignorar={ignorar}
              marcarErrada={marcarErrada}
              importarProdutos={importarProdutos}
              vendaCandidatosId={vendaCandidatosId}
              setVendaCandidatosId={setVendaCandidatosId}
              candidatos={candidatos}
              confirmando={confirmar.isPending || confirmarMultiplo.isPending}
              onConfirmarVinculo={(pedidoOperacionalId) =>
                confirmar.mutate({
                  pedidoOperacionalId,
                  pedidoContaAzulId: v.id,
                  observacoes: "Operador vinculou manualmente uma venda sem pedido sugerido.",
                })
              }
              onConfirmarVinculoMultiplo={(pedidoOperacionalIds) =>
                confirmarMultiplo.mutate({
                  pedidoOperacionalIds,
                  pedidoContaAzulId: v.id,
                  observacoes: "Vínculo múltiplo — faturamento acumulado.",
                })
              }
            />
          ))}
        </Section>
      )}

      {(painel.data?.semVenda ?? []).length > 0 && (
        <Section title="Pedidos operacionais ainda sem venda no Conta Azul" icon={<CheckCircle2 className="h-4 w-4" />}>
          <div className="grid gap-2 lg:grid-cols-2">
            {painel.data!.semVenda.map((op: any) => (
              <Card key={op.id}>
                <CardContent className="p-3">
                  <BlocoPedido titulo="Aguardando venda" pedido={op} compact />
                  {canEditarComercial ? (
                    <AcoesPedidoConciliacao
                      pedido={op}
                      onEditar={() => setPedidoEdit(op)}
                      onMarcarEntregue={() => marcarEntregue(op)}
                      onCancelar={() => cancelarPedidoOp(op)}
                      onReativar={() => reativarPedidoOp(op)}
                    />
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <EditarPedidoConciliacaoDialog
        pedido={pedidoEdit}
        open={Boolean(pedidoEdit)}
        onOpenChange={(open) => {
          if (!open) setPedidoEdit(null);
        }}
        onSalvo={invalidarCachesConciliacao}
      />
      <AjustarFreteConciliacaoDialog
        contaAzulCustomerId={freteClienteId}
        open={Boolean(freteClienteId)}
        onOpenChange={(open) => {
          if (!open) setFreteClienteId(null);
        }}
        onSalvo={invalidarCachesConciliacao}
      />

      {(painel.data?.eventos ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Histórico de conciliação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {painel.data!.eventos.slice(0, 8).map((ev: any) => (
              <div key={ev.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <p className="font-semibold">{ev.tipo.replace(/_/g, " ").toLowerCase()}</p>
                <p className="text-muted-foreground">
                  {ev.usuarioNome ? `${ev.usuarioNome} · ` : ""}
                  {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                </p>
                {ev.observacoes ? <p>{ev.observacoes}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResumoCard({
  label,
  value,
  alert,
  ok,
  highlight,
}: {
  label: string;
  value: number;
  alert?: boolean;
  ok?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        alert ? "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20" : ok ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20" : highlight ? "border-cyan-200 bg-cyan-50/40" : "bg-card/80"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold">{icon}{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BlocoPedido({ titulo, pedido, compact }: { titulo: string; pedido: any; compact?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="font-semibold">{pedido.cliente?.nome ?? pedido.contaAzulCustomerId}</p>
      <p className="text-xs text-muted-foreground">
        {fmtDate(pedido.dataEntrega)} · {labelStatusConciliacao(pedido.statusConciliacao ?? "PLANEJADO")}
        {pedido.pedidoContaAzul?.numeroVenda ? ` · venda nº ${pedido.pedidoContaAzul.numeroVenda}` : ""}
      </p>
      {!compact && (
        <ul className="mt-1 text-xs text-muted-foreground">
          {(pedido.itens ?? []).slice(0, 4).map((i: any) => (
            <li key={i.id ?? i.produtoNome}>{i.produtoNome}: {Number(i.quantidade)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BlocoVenda({
  titulo,
  venda,
  acumulaPedidos = false,
}: {
  titulo: string;
  venda: any;
  acumulaPedidos?: boolean;
}) {
  const tipo = tipoDocumentoContaAzul(venda.statusPedido);
  const ehOrcamento = tipo === "Orçamento";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="font-semibold">{venda.cliente?.nome ?? "Cliente"}</p>
      <p className="text-xs text-muted-foreground">
        {tipo} · {fmtDate(venda.dataPedido)} · {venda.numeroVenda ? `nº ${venda.numeroVenda}` : venda.externalId?.slice(0, 8)}
        {" · "}{fmtMoney(venda.valorLiquido ?? venda.valorTotal)}
        {" · "}{labelStatusConciliacao(venda.statusConciliacao ?? "NAO_CONCILIADA")}
      </p>
      {acumulaPedidos && (
        <p
          className={`mt-0.5 text-[11px] ${
            ehOrcamento
              ? "text-muted-foreground"
              : "font-medium text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {ehOrcamento
            ? "Controle diário — não entra no total do fechamento"
            : "Documento usado no fechamento semanal"}
        </p>
      )}
      <ul className="mt-1 text-xs text-muted-foreground">
        {(venda.itens ?? []).slice(0, 4).map((i: any) => (
          <li key={i.id ?? i.produto}>{i.produto}: {Number(i.quantidade)}</li>
        ))}
      </ul>
    </div>
  );
}

function CandidatosVenda({
  isLoading,
  candidatos,
  suggestedId,
  acumulaPedidos = false,
  diasAcumulo,
  selecionadosPadrao = [],
  divergenciasAgregadas = [],
  confirmando = false,
  vendaItens = [],
  onConfirmar,
  onConfirmarMultiplo,
}: {
  isLoading: boolean;
  candidatos: any[];
  vendaId: string;
  suggestedId?: string;
  acumulaPedidos?: boolean;
  diasAcumulo?: number | null;
  selecionadosPadrao?: string[];
  divergenciasAgregadas?: any[];
  confirmando?: boolean;
  vendaItens?: Array<{ produto: string; quantidade: unknown }>;
  onConfirmar: (pedidoOperacionalId: string) => void;
  onConfirmarMultiplo?: (pedidoOperacionalIds: string[]) => void;
}) {
  const [selecionados, setSelecionados] = useState<string[]>(selecionadosPadrao);

  useEffect(() => {
    setSelecionados(selecionadosPadrao);
  }, [selecionadosPadrao.join(",")]);

  const divergenciasPreview = useMemo(() => {
    if (!acumulaPedidos || selecionados.length === 0) return divergenciasAgregadas;
    const itensAgregados = new Map<string, number>();
    for (const id of selecionados) {
      const c = candidatos.find((x) => x.pedido.id === id);
      if (!c) continue;
      for (const item of c.pedido.itens ?? []) {
        const nome = item.produtoNome ?? "?";
        itensAgregados.set(nome, (itensAgregados.get(nome) ?? 0) + Number(item.quantidade ?? 0));
      }
    }
    const mapCa = new Map<string, number>();
    for (const item of vendaItens) {
      const nome = String(item.produto ?? "?");
      mapCa.set(nome, (mapCa.get(nome) ?? 0) + Number(item.quantidade ?? 0));
    }
    const nomes = new Set([...Array.from(itensAgregados.keys()), ...Array.from(mapCa.keys())]);
    const divs: Array<{ campo: string; operacional: number; contaAzul: number }> = [];
    for (const nome of Array.from(nomes)) {
      const qOp = itensAgregados.get(nome) ?? 0;
      const qCa = mapCa.get(nome) ?? 0;
      if (Math.abs(qOp - qCa) > 0.001) {
        divs.push({ campo: `item:${nome}`, operacional: qOp, contaAzul: qCa });
      }
    }
    return divs;
  }, [acumulaPedidos, selecionados, divergenciasAgregadas, vendaItens, candidatos]);

  if (isLoading) {
    return <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Buscando pedidos possíveis...</p>;
  }

  if (candidatos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Nenhum pedido operacional do mesmo cliente foi encontrado na janela do período.
      </p>
    );
  }

  const toggleSelecionado = (id: string, bloqueado: boolean) => {
    if (bloqueado) return;
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  };

  const itensAgregados = new Map<string, number>();
  for (const id of selecionados) {
    const c = candidatos.find((x) => x.pedido.id === id);
    if (!c) continue;
    for (const item of c.pedido.itens ?? []) {
      const nome = item.produtoNome ?? "?";
      itensAgregados.set(nome, (itensAgregados.get(nome) ?? 0) + Number(item.quantidade ?? 0));
    }
  }

  if (acumulaPedidos && onConfirmarMultiplo) {
    return (
      <div className="rounded-xl border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Faturamento acumulado — selecione as entregas do período ({diasAcumulo ?? "?"} dias)
        </p>
        <div className="space-y-2">
          {candidatos.map((c) => {
          const pedido = c.pedido;
          const bloqueado = Boolean(
            c.vinculadoOutraVenda || (pedido.pedidoContaAzulId && !c.vinculadoNestaVenda),
          );
          const marcado = selecionados.includes(pedido.id);
          return (
            <label
              key={pedido.id}
              className={`flex cursor-pointer flex-wrap items-start justify-between gap-3 rounded-lg border bg-background/80 p-3 ${marcado ? "border-cyan-400/80" : ""} ${bloqueado ? "opacity-60" : ""}`}
            >
                <div className="flex min-w-0 gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={marcado}
                    disabled={bloqueado}
                    onChange={() => toggleSelecionado(pedido.id, bloqueado)}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {pedido.cliente?.nome ?? pedido.contaAzulCustomerId}
                      {pedido.id === suggestedId ? (
                        <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] text-cyan-800">sugestão automática</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(pedido.dataEntrega)} · {labelStatusConciliacao(pedido.statusConciliacao ?? "PLANEJADO")}
                      {pedido.pedidoContaAzul?.numeroVenda
                        ? c.vinculadoOutraVenda
                          ? ` · vinculado à venda nº ${pedido.pedidoContaAzul.numeroVenda} (desvincule antes)`
                          : ` · já vinculado à venda nº ${pedido.pedidoContaAzul.numeroVenda}`
                        : ""}
                    </p>
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {(pedido.itens ?? []).slice(0, 5).map((i: any) => (
                        <li key={i.id ?? i.produtoNome}>
                          {i.produtoNome}: {Number(i.quantidade)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {selecionados.length > 0 && (
          <div className="mt-3 rounded-lg border bg-background/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total operacional ({selecionados.length} entrega(s))
            </p>
            <ul className="mt-1 text-xs text-muted-foreground">
              {Array.from(itensAgregados.entries()).slice(0, 8).map(([nome, qtd]) => (
                <li key={nome}>{nome}: {qtd.toLocaleString("pt-BR")}</li>
              ))}
            </ul>
            {divergenciasPreview.length > 0 ? (
              <div className="mt-2">
                <DivergenciasLista divergencias={divergenciasPreview} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-200">
                Soma operacional compatível com a venda Conta Azul.
              </p>
            )}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={confirmando || selecionados.length === 0}
            onClick={() => onConfirmarMultiplo(selecionados)}
          >
            Confirmar vínculo com {selecionados.length} pedido(s)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Escolha manualmente o pedido correto
      </p>
      <div className="space-y-2">
        {candidatos.map((c) => {
          const pedido = c.pedido;
          const bloqueado = Boolean(
            c.vinculadoOutraVenda || (pedido.pedidoContaAzulId && !c.vinculadoNestaVenda),
          );
          return (
            <div key={pedido.id} className="rounded-lg border bg-background/80 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {pedido.cliente?.nome ?? pedido.contaAzulCustomerId}
                    {pedido.id === suggestedId ? <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] text-cyan-800">sugestão automática</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(pedido.dataEntrega)} · score {c.score} · {c.diasDistancia} dia(s) de distância · {labelStatusConciliacao(pedido.statusConciliacao ?? "PLANEJADO")}
                    {pedido.pedidoContaAzul?.numeroVenda ? ` · já vinculado à venda nº ${pedido.pedidoContaAzul.numeroVenda}` : ""}
                  </p>
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {(pedido.itens ?? []).slice(0, 5).map((i: any) => (
                      <li key={i.id ?? i.produtoNome}>
                        {i.produtoNome}: {Number(i.quantidade)}
                      </li>
                    ))}
                  </ul>
                  {c.divergencias?.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">
                      {c.divergencias.length} divergência(s) se este vínculo for confirmado.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-200">Sem divergências relevantes.</p>
                  )}
                </div>
                <Button size="sm" disabled={bloqueado || confirmando} onClick={() => onConfirmar(pedido.id)}>
                  {bloqueado
                    ? c.vinculadoOutraVenda
                      ? "Vinculado a outra venda"
                      : "Já vinculado"
                    : "Confirmar neste pedido"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AcoesVendaSemVinculo({
  vendaId,
  criarDeVenda,
  ignorar,
  marcarErrada,
  vendaCandidatosId,
  setVendaCandidatosId,
}: {
  vendaId: string;
  criarDeVenda: {
    isPending: boolean;
    mutate: (input: { pedidoContaAzulId: string; tipoVenda: TipoVenda }) => void;
  };
  ignorar: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string }) => void };
  marcarErrada: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string }) => void };
  vendaCandidatosId: string | null;
  setVendaCandidatosId: (id: string | null) => void;
}) {
  const [tipoVenda, setTipoVenda] = useState<TipoVenda | "">("");

  const criarPedidoOperacional = () => {
    if (!tipoVenda) {
      toast.error("Escolha se a venda é plano, recorrente ou avulsa antes de criar o pedido.");
      return;
    }
    criarDeVenda.mutate({ pedidoContaAzulId: vendaId, tipoVenda });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-8 rounded-md border bg-background px-2 text-xs"
        value={tipoVenda}
        onChange={(e) => setTipoVenda(e.target.value as TipoVenda | "")}
      >
        <option value="" disabled>
          Tipo da venda...
        </option>
        {TIPOS_VENDA.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Button size="sm" disabled={criarDeVenda.isPending} onClick={criarPedidoOperacional}>
        Criar pedido operacional
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setVendaCandidatosId(vendaCandidatosId === vendaId ? null : vendaId)}
      >
        Vincular entregas
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={ignorar.isPending}
        onClick={() => ignorar.mutate({ pedidoContaAzulId: vendaId })}
      >
        Ignorar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={marcarErrada.isPending}
        onClick={() => marcarErrada.mutate({ pedidoContaAzulId: vendaId })}
      >
        Marcar venda errada
      </Button>
    </div>
  );
}

function VendaSemPedidoCard({
  venda,
  criarDeVenda,
  ignorar,
  marcarErrada,
  importarProdutos,
  vendaCandidatosId,
  setVendaCandidatosId,
  candidatos,
  confirmando,
  onConfirmarVinculo,
  onConfirmarVinculoMultiplo,
}: {
  venda: any;
  criarDeVenda: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string; tipoVenda: TipoVenda }) => void };
  ignorar: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string }) => void };
  marcarErrada: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string }) => void };
  importarProdutos: { isPending: boolean; mutate: (input: { produtoIds: string[] }) => void };
  vendaCandidatosId: string | null;
  setVendaCandidatosId: (id: string | null) => void;
  candidatos: { isLoading: boolean; data?: { candidatos: any[]; acumulaPedidos?: boolean; diasAcumulo?: number | null; selecionadosPadrao?: string[]; divergenciasAgregadas?: any[] } };
  confirmando?: boolean;
  onConfirmarVinculo: (pedidoOperacionalId: string) => void;
  onConfirmarVinculoMultiplo?: (pedidoOperacionalIds: string[]) => void;
}) {
  const faltantes = trpc.comercial.pedidos.conciliacaoProdutosFaltantesVenda.useQuery({ pedidoContaAzulId: venda.id });
  const idsAtivacao = (faltantes.data?.faltantes ?? [])
    .filter((f) => f.podeAtivar && f.produtoCatalogoId)
    .map((f) => f.produtoCatalogoId as string);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <BlocoVenda titulo="Venda" venda={venda} />
        <AcoesVendaSemVinculo
          vendaId={venda.id}
          criarDeVenda={criarDeVenda}
          ignorar={ignorar}
          marcarErrada={marcarErrada}
          vendaCandidatosId={vendaCandidatosId}
          setVendaCandidatosId={setVendaCandidatosId}
        />
        {(faltantes.data?.faltantes?.length ?? 0) > 0 && (
          <div className="w-full rounded-lg border border-amber-300 bg-amber-50/50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
            <p className="mb-2 font-medium text-amber-900 dark:text-amber-100">Produtos da venda ainda não ativos na operação</p>
            <ul className="mb-2 space-y-1 text-xs text-muted-foreground">
              {faltantes.data!.faltantes.map((f) => (
                <li key={`${f.nome}-${f.sku ?? ""}`}>
                  {f.nome}
                  {f.sku ? ` (SKU ${f.sku})` : ""}
                  {!f.podeAtivar ? " — sincronize o catálogo na aba Produtos" : ""}
                </li>
              ))}
            </ul>
            {idsAtivacao.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={importarProdutos.isPending}
                onClick={() => importarProdutos.mutate({ produtoIds: idsAtivacao })}
              >
                Ativar agora ({idsAtivacao.length})
              </Button>
            )}
          </div>
        )}
        {vendaCandidatosId === venda.id && (
          <div className="w-full">
            <CandidatosVenda
              isLoading={candidatos.isLoading}
              candidatos={candidatos.data?.candidatos ?? []}
              vendaId={venda.id}
              acumulaPedidos={Boolean(candidatos.data?.acumulaPedidos)}
              diasAcumulo={candidatos.data?.diasAcumulo ?? null}
              selecionadosPadrao={candidatos.data?.selecionadosPadrao ?? []}
              divergenciasAgregadas={candidatos.data?.divergenciasAgregadas ?? []}
              vendaItens={candidatos.data?.venda?.itens ?? []}
              confirmando={confirmando}
              onConfirmar={onConfirmarVinculo}
              onConfirmarMultiplo={onConfirmarVinculoMultiplo}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function labelBotaoCorrecao(d: any) {
  const campo = String(d?.campo ?? "");
  if (campo === "data") {
    return `Usar data da Conta Azul (${fmtDate(String(d.contaAzul))})`;
  }
  if (campo === "valor_estimado") {
    return "Sincronizar itens e preços da Conta Azul";
  }
  if (campo.startsWith("item:")) {
    return `Usar quantidade da Conta Azul (${Number(d.contaAzul ?? 0).toLocaleString("pt-BR")} un)`;
  }
  return "Aplicar valor da Conta Azul";
}

function normalizarDivergenciasItens(divergencias: any[]) {
  const outras = divergencias.filter((d) => !String(d?.campo ?? "").startsWith("item:"));
  const itens = divergencias.filter((d) => String(d?.campo ?? "").startsWith("item:"));
  const soOp = itens.filter((d) => Number(d.operacional) > 0 && Number(d.contaAzul) === 0);
  const soCa = itens.filter((d) => Number(d.operacional) === 0 && Number(d.contaAzul) > 0);
  const mistos = itens.filter((d) => !soOp.includes(d) && !soCa.includes(d));
  const usadosOp = new Set<any>();
  const resultado = [...mistos];

  for (const ca of soCa) {
    const qCa = Number(ca.contaAzul);
    const par = soOp.find((op) => !usadosOp.has(op) && Number(op.operacional) === qCa);
    if (par) {
      usadosOp.add(par);
      continue;
    }
    resultado.push(ca);
  }
  for (const op of soOp) {
    if (!usadosOp.has(op)) resultado.push(op);
  }

  const finais = resultado.filter(
    (d) => Math.abs(Number(d.operacional ?? 0) - Number(d.contaAzul ?? 0)) > 0.001,
  );
  return [...outras, ...finais];
}

function DivergenciasLista({
  divergencias,
  pedidoOperacionalId,
  pedidoContaAzulId,
  aplicando,
  onAplicarCorrecao,
  onAplicarCorrecaoAgregada,
  onAjustarFrete,
}: {
  divergencias: any[];
  pedidoOperacionalId?: string;
  pedidoContaAzulId?: string;
  aplicando?: boolean;
  onAplicarCorrecao?: (pedidoOperacionalId: string, pedidoContaAzulId: string, campos?: string[], mensagem?: string) => void;
  onAplicarCorrecaoAgregada?: (campos?: string[]) => void;
  onAjustarFrete?: () => void;
}) {
  const podeCorrigir = Boolean(pedidoOperacionalId && pedidoContaAzulId && onAplicarCorrecao);
  const podeCorrigirAgregado = Boolean(pedidoContaAzulId && onAplicarCorrecaoAgregada);
  const divergenciasExibidas = normalizarDivergenciasItens(divergencias);

  if (!divergenciasExibidas.length) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        Nenhuma divergência recalculada. Sincronize novamente; se persistir, o status antigo será normalizado no próximo processamento.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2 text-xs dark:border-amber-900 dark:bg-amber-950/30">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-amber-900 dark:text-amber-100">Onde corrigir</p>
        {podeCorrigir && divergenciasExibidas.length > 1 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={aplicando}
            onClick={() =>
              onAplicarCorrecao!(
                pedidoOperacionalId!,
                pedidoContaAzulId!,
                undefined,
                "Todas as divergências serão corrigidas no pedido operacional com base na venda Conta Azul. Confirma?",
              )
            }
          >
            Aplicar todas da Conta Azul
          </Button>
        ) : null}
        {podeCorrigirAgregado && divergenciasExibidas.length > 1 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={aplicando}
            onClick={() => onAplicarCorrecaoAgregada!()}
          >
            Aplicar todas (agregado)
          </Button>
        ) : null}
      </div>
      <ul className="space-y-2">
        {divergenciasExibidas.map((d: any) => {
          const detalhe = detalheDivergencia(d);
          return (
            <li key={`${d.campo}-${detalhe.valores}`} className="rounded border border-amber-200/70 bg-background/70 p-2">
              <p className="font-semibold text-foreground">{detalhe.titulo}</p>
              <p className="text-muted-foreground">{detalhe.valores}</p>
              <p className="mt-1 text-amber-900 dark:text-amber-100">{detalhe.acao}</p>
              {podeCorrigir ? (
                <Button
                  size="sm"
                  className="mt-2"
                  variant="secondary"
                  disabled={aplicando}
                  onClick={() =>
                    onAplicarCorrecao!(
                      pedidoOperacionalId!,
                      pedidoContaAzulId!,
                      [String(d.campo)],
                      `A Conta Azul será usada como referência para "${detalhe.titulo}". O pedido operacional será atualizado em todo o sistema. Confirma?`,
                    )
                  }
                >
                  {labelBotaoCorrecao(d)}
                </Button>
              ) : null}
              {podeCorrigirAgregado && String(d.campo) !== "data" ? (
                <Button
                  size="sm"
                  className="mt-2 ml-2"
                  variant="secondary"
                  disabled={aplicando}
                  onClick={() => onAplicarCorrecaoAgregada!([String(d.campo)])}
                >
                  {labelBotaoCorrecao(d)} (agregado)
                </Button>
              ) : null}
              {String(d.campo) === "valor_estimado" && onAjustarFrete ? (
                <Button size="sm" className="mt-2 ml-2" variant="outline" onClick={onAjustarFrete}>
                  Ajustar taxa de entrega
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
