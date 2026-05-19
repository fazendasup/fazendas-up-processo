import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const variedadesRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllVariedades(projetoIdFromCtx(ctx));
  }),
  create: adminProjectProcedure
    .input(
      z.object({
        slug: z.string().optional(),
        nome: z.string(),
        /** Legado: prazos vivem na receita; omitir usa defaults do BD. */
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        babyLeaf: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug =
        input.slug ||
        `${input.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now().toString(36)}`;
      return db.createVariedade({
        projetoId: projetoIdFromCtx(ctx),
        slug,
        nome: input.nome,
        diasMudas: input.diasMudas ?? 14,
        diasVegetativa: input.diasVegetativa ?? 21,
        diasMaturacao: input.diasMaturacao ?? 28,
        babyLeaf: input.babyLeaf ?? false,
      });
    }),
  update: adminProjectProcedure
    .input(
      z.object({
        id: z.number(),
        slug: z.string().optional(),
        nome: z.string().optional(),
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        babyLeaf: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateVariedade(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteVariedade(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
