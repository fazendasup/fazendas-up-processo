"use client";

import { AIChatBox, type Message } from "@/components/AIChatBox";
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
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

  const handleSend = useCallback(
    (content: string) => {
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
    [messages, sendMutation, useWebSearch],
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
              disabled={sendMutation.isPending}
            />
            <Label htmlFor="farm-assistant-web" className="cursor-pointer text-xs font-normal leading-snug">
              Pesquisa na web (boas práticas e referências recentes)
            </Label>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-2">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
