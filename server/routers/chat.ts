import { confirmAssistantActionsInputSchema } from "@shared/assistant-actions";
import { isOperationalAdminRole } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "../_core/env";
import { projetoIdFromCtx, projectProcedure, router } from "../_core/trpc";
import { executeAssistantActions } from "../assistant-actions/execute";
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
          operationCtx: {
            projetoId: pid,
            projetoTipo: projeto?.tipo ?? null,
            isAdmin: isOperationalAdminRole(ctx.user.role),
          },
        });
        return {
          reply: result.reply,
          modelUsed: result.modelUsed,
          webSearchUsed: result.webSearchUsed,
          pendingActions: result.pendingActions,
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

  /** Executa ações preparadas pelo assistente (após confirmação do utilizador). */
  confirmActions: projectProcedure
    .input(confirmAssistantActionsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
      }
      const pid = projetoIdFromCtx(ctx);
      const projeto = await db.getProjetoRow(pid);
      const { results } = await executeAssistantActions(
        {
          projetoId: pid,
          projetoTipo: projeto?.tipo ?? null,
          projetoModulos: ctx.projetoModulos,
          isAdmin: isOperationalAdminRole(ctx.user.role),
          userId: ctx.user.id,
          userName: ctx.user.name || "Usuário",
        },
        input.actions,
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0 && failed.length === results.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: failed.map((f) => f.message).join(" | "),
        });
      }
      return { results };
    }),
});
