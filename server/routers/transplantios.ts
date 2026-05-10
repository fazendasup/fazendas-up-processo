import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { syncPlanoFromTransplantio } from "../planoOperacaoSync";

export const transplantiosRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllTransplantios(projetoIdFromCtx(ctx));
  }),
  create: projectProcedure
    .input(
      z.object({
        dataHora: z.date(),
        torreOrigemId: z.number().nullable().optional(),
        andarOrigemId: z.number().nullable().optional(),
        faseOrigem: z.string(),
        faseDestino: z.string(),
        variedadeId: z.number(),
        variedadeNome: z.string(),
        quantidadeTransplantada: z.number(),
        quantidadeDesperdicio: z.number().default(0),
        motivoDesperdicio: z.string().optional(),
        torreDestinoId: z.number().optional(),
        andarDestinoId: z.number().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      const result = await db.createTransplantio({
        ...input,
        projetoId: pid,
        executadoPorId: ctx.user.id,
        executadoPorNome: ctx.user.name || "Usuário",
      });
      await syncPlanoFromTransplantio(
        pid,
        input.variedadeId,
        input.faseOrigem,
        input.faseDestino,
        input.quantidadeTransplantada,
      );
      return result;
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteTransplantio(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
