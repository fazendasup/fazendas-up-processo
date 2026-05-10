import {
  adminInteligenciaProjectProcedure,
  inteligenciaModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

export const regrasRouter = router({
  list: inteligenciaModuleProcedure.query(async ({ ctx }) => {
    return db.getAllRules(projetoIdFromCtx(ctx));
  }),
  getById: inteligenciaModuleProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const rule = await db.getRuleById(projetoIdFromCtx(ctx), input.id);
      if (!rule) throw new TRPCError({ code: "NOT_FOUND", message: "Regra não encontrada" });
      return rule;
    }),
  create: adminInteligenciaProjectProcedure
    .input(
      z.object({
        nome: z.string(),
        tipo: z.string(),
        gatilho: z.string(),
        condicao: z.string(),
        acaoSugerida: z.string(),
        faseAplicavel: z.string().nullable().optional(),
        prioridadePadrao: z.string().optional(),
        severidadePadrao: z.string().optional(),
        fonte: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return db.createRule({
        ...input,
        projetoId: projetoIdFromCtx(ctx),
        criadoPorId: ctx.user.id,
        criadoPorNome: ctx.user.name || "Admin",
      });
    }),
  update: adminInteligenciaProjectProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        tipo: z.string().optional(),
        gatilho: z.string().optional(),
        condicao: z.string().optional(),
        acaoSugerida: z.string().optional(),
        faseAplicavel: z.string().nullable().optional(),
        prioridadePadrao: z.string().optional(),
        severidadePadrao: z.string().optional(),
        ativo: z.boolean().optional(),
        fonte: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateRule(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  aprovar: adminInteligenciaProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateRule(projetoIdFromCtx(ctx), input.id, {
        aprovadoPorId: ctx.user.id,
        aprovadoPorNome: ctx.user.name || "Admin",
      });
      return { success: true };
    }),
  delete: adminInteligenciaProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteRule(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
