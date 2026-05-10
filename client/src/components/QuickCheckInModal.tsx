import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

type TarefaLike = {
  id: number;
  titulo: string;
  descricao?: string | null;
  tipo: string;
  prioridade: string;
  torreId?: number | null;
  andarNumero?: number | null;
  caixaAguaId?: number | null;
  cicloId?: number | null;
};

export function QuickCheckInModal({
  tarefa,
  open,
  onOpenChange,
  onDone,
}: {
  tarefa: TarefaLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [observacoes, setObservacoes] = useState("");
  const [force, setForce] = useState(false);
  const [dupInfo, setDupInfo] = useState<{ ultimaAplicacaoIso: string | null } | null>(null);

  const quickConfirm = trpc.tarefas.quickConfirm.useMutation();

  useEffect(() => {
    if (!open) {
      setObservacoes("");
      setForce(false);
      setDupInfo(null);
    }
  }, [open]);

  const resumo = useMemo(() => {
    if (!tarefa) return null;
    const now = new Date();
    return {
      titulo: tarefa.titulo,
      tipo: tarefa.tipo,
      prioridade: tarefa.prioridade,
      torre: tarefa.torreId ? `T${tarefa.torreId}` : null,
      andar: tarefa.andarNumero ? `A${tarefa.andarNumero}` : null,
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  }, [tarefa]);

  const handleConfirm = async () => {
    if (!tarefa) return;
    setDupInfo(null);
    const res = await quickConfirm.mutateAsync({
      tarefaId: tarefa.id,
      observacoes: observacoes.trim() || undefined,
      force,
    } as any);

    // Em caso de bloqueio por duplicidade, o backend devolve success:false com detalhes.
    if ((res as any)?.blocked && (res as any)?.reason === "duplicada_hoje") {
      setDupInfo({ ultimaAplicacaoIso: (res as any)?.ultimaAplicacao ?? null });
      return;
    }

    onDone();
    onOpenChange(false);
  };

  const dupText = dupInfo?.ultimaAplicacaoIso
    ? new Date(dupInfo.ultimaAplicacaoIso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>✓ Confirmar tarefa</DialogTitle>
        </DialogHeader>

        {!tarefa || !resumo ? (
          <div className="text-sm text-muted-foreground">Selecione uma tarefa.</div>
        ) : (
          <div className="space-y-3">
            <Card className="p-3 bg-emerald-50 border-emerald-200">
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold">{resumo.titulo}</p>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                  <span>Tipo: {resumo.tipo}</span>
                  <span>Prioridade: {resumo.prioridade}</span>
                  {resumo.torre && <span>{resumo.torre}</span>}
                  {resumo.andar && <span>{resumo.andar}</span>}
                  <span>Hora: {resumo.hora}</span>
                </div>
              </div>
            </Card>

            {dupInfo && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cuidado</AlertTitle>
                <AlertDescription>
                  Parece que este ciclo já foi registrado hoje{dupText ? ` às ${dupText}` : ""}. Confirmar novamente pode
                  gerar duplicidade.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Observações (opcional)</label>
              <Textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: feito com atraso por falta de insumo..."
              />
            </div>

            {dupInfo && (
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setForce(true)}
              >
                Aplicar mesmo assim
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={quickConfirm.isPending}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirm}
                disabled={quickConfirm.isPending}
              >
                ✓ Confirmar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

