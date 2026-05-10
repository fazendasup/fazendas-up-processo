import { z } from "zod";
import { notifyOwner } from "./notification";
import { getMqttBridgeStatus } from "./mqtt";
import { APP_VERSION } from "./release-meta";
import { adminAutomacaoModuleProcedure, adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      }),
    )
    .query(() => ({
      ok: true,
      version: APP_VERSION,
      commit: process.env.GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /** Estado da ligação ao broker MQTT (sem credenciais). Admin + projeto ativo + módulo Automação. */
  mqttStatus: adminAutomacaoModuleProcedure.query(() => getMqttBridgeStatus()),
});
