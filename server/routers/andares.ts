import { projetoIdFromCtx, fazendaVerticalProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { runTransplantarDistribuido } from "../operacoes/transplantarDistribuido";

async function assertAndarAtivo(projetoId: number, andarId: number) {
  const andar = await db.getAndarById(projetoId, andarId);
  if (!andar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
  const torre = await db.getTorreById(projetoId, andar.torreId);
  if (!torre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
  if (torre.ativa === false) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A torre está desativada e não aceita operações" });
  }
  return { andar, torre };
}

export const andaresRouter = router({
  list: fazendaVerticalProcedure.query(async ({ ctx }) => {
    return db.getAllAndares(projetoIdFromCtx(ctx));
  }),
  listByTorre: fazendaVerticalProcedure
    .input(z.object({ torreId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAndaresByTorreId(projetoIdFromCtx(ctx), input.torreId);
    }),
  getById: fazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAndarById(projetoIdFromCtx(ctx), input.id);
    }),
  update: fazendaVerticalProcedure
    .input(
      z.object({
        id: z.number(),
        dataEntrada: z.date().nullable().optional(),
        lavado: z.boolean().optional(),
        dataColheitaTotal: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await assertAndarAtivo(projetoIdFromCtx(ctx), id);
      await db.updateAndar(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  clearAndar: fazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertAndarAtivo(projetoIdFromCtx(ctx), input.id);
      await db.updateAndar(projetoIdFromCtx(ctx), input.id, { dataEntrada: null, lavado: true, dataColheitaTotal: null });
      await db.resetPerfisByAndarId(projetoIdFromCtx(ctx), input.id);
      await db.resetFurosByAndarId(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
  moverPerfil: fazendaVerticalProcedure
    .input(
      z.object({
        origemAndarId: z.number(),
        perfilIndex: z.number(),
        destinoAndarId: z.number(),
        destinoPerfilIndex: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const origemAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.origemAndarId);
      const destinoAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.destinoAndarId);
      if (!origemAndar || !destinoAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
      const origemTorre = await db.getTorreById(projetoIdFromCtx(ctx), origemAndar.torreId);
      const destinoTorre = await db.getTorreById(projetoIdFromCtx(ctx), destinoAndar.torreId);
      if (!origemTorre || !destinoTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
      if (origemTorre.ativa === false || destinoTorre.ativa === false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível mover entre torres desativadas" });
      }
      if (origemTorre.fase !== destinoTorre.fase) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Movimentação só é permitida entre torres da mesma fase" });
      }
      await db.moverPerfil(
        projetoIdFromCtx(ctx),
        input.origemAndarId,
        input.perfilIndex,
        input.destinoAndarId,
        input.destinoPerfilIndex,
      );
      return { success: true };
    }),
  moverAndar: fazendaVerticalProcedure
    .input(
      z.object({
        origemAndarId: z.number(),
        destinoAndarId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const origemAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.origemAndarId);
      const destinoAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.destinoAndarId);
      if (!origemAndar || !destinoAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
      const origemTorre = await db.getTorreById(projetoIdFromCtx(ctx), origemAndar.torreId);
      const destinoTorre = await db.getTorreById(projetoIdFromCtx(ctx), destinoAndar.torreId);
      if (!origemTorre || !destinoTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
      if (origemTorre.ativa === false || destinoTorre.ativa === false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível mover entre torres desativadas" });
      }
      if (origemTorre.fase !== destinoTorre.fase) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Movimentação só é permitida entre torres da mesma fase" });
      }
      await db.moverTodosPerfilAndar(projetoIdFromCtx(ctx), input.origemAndarId, input.destinoAndarId);
      return { success: true };
    }),

  transplantarDistribuido: fazendaVerticalProcedure
    .input(
      z.object({
        andarOrigemId: z.number(),
        destinos: z
          .array(
            z.object({
              andarDestinoId: z.number(),
              quantidade: z.number().int().min(1),
            }),
          )
          .default([]),
        observacoes: z.string().optional(),
        quantidadeDesperdicio: z.number().int().min(0).optional(),
        motivoDesperdicio: z.string().optional(),
        /** Só para origem em mudas: permite ir direto para maturação (ex.: baby leaf) ou forçar vegetativa. */
        faseDestino: z.enum(["vegetativa", "maturacao"]).optional(),
        /** Perfis/bandejas de origem (0-based). Se omitido, usa todo o andar como antes. */
        perfilIndicesOrigem: z.array(z.number().int().min(0)).min(1).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      return runTransplantarDistribuido(
        {
          projetoId: pid,
          userId: ctx.user!.id,
          userName: ctx.user!.name || "Usuário",
        },
        input,
      );
    }),
});
