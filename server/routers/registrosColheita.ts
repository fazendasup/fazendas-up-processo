import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { syncPlanoFromColheita } from "../planoOperacaoSync";

export const registrosColheitaRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllRegistrosColheita(projetoIdFromCtx(ctx));
  }),
  listByAndar: projectProcedure
    .input(z.object({ andarId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getRegistrosColheitaByAndarId(projetoIdFromCtx(ctx), input.andarId);
    }),
  create: projectProcedure
    .input(
      z.object({
        torreId: z.number(),
        andarId: z.number(),
        variedadeId: z.number().nullable().optional(),
        variedadeNome: z.string().nullable().optional(),
        receitaId: z.number().nullable().optional(),
        dataColheita: z.date(),
        quantidadePlantas: z.number(),
        pesoTotalGramas: z.number().nullable().optional(),
        qualidade: z.string().optional(),
        destino: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      const result = await db.createRegistroColheita({
        ...input,
        projetoId: pid,
        executadoPorId: ctx.user.id,
        executadoPorNome: ctx.user.name || "Usuário",
      });
      await syncPlanoFromColheita(pid, input.variedadeId ?? null);
      return result;
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteRegistroColheita(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
