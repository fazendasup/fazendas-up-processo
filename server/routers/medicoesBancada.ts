import { projetoIdFromCtx, hidroponiaProcedure, adminHidroponiaProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
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
      if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "Bancada não encontrada" });
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

  /** Admin: corrige EC/pH/temp sem apagar o registro; grava auditoria com valores anteriores. */
  update: adminHidroponiaProcedure
    .input(
      z.object({
        id: z.number(),
        ec: z.number(),
        ph: z.number(),
        temperaturaAgua: z.number().min(-5).max(60).optional().nullable(),
        temperaturaAmbiente: z.number().optional().nullable(),
        umidade: z.number().optional().nullable(),
        observacoes: z.string().optional().nullable(),
        motivo: z.string().max(255).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const updated = await db.updateMedicaoBancada(
        pid,
        input.id,
        {
          ec: input.ec,
          ph: input.ph,
          temperaturaAgua: input.temperaturaAgua ?? null,
          temperaturaAmbiente: input.temperaturaAmbiente ?? null,
          umidade: input.umidade ?? null,
          observacoes: input.observacoes ?? null,
        },
        {
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name || "Admin",
          motivo: input.motivo ?? null,
        },
      );
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Medição não encontrada" });
      }
      return { success: true as const };
    }),

  delete: adminHidroponiaProcedure
    .input(z.object({ id: z.number(), motivo: z.string().max(255).optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteMedicaoBancada(projetoIdFromCtx(ctx), input.id, {
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name || "Admin",
        motivo: input.motivo ?? null,
      });
      return { success: true as const };
    }),
});
