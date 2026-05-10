import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const ciclosRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllCiclos(projetoIdFromCtx(ctx));
  }),
  create: adminProjectProcedure
    .input(
      z.object({
        nome: z.string(),
        frequencia: z.string(),
        diasSemana: z.array(z.number()).optional(),
        intervaloDias: z.number().optional(),
        produto: z.string(),
        tipo: z.string(),
        dosagem: z.string().optional(),
        fasesAplicaveis: z.array(z.string()),
        alvo: z.string().default("caixa"),
        ativo: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.createCiclo({ ...input, projetoId: projetoIdFromCtx(ctx) });
    }),
  update: adminProjectProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        frequencia: z.string().optional(),
        diasSemana: z.array(z.number()).nullable().optional(),
        intervaloDias: z.number().nullable().optional(),
        produto: z.string().optional(),
        tipo: z.string().optional(),
        dosagem: z.string().nullable().optional(),
        fasesAplicaveis: z.array(z.string()).optional(),
        alvo: z.string().optional(),
        ativo: z.boolean().optional(),
        ultimaExecucao: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateCiclo(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  marcarExecutado: projectProcedure
    .input(
      z.object({
        id: z.number(),
        ultimaExecucao: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateCiclo(projetoIdFromCtx(ctx), input.id, {
        ultimaExecucao: input.ultimaExecucao,
        ultimoExecutorId: ctx.user.id,
        ultimoExecutorNome: ctx.user.name || "Usuário",
      });
      return { success: true };
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteCiclo(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
