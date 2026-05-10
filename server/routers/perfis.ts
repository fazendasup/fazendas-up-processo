import { projetoIdFromCtx, fazendaVerticalProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { receitaCicloPrioritariaParaVariedade } from "@shared/cicloReceita";
import type { InsertPerfil } from "../../drizzle/schema";

async function assertAndarAtivo(projetoId: number, andarId: number) {
  const andar = await db.getAndarById(projetoId, andarId);
  if (!andar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
  const torre = await db.getTorreById(projetoId, andar.torreId);
  if (!torre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
  if (torre.ativa === false) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A torre está desativada e não aceita operações" });
  }
}

export const perfisRouter = router({
  listByAndar: fazendaVerticalProcedure
    .input(z.object({ andarId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getPerfisByAndarId(projetoIdFromCtx(ctx), input.andarId);
    }),
  update: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        perfilIndex: z.number(),
        variedadeId: z.number().nullable().optional(),
        ativo: z.boolean().optional(),
        dataEntrada: z.date().nullable().optional(),
        cultivoStatus: z.enum(["vazio", "plantado", "colhido"]).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      const { andarId, perfilIndex, variedadeId, ...rest } = input;
      await assertAndarAtivo(projetoId, andarId);
      const payload: Partial<InsertPerfil> = { ...rest };
      if (variedadeId !== undefined) {
        payload.variedadeId = variedadeId ?? null;
        if (variedadeId == null) {
          payload.receitaId = null;
        } else {
          const rs = await db.getAllReceitas(projetoId);
          payload.receitaId = receitaCicloPrioritariaParaVariedade(rs, variedadeId)?.id ?? null;
        }
      }
      await db.updatePerfilByAndarAndIndex(projetoId, andarId, perfilIndex, payload);
      return { success: true };
    }),
  resetByAndar: fazendaVerticalProcedure
    .input(z.object({ andarId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertAndarAtivo(projetoIdFromCtx(ctx), input.andarId);
      await db.resetPerfisByAndarId(projetoIdFromCtx(ctx), input.andarId);
      return { success: true };
    }),
  batchUpdate: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        updates: z.array(
          z.object({
            perfilIndex: z.number(),
            variedadeId: z.number().nullable().optional(),
            ativo: z.boolean().optional(),
            dataEntrada: z.date().nullable().optional(),
            cultivoStatus: z.enum(["vazio", "plantado", "colhido"]).nullable().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertAndarAtivo(projetoIdFromCtx(ctx), input.andarId);
      await db.batchUpdatePerfis(projetoIdFromCtx(ctx), input.andarId, input.updates);
      return { success: true };
    }),
  setAll: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        variedadeId: z.number().nullable().optional(),
        ativo: z.boolean().optional(),
        dataEntrada: z.date().nullable().optional(),
        cultivoStatus: z.enum(["vazio", "plantado", "colhido"]).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { andarId, ...data } = input;
      await assertAndarAtivo(projetoIdFromCtx(ctx), andarId);
      await db.setAllPerfisOfAndar(projetoIdFromCtx(ctx), andarId, data);
      return { success: true };
    }),
});
