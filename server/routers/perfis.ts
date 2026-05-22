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

async function criarLotePerfilSePreciso(opts: {
  projetoId: number;
  andarId: number;
  perfilIndex: number;
  variedadeId?: number | null;
  ativo?: boolean;
  dataEntrada?: Date | null;
  quantidadePlantas?: number | null;
  userId: number;
  userName: string;
}): Promise<number | null | undefined> {
  if (opts.ativo !== true || !opts.variedadeId) return undefined;
  const atuais = await db.getPerfisByAndarId(opts.projetoId, opts.andarId);
  const atual = atuais.find((p) => p.perfilIndex === opts.perfilIndex);
  if (atual?.loteId) return atual.loteId;
  const variedade = await db.getVariedadeById(opts.projetoId, opts.variedadeId);
  if (!variedade) return undefined;
  const quantidade = Math.max(1, Math.floor(opts.quantidadePlantas ?? atual?.quantidadePlantas ?? 1));
  const dataInicio = opts.dataEntrada ?? atual?.dataEntrada ?? new Date();
  const lote = await db.createLoteProducao({
    projetoId: opts.projetoId,
    variedadeId: opts.variedadeId,
    variedadeNome: variedade.nome,
    dataInicio,
    status: "ativo",
    quantidadeInicial: quantidade,
    quantidadeAtual: quantidade,
  });
  await db.createLoteEvento({
    projetoId: opts.projetoId,
    loteId: lote.id,
    tipo: "plantio",
    dataHora: new Date(),
    quantidade,
    faseDestino: "mudas",
    destino: `Andar ${opts.andarId} · Perfil ${opts.perfilIndex + 1}`,
    observacoes: "Lote criado ao ativar perfil.",
    executadoPorId: opts.userId,
    executadoPorNome: opts.userName,
  });
  return lote.id;
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
        quantidadePlantas: z.number().int().min(0).nullable().optional(),
        cultivoStatus: z.enum(["vazio", "plantado", "colhido"]).nullable().optional(),
        loteId: z.number().int().positive().nullable().optional(),
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
      const loteId = await criarLotePerfilSePreciso({
        projetoId,
        andarId,
        perfilIndex,
        variedadeId: payload.variedadeId ?? variedadeId,
        ativo: payload.ativo,
        dataEntrada: payload.dataEntrada,
        quantidadePlantas: payload.quantidadePlantas,
        userId: ctx.user!.id,
        userName: ctx.user!.name || "Usuário",
      });
      if (loteId !== undefined) payload.loteId = loteId;
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
            quantidadePlantas: z.number().int().min(0).nullable().optional(),
            cultivoStatus: z.enum(["vazio", "plantado", "colhido"]).nullable().optional(),
            loteId: z.number().int().positive().nullable().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      await assertAndarAtivo(projetoId, input.andarId);
      const updates = [];
      for (const update of input.updates) {
        const loteId = await criarLotePerfilSePreciso({
          projetoId,
          andarId: input.andarId,
          perfilIndex: update.perfilIndex,
          variedadeId: update.variedadeId,
          ativo: update.ativo,
          dataEntrada: update.dataEntrada,
          quantidadePlantas: update.quantidadePlantas,
          userId: ctx.user!.id,
          userName: ctx.user!.name || "Usuário",
        });
        updates.push(loteId !== undefined ? { ...update, loteId } : update);
      }
      await db.batchUpdatePerfis(projetoId, input.andarId, updates);
      return { success: true };
    }),
  setAll: fazendaVerticalProcedure
    .input(
      z.object({
        andarId: z.number(),
        variedadeId: z.number().nullable().optional(),
        ativo: z.boolean().optional(),
        dataEntrada: z.date().nullable().optional(),
        quantidadePlantas: z.number().int().min(0).nullable().optional(),
        cultivoStatus: z.enum(["vazio", "plantado", "colhido"]).nullable().optional(),
        loteId: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { andarId, ...data } = input;
      const projetoId = projetoIdFromCtx(ctx);
      await assertAndarAtivo(projetoId, andarId);
      if (data.ativo === true && data.variedadeId) {
        const atuais = await db.getPerfisByAndarId(projetoId, andarId);
        const updates = [];
        for (const p of atuais) {
          const loteId = await criarLotePerfilSePreciso({
            projetoId,
            andarId,
            perfilIndex: p.perfilIndex,
            variedadeId: data.variedadeId,
            ativo: true,
            dataEntrada: data.dataEntrada,
            quantidadePlantas: data.quantidadePlantas,
            userId: ctx.user!.id,
            userName: ctx.user!.name || "Usuário",
          });
          updates.push({ perfilIndex: p.perfilIndex, ...data, loteId });
        }
        await db.batchUpdatePerfis(projetoId, andarId, updates);
      } else {
        await db.setAllPerfisOfAndar(projetoId, andarId, data);
      }
      return { success: true };
    }),
});
