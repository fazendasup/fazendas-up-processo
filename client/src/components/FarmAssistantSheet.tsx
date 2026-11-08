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
import { ComandosComerciaisPanel } from "@/components/ComandosComerciaisPanel";

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

type ModoAssistente = "comandos" | "chat";

export function FarmAssistantSheet({ open, onOpenChange }: FarmAssistantSheetProps) {
  const { activeProjetoId } = useProjeto();
  const [messages, setMessages] = useState<Message[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAssistantAction[]>([]);
  const [modo, setModo] = useState<ModoAssistente>("comandos");

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

  const openaiOk = Boolean(assistantStatus.data?.configured);
  const comandosOk = Boolean(assistantStatus.data?.comandosComerciaisDisponiveis);

  useEffect(() => {
    if (!assistantStatus.data) return;
    if (!openaiOk && comandosOk) setModo("comandos");
    else if (openaiOk && !comandosOk) setModo("chat");
  }, [assistantStatus.data, openaiOk, comandosOk]);

  const handleSend = useCallback(
    (content: string) => {
      if (assistantStatus.data && !assistantStatus.data.configured) {
        toast.error(
          "Chat com IA indisponível. Use a aba Comandos (sem OpenAI) ou configure OPENAI_API_KEY.",
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
            try {
              await utils.comercial.invalidate();
            } catch {
              /* módulo comercial pode não estar no client tree */
            }
          }
          for (const f of fail) {
            toast.error(f.message);
          }
          setPendingActions([]);
          if (modo === "chat") {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  fail.length === 0
                    ? `Executado: ${ok.map((r) => r.message).join(" ")}`
                    : `Resultado: ${data.results.map((r) => (r.ok ? "OK" : "ERRO") + " " + r.message).join("\n")}`,
              },
            ]);
          }
        },
      },
    );
  }, [confirmMutation, modo, pendingActions, utils.comercial, utils.fazenda.loadAll]);

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
            Comandos estruturados funcionam sem OpenAI. Chat com IA é opcional (precisa de chave).
            Operações sempre pedem confirmação antes de gravar.
          </SheetDescription>
        </SheetHeader>

        {(comandosOk || openaiOk) && (
          <div className="flex shrink-0 gap-1 border-b px-4 py-2">
            {comandosOk && (
              <Button
                type="button"
                size="sm"
                variant={modo === "comandos" ? "default" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setModo("comandos")}
              >
                Comandos
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={modo === "chat" ? "default" : "ghost"}
              className="h-8 text-xs"
              disabled={!openaiOk}
              title={!openaiOk ? "Configure OPENAI_API_KEY para o chat" : undefined}
              onClick={() => openaiOk && setModo("chat")}
            >
              Chat IA
            </Button>
          </div>
        )}

        {modo === "chat" && openaiOk && (
          <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <Switch
                id="farm-assistant-web"
                checked={useWebSearch}
                onCheckedChange={setUseWebSearch}
                disabled={sendMutation.isPending || confirmMutation.isPending}
              />
              <Label htmlFor="farm-assistant-web" className="cursor-pointer text-xs font-normal leading-snug">
                Pesquisa na web (desativa execução de operações)
              </Label>
            </div>
          </div>
        )}

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
          ) : !comandosOk && !openaiOk ? (
            <Alert variant="destructive" className="m-1 border-destructive/80">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>Assistente indisponível</AlertTitle>
              <AlertDescription className="text-destructive/95 space-y-2">
                <p>
                  Sem OpenAI e sem permissão de escrita comercial. Peça acesso comercial
                  (COMERCIAL/OPERACOES/GERENTE/ADMIN) ou configure{" "}
                  <code className="rounded bg-destructive/15 px-1 py-0.5 text-xs">OPENAI_API_KEY</code>.
                </p>
              </AlertDescription>
            </Alert>
          ) : modo === "comandos" && comandosOk ? (
            <ComandosComerciaisPanel
              disabled={confirmMutation.isPending}
              onPrepared={(actions) => setPendingActions(actions)}
            />
          ) : modo === "chat" && openaiOk ? (
            <Suspense
              fallback={
                <div
                  className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed"
                  aria-busy="true"
                  aria-label="Carregando assistente"
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
                emptyStateMessage="Ex.: “Quais clientes merecem ação comercial hoje?” — ou use a aba Comandos para alterar Pedidos sem IA."
                suggestedPrompts={[
                  "Resumo operacional objetivo do projeto neste momento.",
                  "Quais são os principais insights comerciais dos últimos 90 dias? Priorize ações práticas.",
                  "Liste clientes em risco, oportunidades abertas e produtos com maior potencial de venda.",
                ]}
              />
            </Suspense>
          ) : (
            <Alert className="m-1">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>Chat IA desligado</AlertTitle>
              <AlertDescription>
                Use a aba <strong>Comandos</strong> para alterar Pedidos sem OpenAI.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
