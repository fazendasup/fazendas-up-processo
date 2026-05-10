import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const manutencoesRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllManutencoes(projetoIdFromCtx(ctx));
  }),
  create: projectProcedure
    .input(
      z.object({
        torreId: z.number(),
        andarNumero: z.number().optional(),
        tipo: z.string(),
        descricao: z.string(),
        dataAbertura: z.date(),
        prazo: z.date().optional(),
        lampadaIndex: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return db.createManutencao({
        ...input,
        projetoId: projetoIdFromCtx(ctx),
        abertoPorId: ctx.user.id,
        abertoPorNome: ctx.user.name || "Usuário",
      });
    }),
  update: projectProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string().optional(),
        dataConclusao: z.date().nullable().optional(),
        solucao: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (data.status === "concluida" || data.dataConclusao) {
        updateData.concluidoPorId = ctx.user.id;
        updateData.concluidoPorNome = ctx.user.name || "Usuário";
      }
      await db.updateManutencao(projetoIdFromCtx(ctx), id, updateData);
      return { success: true };
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteManutencao(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
