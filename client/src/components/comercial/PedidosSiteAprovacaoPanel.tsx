import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  XCircle,
} from "lucide-react";
import { fmtDataEntrega, isoDataEntrega } from "@/lib/dataEntrega";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  canEdit: boolean;
  /** Após aprovar, o pai abre o dia da entrega na agenda operacional. */
  onAprovado?: (dataEntregaIso: string) => void;
};

function fmtBrl(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PedidosSiteAprovacaoPanel({ canEdit, onAprovado }: Props) {
  const utils = trpc.useUtils();
  const lista = trpc.comercial.pedidos.pedidosSiteAprovacao.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function invalidarAposAcao() {
    await Promise.all([
      utils.comercial.pedidos.pedidosSiteAprovacao.invalidate(undefined, {
        refetchType: "all",
      }),
      utils.comercial.pedidos.agenda.invalidate(undefined, {
        refetchType: "all",
      }),
      utils.comercial.pedidos.dashboard.invalidate(undefined, {
        refetchType: "all",
      }),
      utils.comercial.pedidos.statusSemana.invalidate(undefined, {
        refetchType: "all",
      }),
    ]);
  }

  const aprovar = trpc.comercial.pedidos.aprovarPedidoSite.useMutation({
    onSuccess: async result => {
      const diaIso = result.dataEntrega
        ? isoDataEntrega(result.dataEntrega)
        : "";
      toast.success(
        result.pessoa
          ? "Pedido do site aprovado. Cobrança liberada para o cliente."
          : diaIso
            ? `Pedido aprovado. Aberto o dia ${fmtDataEntrega(diaIso)} na operação.`
            : "Pedido do site aprovado e liberado na operação."
      );
      await invalidarAposAcao();
      if (diaIso && !result.pessoa) onAprovado?.(diaIso);
    },
    onError: err => toast.error(err.message || "Falha ao aprovar."),
    onSettled: () => setBusyId(null),
  });

  const rejeitar = trpc.comercial.pedidos.rejeitarPedidoSite.useMutation({
    onSuccess: async () => {
      toast.success("Pedido do site rejeitado. Estoque restaurado.");
      await invalidarAposAcao();
    },
    onError: err => toast.error(err.message || "Falha ao rejeitar."),
    onSettled: () => setBusyId(null),
  });

  const pedidos = lista.data ?? [];

  return (
    <Card className="border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-sky-700 dark:text-sky-300" />
          Pedidos para aprovação (site)
          {lista.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Badge variant="secondary">{pedidos.length}</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pedidos do site ficam aqui até a aprovação. Depois disso, empresa
          entra no dia da entrega; pessoa entra após o pagamento.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista.isError ? (
          <p className="text-sm text-destructive">
            Não foi possível carregar os pedidos do site.
          </p>
        ) : pedidos.length === 0 && !lista.isLoading ? (
          <p className="rounded-md border border-dashed bg-background/70 px-3 py-4 text-sm text-muted-foreground">
            Nenhum pedido do site aguardando aprovação no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {pedidos.map(p => {
              const ocupado = busyId === p.id;
              const diaIso = isoDataEntrega(p.dataEntrega);
              return (
                <li
                  key={p.id}
                  className="rounded-lg border bg-background/80 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-tight">
                          {p.cliente?.nome ?? "Cliente"}
                        </p>
                        <Badge className="bg-amber-600 hover:bg-amber-600">
                          {p.pessoa
                            ? "Pessoa · aguarda aprovação"
                            : "Empresa · aguarda aprovação"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Entrega {fmtDataEntrega(p.dataEntrega)} ·{" "}
                        {fmtBrl(p.total)} · {p.itens.length} item(ns)
                      </p>
                      <ul className="text-xs text-muted-foreground">
                        {p.itens.slice(0, 4).map(it => (
                          <li key={it.id}>
                            {Number(it.quantidade).toLocaleString("pt-BR")}×{" "}
                            {it.produtoNome}
                          </li>
                        ))}
                        {p.itens.length > 4 ? (
                          <li>+{p.itens.length - 4} item(ns)</li>
                        ) : null}
                      </ul>
                      {p.observacoes ? (
                        <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                          {p.observacoes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {diaIso ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAprovado?.(diaIso)}
                        >
                          Ver dia {fmtDataEntrega(diaIso)}
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <>
                          <Button
                            size="sm"
                            disabled={ocupado}
                            onClick={() => {
                              setBusyId(p.id);
                              aprovar.mutate({ pedidoId: p.id });
                            }}
                          >
                            {ocupado && aprovar.isPending ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                            )}
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={ocupado}
                            onClick={() => {
                              const ok = window.confirm(
                                "Rejeitar este pedido do site?\n\nO estoque volta para a loja e o cliente deixa de ver o pedido em aberto."
                              );
                              if (!ok) return;
                              const motivo =
                                window.prompt(
                                  "Motivo da rejeição (opcional):"
                                ) ?? undefined;
                              setBusyId(p.id);
                              rejeitar.mutate({
                                pedidoId: p.id,
                                motivo: motivo?.trim() || undefined,
                              });
                            }}
                          >
                            {ocupado && rejeitar.isPending ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-1 h-4 w-4" />
                            )}
                            Rejeitar
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
