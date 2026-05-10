import { projetoIdFromCtx, hidroponiaProcedure, adminHidroponiaProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const aplicacoesBancadaRouter = router({
  listByBancada: hidroponiaProcedure
    .input(z.object({ bancadaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const b = await db.getBancadaById(pid, input.bancadaId);
      if (!b) return [];
      return db.getAplicacoesByBancadaId(pid, input.bancadaId);
    }),

  create: hidroponiaProcedure
    .input(
      z.object({
        bancadaId: z.number(),
        tipoAplicacao: z.string().min(1),
        produto: z.string().min(1),
        quantidade: z.number().optional(),
        unidade: z.string().optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const b = await db.getBancadaById(pid, input.bancadaId);
      if (!b) throw new Error("Bancada não encontrada");
      const uid = ctx.user?.id;
      return db.createAplicacaoBancada({
        projetoId: pid,
        bancadaId: input.bancadaId,
        tipoAplicacao: input.tipoAplicacao,
        produto: input.produto,
        quantidade: input.quantidade ?? null,
        unidade: input.unidade ?? null,
        observacoes: input.observacoes ?? null,
        aplicadoPor: uid ?? null,
      });
    }),

  delete: adminHidroponiaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteAplicacaoBancada(projetoIdFromCtx(ctx), input.id);
      return { success: true as const };
    }),
});
