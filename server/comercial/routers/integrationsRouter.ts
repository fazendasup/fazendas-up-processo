import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, comercialProcedure, comercialRequirePerfis } from "../../_core/trpc";
import {
  buildAuthorizationUrl,
  encodeOAuthState,
  safeReturnUrlForOAuth,
} from "../integrations/conta-azul/oauth.service";
import { runContaAzulSync } from "../integrations/conta-azul/sync.service";
import { runInteligenciaComercial } from "../services/inteligencia-comercial";

const syncCA = comercialRequirePerfis("ADMIN", "GERENTE_COMERCIAL");

export const integrationsRouter = router({
  /** URL completa para abrir no navegador — evita GET /auth via proxy/127.0.0.1 (causava loop em alguns ambientes). */
  urlAutorizacaoContaAzul: comercialProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(({ ctx, input }) => {
      const safe = safeReturnUrlForOAuth(input.returnUrl);
      if (!safe) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "URL de retorno inválida. Use a mesma origem do painel (ex.: https://app.fazendasup.com.br) ou localhost em desenvolvimento.",
        });
      }
      const state = encodeOAuthState({
        n: `st_${Math.random().toString(36).slice(2)}`,
        ru: safe,
      });
      const url = buildAuthorizationUrl(ctx.comercialEnv!, state);
      return { url };
    }),

  sincronizarContaAzul: comercialProcedure.use(syncCA).mutation(async ({ ctx }) => {
    try {
      const r = await runContaAzulSync(ctx.prisma!, ctx.comercialEnv!, { mode: "manual" });
      return { ok: true as const, ...r };
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Falha na sincronização",
      });
    }
  }),

  /** Recalcula score, riscos e oportunidades [sistema] só com base nos pedidos já importados (útil sem novo sync CA). */
  aplicarInteligenciaComercial: comercialProcedure.use(syncCA).mutation(async ({ ctx }) => {
    try {
      return await runInteligenciaComercial(ctx.prisma!);
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Falha ao aplicar inteligência comercial",
      });
    }
  }),
});
