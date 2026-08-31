import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
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
        temperaturaAgua: z.number().min(-5).max(60),
        dataHora: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const caixa = await db.getCaixaAguaById(projetoIdFromCtx(ctx), input.caixaAguaId);
      if (!caixa) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Caixa não encontrada" });
      }
      return db.createMedicaoCaixa({
        ...input,
        projetoId: projetoIdFromCtx(ctx),
        executadoPorId: ctx.user.id,
        executadoPorNome: ctx.user.name || "Usuário",
      });
    }),
  /** Admin: corrige EC/pH/temp sem apagar o registro; grava auditoria com valores anteriores. */
  update: adminProjectProcedure
    .input(
      z.object({
        id: z.number(),
        ec: z.number(),
        ph: z.number(),
        temperaturaAgua: z.number().min(-5).max(60),
        dataHora: z.date().optional(),
        motivo: z.string().max(255).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const updated = await db.updateMedicaoCaixa(
        pid,
        input.id,
        {
          ec: input.ec,
          ph: input.ph,
          temperaturaAgua: input.temperaturaAgua,
          dataHora: input.dataHora,
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
  delete: adminProjectProcedure
    .input(z.object({ id: z.number(), motivo: z.string().max(255).optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteMedicaoCaixa(projetoIdFromCtx(ctx), input.id, {
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name || "Admin",
        motivo: input.motivo ?? null,
      });
      return { success: true };
    }),
});
