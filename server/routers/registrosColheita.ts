import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { syncPlanoFromColheita } from "../planoOperacaoSync";
import { receitaCicloPrioritariaParaVariedade } from "@shared/cicloReceita";

export const registrosColheitaRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllRegistrosColheita(projetoIdFromCtx(ctx));
  }),
  listByAndar: projectProcedure
    .input(z.object({ andarId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getRegistrosColheitaByAndarId(projetoIdFromCtx(ctx), input.andarId);
    }),
  listByBancada: projectProcedure
    .input(z.object({ bancadaId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getRegistrosColheitaByBancadaId(projetoIdFromCtx(ctx), input.bancadaId);
    }),
  create: projectProcedure
    .input(
      z
        .object({
          torreId: z.number().optional(),
          andarId: z.number().optional(),
          bancadaId: z.number().optional(),
          variedadeId: z.number().nullable().optional(),
          variedadeNome: z.string().nullable().optional(),
          receitaId: z.number().nullable().optional(),
          dataColheita: z.date(),
          quantidadePlantas: z.number(),
          pesoTotalGramas: z.number().nullable().optional(),
          qualidade: z.string().optional(),
          destino: z.string().nullable().optional(),
          observacoes: z.string().nullable().optional(),
        })
        .refine((v) => v.bancadaId != null || (v.torreId != null && v.andarId != null), {
          message: "Informe a bancada (hidroponia) ou torre+andar (fazenda vertical)",
          path: ["bancadaId"],
        }),
    )
    .mutation(async ({ input, ctx }) => {
      const pid = projetoIdFromCtx(ctx);

      // ---- Hidroponia: colheita por bancada (sem furos/perfis/andares) ----
      if (input.bancadaId != null) {
        const bancada = await db.getBancadaById(pid, input.bancadaId);
        let receitaId = input.receitaId ?? null;
        if (receitaId == null && input.variedadeId != null) {
          const receitas = await db.getAllReceitas(pid);
          receitaId = receitaCicloPrioritariaParaVariedade(receitas, input.variedadeId)?.id ?? null;
        }
        const result = await db.createRegistroColheita({
          projetoId: pid,
          bancadaId: input.bancadaId,
          torreId: null,
          andarId: null,
          variedadeId: input.variedadeId ?? null,
          variedadeNome: input.variedadeNome ?? null,
          receitaId,
          dataColheita: input.dataColheita,
          quantidadePlantas: input.quantidadePlantas,
          pesoTotalGramas: input.pesoTotalGramas ?? null,
          qualidade: input.qualidade,
          destino: input.destino ?? null,
          observacoes: input.observacoes ?? null,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || "Usuário",
        });
        // Após colher, libera a bancada (limpa plantio/previsão).
        if (bancada) {
          await db.updateBancada(pid, input.bancadaId, {
            plantioVariedadeId: null,
            plantioDataEntrada: null,
            plantioPrevisaoColheita: null,
          });
        }
        await syncPlanoFromColheita(pid, input.variedadeId ?? null);
        return result;
      }

      // ---- Fazenda vertical / microverdes: colheita por torre+andar ----
      const andarId = input.andarId as number;
      const torreId = input.torreId as number;
      const [furos, perfis, andar, torre] = await Promise.all([
        db.getFurosByAndarId(pid, andarId),
        db.getPerfisByAndarId(pid, andarId),
        db.getAndarById(pid, andarId),
        db.getTorreById(pid, torreId),
      ]);
      const result = await db.createRegistroColheita({
        ...input,
        torreId,
        andarId,
        bancadaId: null,
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
          origem: `${torre?.nome ?? "Torre"} · Andar ${andar?.numero ?? andarId}`,
          destino: input.destino ?? null,
          observacoes: input.observacoes ?? null,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || "Usuário",
        });
        await db.updateLoteQuantidadeAtual(pid, loteId, -quantidade);
      }
      if (furosColhidos.length > 0) {
        await db.batchUpdateFuros(pid, andarId, furosColhidos.map((f) => ({
          perfilIndex: f.perfilIndex,
          furoIndex: f.furoIndex,
          status: "vazio",
          variedadeId: null,
          loteId: null,
        })));
        const furosPos = await db.getFurosByAndarId(pid, andarId);
        const perfisComPlanta = new Set(furosPos.filter((f) => f.status === "plantado").map((f) => f.perfilIndex));
        const limparPerfis = perfis
          .filter((p) => !perfisComPlanta.has(p.perfilIndex))
          .map((p) => ({ perfilIndex: p.perfilIndex, ativo: false, variedadeId: null, dataEntrada: null, loteId: null }));
        if (limparPerfis.length > 0) await db.batchUpdatePerfis(pid, andarId, limparPerfis);
      } else if (perfisColhidos.length > 0) {
        await db.batchUpdatePerfis(pid, andarId, perfisColhidos.map((p) => ({
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
