import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const medicoesCaixaRouter = router({
  listByCaixa: projectProcedure
    .input(z.object({ caixaAguaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const caixa = await db.getCaixaAguaById(projetoIdFromCtx(ctx), input.caixaAguaId);
      if (!caixa) return [];
      return db.getMedicoesByCaixaId(projetoIdFromCtx(ctx), input.caixaAguaId);
    }),
  create: projectProcedure
    .input(
      z.object({
        caixaAguaId: z.number(),
        ec: z.number(),
        ph: z.number(),
        dataHora: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const caixa = await db.getCaixaAguaById(projetoIdFromCtx(ctx), input.caixaAguaId);
      if (!caixa) {
        throw new Error("Caixa não encontrada");
      }
      return db.createMedicaoCaixa({
        ...input,
        projetoId: projetoIdFromCtx(ctx),
        executadoPorId: ctx.user.id,
        executadoPorNome: ctx.user.name || "Usuário",
      });
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteMedicaoCaixa(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
