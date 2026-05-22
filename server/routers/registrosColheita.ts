import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { syncPlanoFromColheita } from "../planoOperacaoSync";

export const registrosColheitaRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllRegistrosColheita(projetoIdFromCtx(ctx));
  }),
  listByAndar: projectProcedure
    .input(z.object({ andarId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getRegistrosColheitaByAndarId(projetoIdFromCtx(ctx), input.andarId);
    }),
  create: projectProcedure
    .input(
      z.object({
        torreId: z.number(),
        andarId: z.number(),
        variedadeId: z.number().nullable().optional(),
        variedadeNome: z.string().nullable().optional(),
        receitaId: z.number().nullable().optional(),
        dataColheita: z.date(),
        quantidadePlantas: z.number(),
        pesoTotalGramas: z.number().nullable().optional(),
        qualidade: z.string().optional(),
        destino: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      const [furos, perfis, andar, torre] = await Promise.all([
        db.getFurosByAndarId(pid, input.andarId),
        db.getPerfisByAndarId(pid, input.andarId),
        db.getAndarById(pid, input.andarId),
        db.getTorreById(pid, input.torreId),
      ]);
      const result = await db.createRegistroColheita({
        ...input,
        projetoId: pid,
        executadoPorId: ctx.user.id,
        executadoPorNome: ctx.user.name || "Usuário",
      });
      const porLote = new Map<number, number>();
      const furosColhidos = furos.filter((f) => f.status === "colhido");
      for (const f of furosColhidos) {
        const perfil = perfis.find((p) => p.perfilIndex === f.perfilIndex);
        const loteId = f.loteId ?? perfil?.loteId ?? null;
        if (loteId) porLote.set(loteId, (porLote.get(loteId) ?? 0) + 1);
      }
      const perfisColhidos = furosColhidos.length === 0
        ? perfis.filter((p) => p.cultivoStatus === "colhido" || (p.ativo && p.loteId))
        : [];
      for (const p of perfisColhidos) {
        if (p.loteId) porLote.set(p.loteId, (porLote.get(p.loteId) ?? 0) + Math.max(1, Number(p.quantidadePlantas ?? 1)));
      }
      for (const [loteId, quantidade] of Array.from(porLote.entries())) {
        await db.createLoteEvento({
          projetoId: pid,
          loteId,
          tipo: "colheita",
          dataHora: input.dataColheita,
          quantidade,
          faseOrigem: torre?.fase ?? "maturacao",
          origem: `${torre?.nome ?? "Torre"} · Andar ${andar?.numero ?? input.andarId}`,
          destino: input.destino ?? null,
          observacoes: input.observacoes ?? null,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || "Usuário",
        });
        await db.updateLoteQuantidadeAtual(pid, loteId, -quantidade);
      }
      if (furosColhidos.length > 0) {
        await db.batchUpdateFuros(pid, input.andarId, furosColhidos.map((f) => ({
          perfilIndex: f.perfilIndex,
          furoIndex: f.furoIndex,
          status: "vazio",
          variedadeId: null,
          loteId: null,
        })));
        const furosPos = await db.getFurosByAndarId(pid, input.andarId);
        const perfisComPlanta = new Set(furosPos.filter((f) => f.status === "plantado").map((f) => f.perfilIndex));
        const limparPerfis = perfis
          .filter((p) => !perfisComPlanta.has(p.perfilIndex))
          .map((p) => ({ perfilIndex: p.perfilIndex, ativo: false, variedadeId: null, dataEntrada: null, loteId: null }));
        if (limparPerfis.length > 0) await db.batchUpdatePerfis(pid, input.andarId, limparPerfis);
      } else if (perfisColhidos.length > 0) {
        await db.batchUpdatePerfis(pid, input.andarId, perfisColhidos.map((p) => ({
          perfilIndex: p.perfilIndex,
          ativo: false,
          variedadeId: null,
          dataEntrada: null,
          quantidadePlantas: null,
          cultivoStatus: "vazio",
          loteId: null,
        })));
      }
      await syncPlanoFromColheita(pid, input.variedadeId ?? null);
      return result;
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteRegistroColheita(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
