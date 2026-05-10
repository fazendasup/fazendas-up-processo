import { projetoIdFromCtx, hidroponiaProcedure, router } from "../_core/trpc";
import type { InsertCaixaBancada } from "../../drizzle/schema";
import { z } from "zod";
import * as db from "../db";

const statusEnum = z.enum(["vazia", "plantada", "germinando", "colheita"]);

export const caixasBancadaRouter = router({
  listByBancada: hidroponiaProcedure
    .input(z.object({ bancadaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const b = await db.getBancadaById(pid, input.bancadaId);
      if (!b) return [];
      await db.syncCaixasBancadaForBancada(pid, input.bancadaId, b.quantidadeCaixas);
      return db.getCaixasByBancadaId(pid, input.bancadaId);
    }),

  update: hidroponiaProcedure
    .input(
      z.object({
        id: z.number(),
        variedadeId: z.number().nullable().optional(),
        status: statusEnum.optional(),
        dataPlantio: z.coerce.date().nullable().optional(),
        dataPrevisaoColheita: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const row = await db.getCaixaBancadaById(pid, input.id);
      if (!row) throw new Error("Caixa não encontrada");
      const { id, ...rest } = input;
      const payload: Partial<InsertCaixaBancada> = {};
      if (rest.variedadeId !== undefined) payload.variedadeId = rest.variedadeId;
      if (rest.status !== undefined) payload.status = rest.status;
      if (rest.dataPlantio !== undefined) payload.dataPlantio = rest.dataPlantio;
      if (rest.dataPrevisaoColheita !== undefined) payload.dataPrevisaoColheita = rest.dataPrevisaoColheita;
      if (Object.keys(payload).length === 0) return { success: true as const };
      await db.updateCaixaBancada(pid, id, payload);
      return { success: true as const };
    }),
});
