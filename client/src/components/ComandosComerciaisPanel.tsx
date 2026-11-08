"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import type { PendingAssistantAction } from "@shared/assistant-actions";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type ComandoId =
  | "regra"
  | "pedido"
  | "status"
  | "cancelar"
  | "data"
  | "copiar_pedido"
  | "semana_copiar"
  | "semana_fechar"
  | "semana_reabrir"
  | "avancado";

const COMANDOS: { id: ComandoId; label: string }[] = [
  { id: "regra", label: "Salvar regra comercial" },
  { id: "pedido", label: "Criar / editar pedido" },
  { id: "status", label: "Status do cliente no dia" },
  { id: "cancelar", label: "Cancelar pedido" },
  { id: "data", label: "Alterar data do pedido" },
  { id: "copiar_pedido", label: "Copiar pedido para outro dia" },
  { id: "semana_copiar", label: "Copiar semana anterior" },
  { id: "semana_fechar", label: "Fechar semana" },
  { id: "semana_reabrir", label: "Reabrir semana" },
  { id: "avancado", label: "Avançado (operação + JSON)" },
];

const DIAS_SEMANA = [
  { v: 0, l: "Dom" },
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

export type ComandosComerciaisPanelProps = {
  onPrepared: (actions: PendingAssistantAction[]) => void;
  disabled?: boolean;
};

export function ComandosComerciaisPanel({ onPrepared, disabled }: ComandosComerciaisPanelProps) {
  const [comando, setComando] = useState<ComandoId>("regra");
  const [clienteNome, setClienteNome] = useState("");
  const [diasEntrega, setDiasEntrega] = useState<number[]>([1, 4]);
  const [periodo, setPeriodo] = useState<"MANHA" | "TARDE" | "">("");
  const [acumula, setAcumula] = useState(false);
  const [dataEntrega, setDataEntrega] = useState("");
  const [tipoVenda, setTipoVenda] = useState("AVULSO");
  const [itensTexto, setItensTexto] = useState("Alface Crespa Verde; 10");
  const [pedidoId, setPedidoId] = useState("");
  const [status, setStatus] = useState("PENDENTE");
  const [dia, setDia] = useState("");
  const [ignorarConciliacao, setIgnorarConciliacao] = useState(false);
  const [operacaoAvancada, setOperacaoAvancada] = useState("salvarRegraCliente");
  const [jsonAvancado, setJsonAvancado] = useState("{\n  \n}");

  const preparar = trpc.chat.prepararComandoComercial.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const busy = disabled || preparar.isPending;

  const payload = useMemo(() => {
    switch (comando) {
      case "regra":
        return {
          toolName: "preparar_salvar_regra_comercial",
          args: {
            cliente_nome: clienteNome.trim(),
            periodo_entrega: periodo || undefined,
            dias_entrega: diasEntrega,
            acumula_pedidos: acumula,
          },
        };
      case "pedido": {
        const itens = itensTexto
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [nome, qtd] = line.split(";").map((s) => s.trim());
            return { produto_nome: nome, quantidade: Number(qtd) };
          });
        return {
          toolName: "preparar_salvar_pedido",
          args: {
            cliente_nome: clienteNome.trim(),
            data_entrega: dataEntrega,
            tipo_venda: tipoVenda,
            pedido_id: pedidoId.trim() || undefined,
            itens,
          },
        };
      }
      case "status":
        return {
          toolName: "preparar_status_cliente_dia",
          args: {
            cliente_nome: clienteNome.trim(),
            dia: dia || dataEntrega,
            status,
          },
        };
      case "cancelar":
        return {
          toolName: "preparar_cancelar_pedido",
          args: { pedido_id: pedidoId.trim() },
        };
      case "data":
        return {
          toolName: "preparar_alterar_data_pedido",
          args: {
            pedido_id: pedidoId.trim(),
            data_entrega: dataEntrega,
          },
        };
      case "copiar_pedido":
        return {
          toolName: "preparar_copiar_pedido",
          args: {
            pedido_id: pedidoId.trim(),
            data_entrega: dataEntrega,
          },
        };
      case "semana_copiar":
        return {
          toolName: "preparar_copiar_semana_anterior",
          args: { dia: dia || dataEntrega },
        };
      case "semana_fechar":
        return {
          toolName: "preparar_fechar_semana",
          args: {
            dia: dia || dataEntrega,
            ignorar_conciliacao: ignorarConciliacao,
          },
        };
      case "semana_reabrir":
        return {
          toolName: "preparar_reabrir_semana",
          args: { dia: dia || dataEntrega },
        };
      case "avancado": {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(jsonAvancado) as Record<string, unknown>;
        } catch {
          input = { __parse_error: true };
        }
        return {
          toolName: "preparar_operacao_comercial_pedidos",
          args: {
            operacao: operacaoAvancada,
            input,
            cliente_nome: clienteNome.trim() || undefined,
          },
        };
      }
      default:
        return { toolName: "preparar_salvar_regra_comercial", args: {} };
    }
  }, [
    acumula,
    clienteNome,
    comando,
    dataEntrega,
    dia,
    diasEntrega,
    ignorarConciliacao,
    itensTexto,
    jsonAvancado,
    operacaoAvancada,
    pedidoId,
    periodo,
    status,
    tipoVenda,
  ]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (comando === "avancado") {
      try {
        JSON.parse(jsonAvancado);
      } catch {
        toast.error("JSON inválido no modo avançado.");
        return;
      }
    }
    preparar.mutate(
      { toolName: payload.toolName, args: payload.args },
      {
        onSuccess: (res) => {
          onPrepared(res.pendingActions);
          toast.message("Comando preparado — confirme acima para gravar.");
        },
      },
    );
  };

  const toggleDia = (d: number) => {
    setDiasEntrega((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full min-h-[280px] flex-col gap-3 overflow-y-auto rounded-lg border bg-background p-3"
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">Comandos comerciais (Pedidos)</p>
        <p className="text-xs text-muted-foreground">
          Sem OpenAI: escolha a operação, preencha os campos e confirme. Usa as mesmas regras da tela de
          Pedidos.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Operação</Label>
        <Select value={comando} onValueChange={(v) => setComando(v as ComandoId)} disabled={busy}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMANDOS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(comando === "regra" || comando === "pedido" || comando === "status" || comando === "avancado") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Cliente (nome)</Label>
          <Input
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            placeholder="Ex.: Mercado Exemplo"
            disabled={busy}
            className="h-9"
          />
        </div>
      )}

      {comando === "regra" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Dias de entrega</Label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map((d) => {
                const on = diasEntrega.includes(d.v);
                return (
                  <Button
                    key={d.v}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    className="h-8 px-2 text-xs"
                    disabled={busy}
                    onClick={() => toggleDia(d.v)}
                  >
                    {d.l}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <Select
              value={periodo || "none"}
              onValueChange={(v) => setPeriodo(v === "none" ? "" : (v as "MANHA" | "TARDE"))}
              disabled={busy}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="MANHA">Manhã</SelectItem>
                <SelectItem value="TARDE">Tarde</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={acumula}
              onChange={(e) => setAcumula(e.target.checked)}
              disabled={busy}
            />
            Acumula pedidos
          </label>
        </>
      )}

      {comando === "pedido" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Pedido id (só se editar)</Label>
            <Input value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} disabled={busy} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data entrega</Label>
            <Input
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
              required
              disabled={busy}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo venda</Label>
            <Select value={tipoVenda} onValueChange={setTipoVenda} disabled={busy}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVULSO">Avulso</SelectItem>
                <SelectItem value="RECORRENTE_SEMANAL">Recorrente semanal</SelectItem>
                <SelectItem value="RECORRENTE_QUINZENAL">Recorrente quinzenal</SelectItem>
                <SelectItem value="PLANO">Plano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Itens (uma linha: Produto; quantidade)</Label>
            <Textarea
              value={itensTexto}
              onChange={(e) => setItensTexto(e.target.value)}
              rows={4}
              disabled={busy}
              className="text-xs"
            />
          </div>
        </>
      )}

      {comando === "status" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Dia</Label>
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} disabled={busy} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={busy}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                <SelectItem value="PRONTO">PRONTO</SelectItem>
                <SelectItem value="ENTREGUE">ENTREGUE</SelectItem>
                <SelectItem value="CANCELADO">CANCELADO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {(comando === "cancelar" || comando === "data" || comando === "copiar_pedido") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Pedido id</Label>
          <Input value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} required disabled={busy} className="h-9" />
        </div>
      )}

      {(comando === "data" || comando === "copiar_pedido") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Data entrega</Label>
          <Input
            type="date"
            value={dataEntrega}
            onChange={(e) => setDataEntrega(e.target.value)}
            required
            disabled={busy}
            className="h-9"
          />
        </div>
      )}

      {(comando === "semana_copiar" || comando === "semana_fechar" || comando === "semana_reabrir") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Dia (qualquer da semana)</Label>
          <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} required disabled={busy} className="h-9" />
        </div>
      )}

      {comando === "semana_fechar" && (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={ignorarConciliacao}
            onChange={(e) => setIgnorarConciliacao(e.target.checked)}
            disabled={busy}
          />
          Ignorar conciliação Conta Azul
        </label>
      )}

      {comando === "avancado" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">operacao (camelCase da mutation)</Label>
            <Input
              value={operacaoAvancada}
              onChange={(e) => setOperacaoAvancada(e.target.value)}
              disabled={busy}
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">input JSON</Label>
            <Textarea
              value={jsonAvancado}
              onChange={(e) => setJsonAvancado(e.target.value)}
              rows={8}
              disabled={busy}
              className="font-mono text-xs"
            />
          </div>
        </>
      )}

      <Button type="submit" className="mt-auto gap-2" disabled={busy}>
        {preparar.isPending ? <Spinner className="size-4" /> : null}
        Preparar para confirmação
      </Button>
    </form>
  );
}
