import { z } from "zod";
import {
  manusAjusteScoreInputSchema,
  manusResumoConversaInputSchema,
  manusSugestaoCriativaInputSchema,
} from "@shared/comercial/manus";
import { router, comercialProcedure } from "../../_core/trpc";
import {
  manusAjusteScoreQualitativo,
  manusResumirConversa,
  manusSugestaoCriativa,
} from "../integrations/manus/manus.service";

export const manusRouter = router({
  resumoConversa: comercialProcedure.input(manusResumoConversaInputSchema).mutation(async ({ ctx, input }) => {
    const r = await manusResumirConversa(ctx.comercialEnv!, input.textoBruto);
    return r.ok ? r.data : r.fallback;
  }),

  sugestaoCriativa: comercialProcedure.input(manusSugestaoCriativaInputSchema).mutation(async ({ ctx, input }) => {
    const r = await manusSugestaoCriativa(ctx.comercialEnv!, {
      objetivo: input.objetivo,
      contexto: { clienteId: input.clienteId, ...(input.contextoEstruturado ?? {}) },
    });
    return r.ok ? r.data : r.fallback;
  }),

  ajusteScoreQualitativo: comercialProcedure.input(manusAjusteScoreInputSchema).mutation(async ({ ctx, input }) => {
    const r = await manusAjusteScoreQualitativo(ctx.comercialEnv!, {
      scoreBase: input.scoreBaseApi,
      sinais: input.sinaisQualitativos,
    });
    return r.ok ? r.data : r.fallback;
  }),

  pipelineQualitativo: comercialProcedure
    .input(
      z.object({
        clienteId: z.string(),
        textoBruto: z.string().min(1),
        objetivo: z.enum(["upsell", "cross_sell", "reativacao", "pos_venda"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resumo = await manusResumirConversa(ctx.comercialEnv!, input.textoBruto);
      const sugestao = await manusSugestaoCriativa(ctx.comercialEnv!, {
        objetivo: input.objetivo,
        contexto: { clienteId: input.clienteId, resumo: resumo.ok ? resumo.data.resumo : resumo.fallback.resumo },
      });
      return {
        resumo: resumo.ok ? resumo.data : resumo.fallback,
        sugestao: sugestao.ok ? sugestao.data : sugestao.fallback,
      };
    }),
});
