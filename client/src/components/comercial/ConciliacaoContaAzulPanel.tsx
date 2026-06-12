import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Link2, Unlink, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      acao: `Corrija a data de entrega do pedido operacional (${d.operacional}) ou a data da venda no Conta Azul (${d.contaAzul}).`,
      valores: `Operacional ${d.operacional} × Conta Azul ${d.contaAzul}`,
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

export function ConciliacaoContaAzulPanel({ inicio, fim }: { inicio: Date; fim: Date }) {
  const utils = trpc.useUtils();
  const painel = trpc.comercial.pedidos.conciliacaoPainel.useQuery({ inicio, fim });
  const [vendaCandidatosId, setVendaCandidatosId] = useState<string | null>(null);
  const candidatos = trpc.comercial.pedidos.conciliacaoCandidatosVenda.useQuery(
    { pedidoContaAzulId: vendaCandidatosId ?? "", janelaDias: 14 },
    { enabled: Boolean(vendaCandidatosId) },
  );

  const confirmar = trpc.comercial.pedidos.conciliacaoConfirmarVinculo.useMutation({
    onSuccess: (r) => {
      setVendaCandidatosId(null);
      toast.success(
        r.divergencias?.length
          ? "Vínculo confirmado com divergências registradas."
          : "Vínculo confirmado com sucesso.",
      );
      void utils.comercial.pedidos.conciliacaoPainel.invalidate();
      void utils.comercial.pedidos.agenda.invalidate();
      void utils.comercial.pedidos.relatorioHistorico.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const marcarErrada = trpc.comercial.pedidos.conciliacaoMarcarVendaErrada.useMutation({
    onSuccess: () => {
      toast.success("Venda marcada como incorreta.");
      void utils.comercial.pedidos.conciliacaoPainel.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const ignorar = trpc.comercial.pedidos.conciliacaoIgnorarVenda.useMutation({
    onSuccess: () => {
      toast.message("Venda ignorada na conciliação.");
      void utils.comercial.pedidos.conciliacaoPainel.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const manterOp = trpc.comercial.pedidos.conciliacaoManterOperacional.useMutation({
    onSuccess: () => {
      toast.success("Pedido operacional mantido como referência.");
      void utils.comercial.pedidos.conciliacaoPainel.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const criarDeVenda = trpc.comercial.pedidos.conciliacaoCriarOperacionalDeVenda.useMutation({
    onSuccess: () => {
      toast.success("Pedido operacional criado a partir da venda.");
      void utils.comercial.pedidos.conciliacaoPainel.invalidate();
      void utils.comercial.pedidos.agenda.invalidate();
      void utils.comercial.pedidos.conciliacaoProdutosFaltantesVenda.invalidate();
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
      void utils.comercial.pedidos.conciliacaoPainel.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resumo = painel.data?.resumo;
  const alertas = useMemo(() => {
    const d = painel.data;
    if (!d) return 0;
    return (d.divergentes?.length ?? 0) + (d.sugestoes?.length ?? 0) + (d.vendasSemPedido?.length ?? 0);
  }, [painel.data]);

  if (painel.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando conciliação Conta Azul...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/20 dark:text-cyan-100">
        A sincronização importa vendas e orçamentos conciliáveis do Conta Azul e sugere vínculos, mas{" "}
        <strong>não substitui</strong> pedidos operacionais automaticamente. Confirme manualmente ou marque
        divergências para preservar a rastreabilidade.
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ResumoCard label="Sem venda CA" value={resumo?.semVenda ?? 0} />
        <ResumoCard label="Docs. CA sem pedido" value={resumo?.vendasSemPedido ?? 0} />
        <ResumoCard label="Sugestões" value={resumo?.sugestoes ?? 0} highlight={Boolean(resumo?.sugestoes)} />
        <ResumoCard label="Conciliados" value={resumo?.conciliados ?? 0} ok />
        <ResumoCard label="Divergentes" value={resumo?.divergentes ?? 0} alert={Boolean(resumo?.divergentes)} />
      </div>

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
                <strong>Confirmar vínculo</strong> — junta os dois registros. O <strong>valor que vale para faturamento é o da Conta Azul</strong>;
                o pedido operacional continua valendo para produção/colheita. Diferenças listadas continuam visíveis até serem corrigidas.
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
                  <DivergenciasLista divergencias={s.divergencias} />
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
                    suggestedId={s.operacional.id}
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
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </Section>
      )}

      {(painel.data?.divergentes ?? []).length > 0 && (
        <Section title="Divergências após conciliação ou alteração no Conta Azul" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}>
          {painel.data!.divergentes.map((op: any) => (
            <Card key={op.id} className="border-amber-300 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10">
              <CardContent className="space-y-2 p-4">
                <BlocoPedido titulo="Pedido operacional (referência)" pedido={op} />
                {op.pedidoContaAzul && <BlocoVenda titulo="Venda Conta Azul atual" venda={op.pedidoContaAzul} />}
                <DivergenciasLista divergencias={op.divergencias ?? []} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={manterOp.isPending} onClick={() => manterOp.mutate({ pedidoOperacionalId: op.id })}>
                    Manter operacional como verdade
                  </Button>
                  {op.pedidoContaAzulId && (
                    <Button size="sm" variant="ghost" disabled={desvincular.isPending} onClick={() => desvincular.mutate({ pedidoOperacionalId: op.id })}>
                      <Unlink className="mr-1 h-3 w-3" /> Desvincular
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
              onConfirmarVinculo={(pedidoOperacionalId) =>
                confirmar.mutate({
                  pedidoOperacionalId,
                  pedidoContaAzulId: v.id,
                  observacoes: "Operador vinculou manualmente uma venda sem pedido sugerido.",
                })
              }
            />
          ))}
        </Section>
      )}

      {(painel.data?.semVenda ?? []).length > 0 && (
        <Section title="Pedidos operacionais ainda sem venda no Conta Azul" icon={<CheckCircle2 className="h-4 w-4" />}>
          <div className="grid gap-2 lg:grid-cols-2">
            {painel.data!.semVenda.slice(0, 12).map((op: any) => (
              <Card key={op.id}>
                <CardContent className="p-3">
                  <BlocoPedido titulo="Aguardando venda" pedido={op} compact />
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

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

function BlocoVenda({ titulo, venda }: { titulo: string; venda: any }) {
  const tipo = tipoDocumentoContaAzul(venda.statusPedido);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="font-semibold">{venda.cliente?.nome ?? "Cliente"}</p>
      <p className="text-xs text-muted-foreground">
        {tipo} · {fmtDate(venda.dataPedido)} · {venda.numeroVenda ? `nº ${venda.numeroVenda}` : venda.externalId?.slice(0, 8)}
        {" · "}{fmtMoney(venda.valorLiquido ?? venda.valorTotal)}
        {" · "}{labelStatusConciliacao(venda.statusConciliacao ?? "NAO_CONCILIADA")}
      </p>
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
  onConfirmar,
}: {
  isLoading: boolean;
  candidatos: any[];
  vendaId: string;
  suggestedId?: string;
  onConfirmar: (pedidoOperacionalId: string) => void;
}) {
  if (isLoading) {
    return <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Buscando pedidos possíveis...</p>;
  }

  if (candidatos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Nenhum pedido operacional do mesmo cliente foi encontrado na janela de 14 dias.
      </p>
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
          const bloqueado = pedido.pedidoContaAzulId && !c.vinculadoNestaVenda;
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
                <Button size="sm" disabled={bloqueado} onClick={() => onConfirmar(pedido.id)}>
                  {bloqueado ? "Já vinculado" : "Confirmar neste pedido"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
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
  onConfirmarVinculo,
}: {
  venda: any;
  criarDeVenda: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string }) => void };
  ignorar: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string }) => void };
  marcarErrada: { isPending: boolean; mutate: (input: { pedidoContaAzulId: string }) => void };
  importarProdutos: { isPending: boolean; mutate: (input: { produtoIds: string[] }) => void };
  vendaCandidatosId: string | null;
  setVendaCandidatosId: (id: string | null) => void;
  candidatos: { isLoading: boolean; data?: { candidatos: any[] } };
  onConfirmarVinculo: (pedidoOperacionalId: string) => void;
}) {
  const faltantes = trpc.comercial.pedidos.conciliacaoProdutosFaltantesVenda.useQuery({ pedidoContaAzulId: venda.id });
  const idsAtivacao = (faltantes.data?.faltantes ?? [])
    .filter((f) => f.podeAtivar && f.produtoCatalogoId)
    .map((f) => f.produtoCatalogoId as string);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <BlocoVenda titulo="Venda" venda={venda} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={criarDeVenda.isPending} onClick={() => criarDeVenda.mutate({ pedidoContaAzulId: venda.id })}>
            Criar pedido operacional
          </Button>
          <Button size="sm" variant="outline" onClick={() => setVendaCandidatosId(vendaCandidatosId === venda.id ? null : venda.id)}>
            Vincular a pedido existente
          </Button>
          <Button size="sm" variant="outline" disabled={ignorar.isPending} onClick={() => ignorar.mutate({ pedidoContaAzulId: venda.id })}>
            Ignorar
          </Button>
          <Button size="sm" variant="ghost" disabled={marcarErrada.isPending} onClick={() => marcarErrada.mutate({ pedidoContaAzulId: venda.id })}>
            Marcar venda errada
          </Button>
        </div>
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
              onConfirmar={onConfirmarVinculo}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DivergenciasLista({ divergencias }: { divergencias: any[] }) {
  if (!divergencias.length) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        Nenhuma divergência recalculada. Sincronize novamente; se persistir, o status antigo será normalizado no próximo processamento.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2 text-xs dark:border-amber-900 dark:bg-amber-950/30">
      <p className="mb-2 font-semibold text-amber-900 dark:text-amber-100">Onde corrigir</p>
      <ul className="space-y-2">
        {divergencias.map((d: any) => {
          const detalhe = detalheDivergencia(d);
          return (
            <li key={`${d.campo}-${detalhe.valores}`} className="rounded border border-amber-200/70 bg-background/70 p-2">
              <p className="font-semibold text-foreground">{detalhe.titulo}</p>
              <p className="text-muted-foreground">{detalhe.valores}</p>
              <p className="mt-1 text-amber-900 dark:text-amber-100">{detalhe.acao}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
