import { projetoIdFromCtx, commercialEditorProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

const diasReceitaSchema = z.number().int().min(0).max(365).optional();
const phReceitaSchema = z.number().min(0).max(14).nullable().optional();
const percentualSchema = z.number().min(0).max(100).nullable().optional();
const temperaturaSchema = z.number().min(-10).max(60).nullable().optional();
const horasLuzSchema = z.number().min(0).max(24).nullable().optional();
const densidadeSchema = z.number().min(0).max(10_000).nullable().optional();
const yieldSchema = z.number().min(0).max(1_000_000).nullable().optional();

const receitaInputSchema = z.object({
  nome: z.string().min(1),
  variedadeId: z.number(),
  metodoColheita: z.string().optional(),
  diasGerminacao: diasReceitaSchema,
  diasMudas: diasReceitaSchema,
  diasVegetativa: diasReceitaSchema,
  diasMaturacao: diasReceitaSchema,
  ecPorFase: z.any().optional(),
  phPorFase: z.any().optional().nullable(),
  ph: phReceitaSchema,
  temperaturaMedia: temperaturaSchema,
  temperaturaMin: temperaturaSchema,
  temperaturaMax: temperaturaSchema,
  umidadeMedia: percentualSchema,
  umidadeMin: percentualSchema,
  umidadeMax: percentualSchema,
  horasLuz: horasLuzSchema,
  horasLuzPorFase: z.any().optional().nullable(),
  densidadePorPerfil: densidadeSchema,
  yieldEsperadoGramas: yieldSchema,
  observacoes: z.string().nullable().optional(),
});

export const receitasRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllReceitas(projetoIdFromCtx(ctx));
  }),
  getById: projectProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getReceitaById(projetoIdFromCtx(ctx), input.id);
    }),
  getByVariedade: projectProcedure
    .input(z.object({ variedadeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getReceitasByVariedadeId(projetoIdFromCtx(ctx), input.variedadeId);
    }),
  create: commercialEditorProjectProcedure
    .input(receitaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const projetoId = projetoIdFromCtx(ctx);
      const out = await db.createReceita({
        ...input,
        projetoId,
        criadoPorId: ctx.user.id,
        criadoPorNome: ctx.user.name || "Admin",
      });
      await db.syncPerfisReceitaIdParaVariedade(projetoId, input.variedadeId);
      await db.syncVariedadeDiasFromReceitaPrioritaria(projetoId, input.variedadeId);
      return out;
    }),
  update: commercialEditorProjectProcedure
    .input(
      receitaInputSchema.partial().extend({
        id: z.number(),
        ativa: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      const { id, ...data } = input;
      const antes = await db.getReceitaById(projetoId, id);
      await db.updateReceita(projetoId, id, data);
      const depois = await db.getReceitaById(projetoId, id);
      const vidNovo = depois?.variedadeId;
      if (vidNovo != null) await db.syncPerfisReceitaIdParaVariedade(projetoId, vidNovo);
      const vidAntigo = antes?.variedadeId;
      if (vidAntigo != null && vidAntigo !== vidNovo) {
        await db.syncPerfisReceitaIdParaVariedade(projetoId, vidAntigo);
      }
      return { success: true };
    }),
  delete: commercialEditorProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      const row = await db.getReceitaById(projetoId, input.id);
      const vid = row?.variedadeId;
      await db.deleteReceita(projetoId, input.id);
      if (vid != null) {
        await db.syncPerfisReceitaIdParaVariedade(projetoId, vid);
        await db.syncVariedadeDiasFromReceitaPrioritaria(projetoId, vid);
      }
      return { success: true };
    }),
});
