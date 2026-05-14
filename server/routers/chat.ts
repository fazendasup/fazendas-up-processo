import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "../_core/env";
import { projetoIdFromCtx, projectProcedure, router } from "../_core/trpc";
import { runFarmAssistantChat } from "../chat-assistant";
import { buildCompactFazendaSnapshotMarkdown } from "../chat-context";
import * as db from "../db";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(16_000),
});

export const chatRouter = router({
  /** Indica se o servidor tem chave OpenAI (sem expor segredos). */
  assistantStatus: projectProcedure.query(() => ({
    configured: Boolean(ENV.openAiApiKey?.trim()),
  })),

  sendMessage: projectProcedure
    .input(
      z.object({
        messages: z.array(chatMessageSchema).min(1).max(40),
        useWebSearch: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.openAiApiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Assistente não configurado: defina OPENAI_API_KEY no ambiente do servidor.",
        });
      }

      const pid = projetoIdFromCtx(ctx);
      const projeto = await db.getProjetoRow(pid);
      const [data, bancadas] = await Promise.all([
        db.loadFullFazendaData(pid),
        db.getAllBancadas(pid),
      ]);

      const snapshot = buildCompactFazendaSnapshotMarkdown(data, {
        projetoId: pid,
        projetoNome: projeto?.nome ?? `Projeto ${pid}`,
        bancadas,
      });

      const messages = input.messages.map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

      try {
        const result = await runFarmAssistantChat({
          snapshotMarkdown: snapshot,
          messages,
          useWebSearch: Boolean(input.useWebSearch),
        });
        return {
          reply: result.reply,
          modelUsed: result.modelUsed,
          webSearchUsed: result.webSearchUsed,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/OPENAI_API_KEY/i.test(msg)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: msg,
          });
        }
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: msg.length > 200 ? `${msg.slice(0, 200)}…` : msg,
        });
      }
    }),
});
