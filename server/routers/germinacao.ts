import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { syncPlanoAoCriarLoteGerminacao } from "../planoOperacaoSync";

export const germinacaoRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllGerminacao(projetoIdFromCtx(ctx));
  }),
  create: projectProcedure
    .input(
      z.object({
        variedadeId: z.number(),
        variedadeNome: z.string(),
        quantidade: z.number(),
        dataPlantio: z.date(),
        dataHora: z.date(),
        diasParaTransplantio: z.number().default(1),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      const result = await db.createGerminacao({
        ...input,
        projetoId: pid,
        executadoPorId: ctx.user.id,
        executadoPorNome: ctx.user.name || "Usuário",
      });
      await syncPlanoAoCriarLoteGerminacao(pid, input.variedadeId);
      return result;
    }),
  update: projectProcedure
    .input(
      z.object({
        id: z.number(),
        germinadas: z.number().optional(),
        naoGerminadas: z.number().optional(),
        transplantadas: z.number().optional(),
        status: z.string().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateGerminacao(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteGerminacao(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
