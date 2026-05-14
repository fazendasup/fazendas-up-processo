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
import { trpc } from "@/lib/trpc";
import { useProjeto } from "@/contexts/ProjetoContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Sparkles } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Message } from "@/components/AIChatBox";

/** streamdown/shiki são pesados — só carregar o chunk quando o sheet abre. */
const AIChatBox = lazy(() =>
  import(/* @vite-ignore */ "@/components/AIChatBox").then((m) => ({ default: m.AIChatBox })),
);

export type FarmAssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FarmAssistantSheet({ open, onOpenChange }: FarmAssistantSheetProps) {
  const { activeProjetoId } = useProjeto();
  const [messages, setMessages] = useState<Message[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);

  useEffect(() => {
    setMessages([]);
  }, [activeProjetoId]);

  const sendMutation = trpc.chat.sendMessage.useMutation({
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
          },
          onError: () => {
            setMessages(before);
          },
        },
      );
    },
    [assistantStatus.data, messages, sendMutation, useWebSearch],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Assistente Fazendas Up
          </SheetTitle>
          <SheetDescription className="text-xs">
            Interpreta os dados do projeto atual e pode usar pesquisa na web para referências globais.
          </SheetDescription>
        </SheetHeader>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Switch
              id="farm-assistant-web"
              checked={useWebSearch}
              onCheckedChange={setUseWebSearch}
              disabled={
                sendMutation.isPending ||
                assistantStatus.isLoading ||
                (assistantStatus.data != null && !assistantStatus.data.configured)
              }
            />
            <Label htmlFor="farm-assistant-web" className="cursor-pointer text-xs font-normal leading-snug">
              Pesquisa na web (boas práticas e referências recentes)
            </Label>
          </div>
        </div>

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
                (ex.: painel do Railway → Variables). Sem a chave, o chat não consegue chamar a API
                OpenAI. Opcionalmente ajuste{" "}
                <code className="rounded bg-destructive/15 px-1 py-0.5 text-xs">OPENAI_CHAT_MODEL</code>{" "}
                e{" "}
                <code className="rounded bg-destructive/15 px-1 py-0.5 text-xs">OPENAI_RESPONSES_MODEL</code>{" "}
                se a sua conta usar outros modelos.
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
                isLoading={sendMutation.isPending}
                placeholder="Pergunte sobre operação, cultivo ou dados do projeto…"
                height="calc(100vh - 11rem)"
                className="h-full min-h-[280px] rounded-lg border-0 shadow-none"
                emptyStateMessage="Pergunte sobre a operação, cultivo ou boas práticas. Os dados do projeto entram automaticamente no contexto."
                suggestedPrompts={[
                  "Dá um resumo operacional objetivo do meu projeto agora.",
                  "Quais tarefas ou riscos eu deveria priorizar esta semana?",
                  "Boas práticas de pH e EC em hidroponia para a minha fase atual.",
                ]}
              />
            </Suspense>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
