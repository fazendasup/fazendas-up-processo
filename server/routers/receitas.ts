import { projetoIdFromCtx, commercialEditorProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

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
    .input(
      z.object({
        nome: z.string(),
        variedadeId: z.number(),
        metodoColheita: z.string().optional(),
        diasGerminacao: z.number().optional(),
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        ecPorFase: z.any().optional(),
        phPorFase: z.any().optional().nullable(),
        ph: z.number().nullable().optional(),
        temperaturaMedia: z.number().nullable().optional(),
        temperaturaMin: z.number().nullable().optional(),
        temperaturaMax: z.number().nullable().optional(),
        umidadeMedia: z.number().nullable().optional(),
        umidadeMin: z.number().nullable().optional(),
        umidadeMax: z.number().nullable().optional(),
        horasLuz: z.number().nullable().optional(),
        horasLuzPorFase: z.any().optional().nullable(),
        densidadePorPerfil: z.number().nullable().optional(),
        yieldEsperadoGramas: z.number().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
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
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        variedadeId: z.number().optional(),
        metodoColheita: z.string().optional(),
        diasGerminacao: z.number().optional(),
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        ecPorFase: z.any().optional(),
        phPorFase: z.any().optional().nullable(),
        ph: z.number().nullable().optional(),
        temperaturaMedia: z.number().nullable().optional(),
        temperaturaMin: z.number().nullable().optional(),
        temperaturaMax: z.number().nullable().optional(),
        umidadeMedia: z.number().nullable().optional(),
        umidadeMin: z.number().nullable().optional(),
        umidadeMax: z.number().nullable().optional(),
        horasLuz: z.number().nullable().optional(),
        horasLuzPorFase: z.any().optional().nullable(),
        densidadePorPerfil: z.number().nullable().optional(),
        yieldEsperadoGramas: z.number().nullable().optional(),
        observacoes: z.string().nullable().optional(),
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
