import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const fasesConfigRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllFasesConfig(projetoIdFromCtx(ctx));
  }),
  upsert: adminProjectProcedure
    .input(
      z.object({
        fase: z.string(),
        label: z.string(),
        ecMin: z.number(),
        ecMax: z.number(),
        phMin: z.number(),
        phMax: z.number(),
        cor: z.string(),
        corLight: z.string(),
        icon: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.upsertFaseConfig({ ...input, projetoId: projetoIdFromCtx(ctx) });
      return { success: true };
    }),
});
