import { projetoIdFromCtx, hidroponiaProcedure, adminHidroponiaProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const medicoesBancadaRouter = router({
  listByBancada: hidroponiaProcedure
    .input(z.object({ bancadaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const b = await db.getBancadaById(pid, input.bancadaId);
      if (!b) return [];
      return db.getMedicoesByBancadaId(pid, input.bancadaId);
    }),

  ultimasPorProjeto: hidroponiaProcedure.query(async ({ ctx }) => {
    return db.getUltimasMedicoesPorProjeto(projetoIdFromCtx(ctx));
  }),

  create: hidroponiaProcedure
    .input(
      z.object({
        bancadaId: z.number(),
        ec: z.number(),
        ph: z.number(),
        temperaturaAgua: z.number().optional().nullable(),
        temperaturaAmbiente: z.number().optional().nullable(),
        umidade: z.number().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const b = await db.getBancadaById(pid, input.bancadaId);
      if (!b) throw new Error("Bancada não encontrada");
      const uid = ctx.user?.id;
      return db.createMedicaoBancada({
        projetoId: pid,
        bancadaId: input.bancadaId,
        ec: input.ec,
        ph: input.ph,
        temperaturaAgua: input.temperaturaAgua ?? null,
        temperaturaAmbiente: input.temperaturaAmbiente ?? null,
        umidade: input.umidade ?? null,
        observacoes: input.observacoes ?? null,
        medidoPor: uid ?? null,
      });
    }),

  delete: adminHidroponiaProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteMedicaoBancada(projetoIdFromCtx(ctx), input.id);
      return { success: true as const };
    }),
});
