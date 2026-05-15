"use client";

import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useProjeto } from "@/contexts/ProjetoContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Sparkles, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Message } from "@/components/AIChatBox";
import type { PendingAssistantAction } from "@shared/assistant-actions";

/** streamdown/shiki são pesados — só carregar o chunk quando o sheet abre. */
const AIChatBox = lazy(() =>
  import(/* @vite-ignore */ "@/components/AIChatBox").then((m) => ({ default: m.AIChatBox })),
);

function summaryToPlain(summary: string): string {
  return summary.replace(/\*\*/g, "");
}

export type FarmAssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FarmAssistantSheet({ open, onOpenChange }: FarmAssistantSheetProps) {
  const { activeProjetoId } = useProjeto();
  const [messages, setMessages] = useState<Message[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAssistantAction[]>([]);

  const utils = trpc.useUtils();

  useEffect(() => {
    setMessages([]);
    setPendingActions([]);
  }, [activeProjetoId]);

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const confirmMutation = trpc.chat.confirmActions.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const assistantStatus = trpc.chat.assistantStatus.useQuery(undefined, {
    enabled: open && activeProjetoId != null,
    staleTime: 60_000,
  });

  const handleSend = useCallback(
    (content: string) => {
      if (assistantStatus.data && !assistantStatus.data.configured) {
        toast.error(
          "Assistente indisponível: defina OPENAI_API_KEY no servidor (ex.: variáveis do Railway).",
        );
        return;
      }
      const userMsg: Message = { role: "user", content };
      const before = messages;
      const history = [...messages, userMsg];
      setMessages(history);
      setPendingActions([]);

      sendMutation.mutate(
        {
          messages: history
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          useWebSearch,
        },
        {
          onSuccess: (res) => {
            setMessages([
              ...history,
              { role: "assistant", content: res.reply },
            ]);
            if (res.pendingActions?.length) {
              setPendingActions(res.pendingActions);
            }
          },
          onError: () => {
            setMessages(before);
          },
        },
      );
    },
    [assistantStatus.data, messages, sendMutation, useWebSearch],
  );

  const handleConfirmActions = useCallback(() => {
    if (pendingActions.length === 0) return;
    confirmMutation.mutate(
      { actions: pendingActions },
      {
        onSuccess: async (data) => {
          const ok = data.results.filter((r) => r.ok);
          const fail = data.results.filter((r) => !r.ok);
          if (ok.length > 0) {
            toast.success(
              ok.length === 1 ? ok[0]!.message : `${ok.length} ação(ões) executada(s) com sucesso.`,
            );
            await utils.fazenda.loadAll.invalidate();
          }
          for (const f of fail) {
            toast.error(f.message);
          }
          setPendingActions([]);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                fail.length === 0
                  ? `✅ Executado: ${ok.map((r) => r.message).join(" ")}`
                  : `Resultado: ${data.results.map((r) => (r.ok ? "✅" : "❌") + " " + r.message).join("\n")}`,
            },
          ]);
        },
      },
    );
  }, [confirmMutation, pendingActions, utils.fazenda.loadAll]);

  const operationsDisabled = useWebSearch || sendMutation.isPending || confirmMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Assistente Fazendas Up
          </SheetTitle>
          <SheetDescription className="text-xs">
            Pode executar transplantio, concluir tarefas do dia e outras operações — sempre com confirmação
            antes de gravar. Não apaga dados do sistema.
          </SheetDescription>
        </SheetHeader>

        <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Switch
              id="farm-assistant-web"
              checked={useWebSearch}
              onCheckedChange={setUseWebSearch}
              disabled={
                sendMutation.isPending ||
                confirmMutation.isPending ||
                assistantStatus.isLoading ||
                (assistantStatus.data != null && !assistantStatus.data.configured)
              }
            />
            <Label htmlFor="farm-assistant-web" className="cursor-pointer text-xs font-normal leading-snug">
              Pesquisa na web (desativa execução de operações)
            </Label>
          </div>
        </div>

        {pendingActions.length > 0 && (
          <div className="shrink-0 space-y-2 border-b bg-amber-500/10 px-4 py-3">
            <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
              Confirme antes de executar ({pendingActions.length} ação
              {pendingActions.length > 1 ? "ões" : ""})
            </p>
            <ul className="max-h-36 space-y-2 overflow-y-auto text-xs text-foreground/90">
              {pendingActions.map((a) => (
                <li key={a.id} className="whitespace-pre-wrap rounded-md border bg-background/80 p-2">
                  {summaryToPlain(a.summary)}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1 gap-1"
                disabled={confirmMutation.isPending}
                onClick={handleConfirmActions}
              >
                {confirmMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                )}
                Confirmar e executar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={confirmMutation.isPending}
                onClick={() => setPendingActions([])}
                aria-label="Cancelar ações pendentes"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden p-2">
          {assistantStatus.isLoading && open ? (
            <div
              className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed"
              aria-busy="true"
              aria-label="A verificar configuração do assistente"
            >
              <Spinner className="size-8 text-muted-foreground" />
            </div>
          ) : assistantStatus.data && !assistantStatus.data.configured ? (
            <Alert variant="destructive" className="m-1 border-destructive/80">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>Assistente não configurado</AlertTitle>
              <AlertDescription className="text-destructive/95">
                O servidor precisa da variável de ambiente{" "}
                <code className="rounded bg-destructive/15 px-1 py-0.5 text-xs">OPENAI_API_KEY</code>{" "}
                (ex.: painel do Railway → Variables).
              </AlertDescription>
            </Alert>
          ) : (
            <Suspense
              fallback={
                <div
                  className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed"
                  aria-busy="true"
                  aria-label="A carregar assistente"
                >
                  <Spinner className="size-8 text-muted-foreground" />
                </div>
              }
            >
              <AIChatBox
                messages={messages}
                onSendMessage={handleSend}
                isLoading={operationsDisabled}
                placeholder="Pergunte sobre dados do projeto, peça um resumo ou um insight…"
                height="calc(100vh - 11rem)"
                className="h-full min-h-[280px] rounded-lg border-0 shadow-none"
                emptyStateMessage="Ex.: “Resumo objetivo do projeto agora” ou “Quais planos estão na fila de germinação?” — respostas usam o resumo operacional enviado com a mensagem. Operações (transplantio, etc.) continuam disponíveis por texto; use com confirmação."
                suggestedPrompts={[
                  "Resumo operacional objetivo do projeto neste momento.",
                  "Quais planos de plantio estão activos, em que status, e quais estão na fila de germinação / plantio inicial?",
                  "Como está a ocupação das torres por fase? Há capacidade livre ou gargalos a destacar?",
                  "Liste tarefas pendentes para hoje e atrasadas por prioridade — só descreva, sem concluir nem alterar.",
                  "Que ciclos de dosagem ou automação estão activos e a que fases ou caixas se aplicam?",
                  "Um único insight de gestão a partir dos dados: maior risco ou oportunidade operacional hoje.",
                ]}
              />
            </Suspense>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
