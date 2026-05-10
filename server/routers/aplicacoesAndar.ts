import { projetoIdFromCtx, adminFazendaVerticalProcedure, fazendaVerticalProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const aplicacoesAndarRouter = router({
  listByAndar: fazendaVerticalProcedure
    .input(z.object({ andarId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAplicacoesByAndarId(projetoIdFromCtx(ctx), input.andarId);
    }),
  create: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        tipo: z.string(),
        produto: z.string(),
        quantidade: z.string(),
        dataHora: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return db.createAplicacaoAndar({
        ...input,
        projetoId: projetoIdFromCtx(ctx),
        executadoPorId: ctx.user!.id,
        executadoPorNome: ctx.user!.name || "Usuário",
      });
    }),
  delete: adminFazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteAplicacaoAndar(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
