import { projetoIdFromCtx, fazendaVerticalProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

async function assertAndarAtivo(projetoId: number, andarId: number) {
  const andar = await db.getAndarById(projetoId, andarId);
  if (!andar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
  const torre = await db.getTorreById(projetoId, andar.torreId);
  if (!torre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
  if (torre.ativa === false) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A torre está desativada e não aceita operações" });
  }
}

export const furosRouter = router({
  listByAndar: fazendaVerticalProcedure
    .input(z.object({ andarId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getFurosByAndarId(projetoIdFromCtx(ctx), input.andarId);
    }),
  update: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        perfilIndex: z.number(),
        furoIndex: z.number(),
        status: z.string().optional(),
        variedadeId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { andarId, perfilIndex, furoIndex, ...data } = input;
      await assertAndarAtivo(projetoIdFromCtx(ctx), andarId);
      await db.updateFuroByAndarAndIndex(projetoIdFromCtx(ctx), andarId, perfilIndex, furoIndex, data);
      return { success: true };
    }),
  resetByAndar: fazendaVerticalProcedure
    .input(z.object({ andarId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertAndarAtivo(projetoIdFromCtx(ctx), input.andarId);
      await db.resetFurosByAndarId(projetoIdFromCtx(ctx), input.andarId);
      return { success: true };
    }),
  batchUpdate: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        updates: z.array(
          z.object({
            perfilIndex: z.number(),
            furoIndex: z.number(),
            status: z.string().optional(),
            variedadeId: z.number().nullable().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertAndarAtivo(projetoIdFromCtx(ctx), input.andarId);
      await db.batchUpdateFuros(projetoIdFromCtx(ctx), input.andarId, input.updates);
      return { success: true };
    }),
  setAll: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        status: z.string().optional(),
        variedadeId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { andarId, ...data } = input;
      await assertAndarAtivo(projetoIdFromCtx(ctx), andarId);
      await db.setAllFurosOfAndar(projetoIdFromCtx(ctx), andarId, data);
      return { success: true };
    }),
});
