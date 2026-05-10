import { projetoIdFromCtx, hidroponiaProcedure, adminHidroponiaProcedure, router } from "../_core/trpc";
import type { InsertBancada } from "../../drizzle/schema";
import { z } from "zod";
import * as db from "../db";

const faseEnum = z.enum(["mudas", "vegetativa", "maturacao"]);

export const bancadasRouter = router({
  list: hidroponiaProcedure.query(async ({ ctx }) => {
    return db.getAllBancadas(projetoIdFromCtx(ctx));
  }),

  getById: hidroponiaProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getBancadaById(projetoIdFromCtx(ctx), input.id);
    }),

  /** Variedade + datas do cultivo na linha inteira (operador hidroponia, não só admin). */
  updatePlantio: hidroponiaProcedure
    .input(
      z.object({
        id: z.number(),
        plantioVariedadeId: z.number().nullable(),
        plantioDataEntrada: z.coerce.date().nullable(),
        plantioPrevisaoColheita: z.coerce.date().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const row = await db.getBancadaById(pid, input.id);
      if (!row) throw new Error("Bancada não encontrada");
      await db.updateBancada(pid, input.id, {
        plantioVariedadeId: input.plantioVariedadeId,
        plantioDataEntrada: input.plantioDataEntrada,
        plantioPrevisaoColheita: input.plantioPrevisaoColheita,
      });
      return { success: true as const };
    }),

  create: adminHidroponiaProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        fase: faseEnum,
        codigo: z.string().optional(),
        quantidadeCaixas: z.number().int().min(1).default(1),
        tipoCultivo: z.string().optional(),
        comprimentoMetros: z.string().optional(),
        compartilhada: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      return db.createBancadaWithDefaults(pid, {
        nome: input.nome,
        fase: input.fase,
        codigo: input.codigo ?? null,
        quantidadeCaixas: input.quantidadeCaixas,
        tipoCultivo: input.tipoCultivo ?? null,
        comprimentoMetros: input.comprimentoMetros ?? null,
        compartilhada: input.compartilhada,
      });
    }),

  update: adminHidroponiaProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        fase: faseEnum.optional(),
        codigo: z.string().nullable().optional(),
        quantidadeCaixas: z.number().int().min(1).optional(),
        tipoCultivo: z.string().nullable().optional(),
        comprimentoMetros: z.string().nullable().optional(),
        status: z.enum(["ativa", "inativa", "manutencao"]).optional(),
        ativa: z.boolean().optional(),
        compartilhada: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const { id, ...rest } = input;
      const payload: Partial<InsertBancada> = {};
      if (rest.nome !== undefined) payload.nome = rest.nome;
      if (rest.fase !== undefined) payload.fase = rest.fase;
      if (rest.codigo !== undefined) payload.codigo = rest.codigo;
      if (rest.quantidadeCaixas !== undefined) payload.quantidadeCaixas = rest.quantidadeCaixas;
      if (rest.tipoCultivo !== undefined) payload.tipoCultivo = rest.tipoCultivo;
      if (rest.comprimentoMetros !== undefined) payload.comprimentoMetros = rest.comprimentoMetros;
      if (rest.status !== undefined) payload.status = rest.status;
      if (rest.ativa !== undefined) payload.ativa = rest.ativa;
      if (rest.compartilhada !== undefined) payload.compartilhada = rest.compartilhada;
      await db.updateBancada(pid, id, payload);
      if (rest.quantidadeCaixas !== undefined) {
        await db.syncCaixasBancadaForBancada(pid, id, rest.quantidadeCaixas);
      }
      return { success: true as const };
    }),

  updateQuantidadeCaixas: adminHidroponiaProcedure
    .input(z.object({ id: z.number(), quantidadeCaixas: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateBancadaQuantidadeCaixas(projetoIdFromCtx(ctx), input.id, input.quantidadeCaixas);
      return { success: true as const };
    }),

  delete: adminHidroponiaProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await db.deleteBancada(projetoIdFromCtx(ctx), input.id);
    return { success: true as const };
  }),
});
