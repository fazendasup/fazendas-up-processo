import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const caixasAguaRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllCaixasAgua(projetoIdFromCtx(ctx));
  }),
  create: adminProjectProcedure
    .input(
      z.object({
        slug: z.string(),
        nome: z.string(),
        fase: z.enum(["mudas", "vegetativa", "maturacao"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.createCaixaAgua({ ...input, projetoId: projetoIdFromCtx(ctx) });
    }),
});
