import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

type LinhaItem = {
  produtoId: string;
  quantidade: string;
  observacoes: string;
};

export function AcoesPedidoConciliacao({
  pedido,
  disabled,
  onEditar,
  onMarcarEntregue,
  onCancelar,
  onReativar,
}: {
  pedido: any;
  disabled?: boolean;
  onEditar?: () => void;
  onMarcarEntregue?: () => void;
  onCancelar?: () => void;
  onReativar?: () => void;
}) {
  const cancelado = pedido.status === "CANCELADO";
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {onEditar && !cancelado ? (
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={disabled} onClick={onEditar}>
          Editar itens/preços
        </Button>
      ) : null}
      {onMarcarEntregue && !cancelado && pedido.status !== "ENTREGUE" ? (
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={disabled} onClick={onMarcarEntregue}>
          Marcar entregue
        </Button>
      ) : null}
      {onCancelar && !cancelado ? (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-700" disabled={disabled} onClick={onCancelar}>
          Cancelar pedido
        </Button>
      ) : null}
      {onReativar && cancelado ? (
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={disabled} onClick={onReativar}>
          Reativar
        </Button>
      ) : null}
    </div>
  );
}

export function EditarPedidoConciliacaoDialog({
  pedido,
  open,
  onOpenChange,
  onSalvo,
}: {
  pedido: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo?: () => void;
}) {
  const [linhas, setLinhas] = useState<LinhaItem[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [freteCortesia, setFreteCortesia] = useState(false);
  const [dataEntrega, setDataEntrega] = useState("");

  const produtos = trpc.comercial.pedidos.produtos.useQuery({
    incluirInativos: false,
    apenasOperacao: true,
  });

  const salvar = trpc.comercial.pedidos.salvarPedido.useMutation({
    onSuccess: () => {
      toast.success("Pedido operacional atualizado.");
      onOpenChange(false);
      onSalvo?.();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!pedido || !open) return;
    setObservacoes(pedido.observacoes ?? "");
    setFreteCortesia(Boolean(pedido.freteCortesia));
    const d = new Date(pedido.dataEntrega);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setDataEntrega(`${y}-${m}-${day}`);
    setLinhas(
      (pedido.itens ?? []).length > 0
        ? pedido.itens.map((i: any) => ({
            produtoId: i.produtoId,
            quantidade: String(Number(i.quantidade)),
            observacoes: i.observacoes ?? "",
          }))
        : [{ produtoId: "", quantidade: "1", observacoes: "" }],
    );
  }, [pedido, open]);

  function salvarPedido() {
    if (!pedido) return;
    const itensValidos = linhas
      .filter((l) => l.produtoId && Number(l.quantidade) > 0)
      .map((l) => ({
        produtoId: l.produtoId,
        quantidade: Number(l.quantidade),
        observacoes: l.observacoes.trim() || undefined,
      }));
    if (itensValidos.length === 0) {
      toast.error("Informe ao menos um item com quantidade.");
      return;
    }
    salvar.mutate({
      id: pedido.id,
      contaAzulCustomerId: pedido.contaAzulCustomerId,
      dataEntrega: new Date(`${dataEntrega}T12:00:00`),
      tipoVenda: pedido.tipoVenda ?? "AVULSO",
      observacoes: observacoes.trim() || undefined,
      freteCortesia,
      itens: itensValidos,
      avarias: [],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pedido operacional</DialogTitle>
        </DialogHeader>
        {pedido ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {pedido.cliente?.nome ?? pedido.contaAzulCustomerId} · ajuste quantidades, produtos e data sem sair da conciliação.
            </p>
            <div>
              <Label className="text-xs">Data de entrega</Label>
              <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Itens</Label>
              {linhas.map((linha, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2 rounded border p-2">
                  <div className="min-w-[140px] flex-1">
                    <Select
                      value={linha.produtoId || undefined}
                      onValueChange={(v) =>
                        setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, produtoId: v } : l)))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {(produtos.data ?? []).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    className="h-8 w-20 text-xs"
                    value={linha.quantidade}
                    onChange={(e) =>
                      setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, quantidade: e.target.value } : l)))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={() => setLinhas((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLinhas((prev) => [...prev, { produtoId: "", quantidade: "1", observacoes: "" }])}
              >
                + Item
              </Button>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={freteCortesia} onChange={(e) => setFreteCortesia(e.target.checked)} />
              Frete cortesia
            </label>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="h-9" />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button disabled={salvar.isPending} onClick={salvarPedido}>
            {salvar.isPending ? "Salvando..." : "Salvar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AjustarFreteConciliacaoDialog({
  contaAzulCustomerId,
  open,
  onOpenChange,
  onSalvo,
}: {
  contaAzulCustomerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo?: () => void;
}) {
  const [cobraTaxa, setCobraTaxa] = useState(true);
  const [valorTaxa, setValorTaxa] = useState("");

  const contexto = trpc.comercial.pedidos.contextoCliente.useQuery(
    { contaAzulCustomerId: contaAzulCustomerId ?? "" },
    { enabled: open && Boolean(contaAzulCustomerId) },
  );

  const salvarRegra = trpc.comercial.pedidos.salvarRegraCliente.useMutation({
    onSuccess: () => {
      toast.success("Taxa de entrega atualizada.");
      onOpenChange(false);
      onSalvo?.();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!open || !contexto.data?.regra) return;
    const r = contexto.data.regra;
    setCobraTaxa(Boolean(r.cobraTaxaEntrega));
    setValorTaxa(r.valorTaxaEntrega != null ? String(Number(r.valorTaxaEntrega)) : "");
  }, [open, contexto.data]);

  function salvar() {
    if (!contaAzulCustomerId) return;
    const r = contexto.data?.regra;
    const valor = cobraTaxa ? Number(valorTaxa.replace(",", ".")) : null;
    if (cobraTaxa && (valor == null || Number.isNaN(valor) || valor < 0)) {
      toast.error("Informe um valor de taxa válido.");
      return;
    }
    salvarRegra.mutate({
      contaAzulCustomerId,
      observacoesGerais: r?.observacoesGerais ?? null,
      tipoVendaPadrao: r?.tipoVendaPadrao ?? null,
      periodoEntrega: r?.periodoEntrega ?? null,
      horarioMaximoEntrega: r?.horarioMaximoEntrega ?? null,
      cobraTaxaEntrega: cobraTaxa,
      valorTaxaEntrega: valor,
      prazoBoletoDias: r?.prazoBoletoDias != null ? Number(r.prazoBoletoDias) : null,
      descontoBoletoPercentual:
        r?.descontoBoletoPercentual != null ? Number(r.descontoBoletoPercentual) : null,
      acumulaPedidos: Boolean(r?.acumulaPedidos),
      diasAcumulo: r?.diasAcumulo != null ? Number(r.diasAcumulo) : null,
      prazoBoletoAcumuloDias:
        r?.prazoBoletoAcumuloDias != null ? Number(r.prazoBoletoAcumuloDias) : null,
      precosEspeciais: (r?.precosEspeciais ?? []).map((p: any) => ({
        produtoId: p.produtoId,
        preco: Number(p.preco),
      })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar taxa de entrega</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Use quando a divergência de valor for frete. A alteração vale para o fechamento semanal deste cliente.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cobraTaxa} onChange={(e) => setCobraTaxa(e.target.checked)} />
          Cliente paga taxa de entrega
        </label>
        {cobraTaxa ? (
          <div>
            <Label className="text-xs">Valor da taxa (R$)</Label>
            <Input value={valorTaxa} onChange={(e) => setValorTaxa(e.target.value)} className="h-9" placeholder="0,00" />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={salvarRegra.isPending || contexto.isLoading} onClick={salvar}>
            {salvarRegra.isPending ? "Salvando..." : "Salvar taxa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
