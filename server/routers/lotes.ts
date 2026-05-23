import { z } from "zod";
import { projetoIdFromCtx, projectProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const lotesRouter = router({
  perfilHistorico: projectProcedure
    .input(z.object({ andarId: z.number().int().positive(), perfilIndex: z.number().int().min(0) }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const [perfis, furos] = await Promise.all([
        db.getPerfisByAndarId(pid, input.andarId),
        db.getFurosByAndarId(pid, input.andarId),
      ]);
      const loteIds = new Set<number>();
      const perfil = perfis.find((p) => p.perfilIndex === input.perfilIndex);
      if (perfil?.loteId) loteIds.add(perfil.loteId);
      for (const f of furos.filter((f) => f.perfilIndex === input.perfilIndex && f.loteId)) {
        loteIds.add(f.loteId!);
      }
      const lotes = [];
      for (const loteId of Array.from(loteIds)) {
        const lote = await db.getLoteById(pid, loteId);
        if (!lote) continue;
        const eventos = await db.getEventosByLoteId(pid, loteId);
        lotes.push({ lote, eventos });
      }
      return lotes;
    }),
  relatorio: projectProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const [lotes, eventos] = await Promise.all([
      db.getAllLotesProducao(pid),
      db.getAllLoteEventos(pid),
    ]);
    const eventosPorLote = new Map<number, typeof eventos>();
    for (const ev of eventos) {
      const arr = eventosPorLote.get(ev.loteId) ?? [];
      arr.push(ev);
      eventosPorLote.set(ev.loteId, arr);
    }
    return lotes.map((lote) => ({
      lote,
      eventos: (eventosPorLote.get(lote.id) ?? []).sort(
        (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
      ),
    }));
  }),
  updateEventoDataHora: projectProcedure
    .input(z.object({ eventoId: z.number().int().positive(), dataHora: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const evento = await db.getLoteEventoById(pid, input.eventoId);
      if (!evento) throw new Error("Evento de lote não encontrado");
      if (evento.tipo !== "transplantio") {
        throw new Error("Somente eventos de transplantio podem ter a data ajustada por aqui");
      }

      const dataAnterior = new Date(evento.dataHora);
      await db.updateLoteEvento(pid, evento.id, { dataHora: input.dataHora });
      await db.createLoteEvento({
        projetoId: pid,
        loteId: evento.loteId,
        tipo: "ajuste_data",
        dataHora: new Date(),
        quantidade: 0,
        faseOrigem: evento.faseOrigem,
        faseDestino: evento.faseDestino,
        origem: evento.origem,
        destino: evento.destino,
        observacoes: `Data do transplantio ajustada de ${dataAnterior.toLocaleString("pt-BR")} para ${input.dataHora.toLocaleString("pt-BR")}.`,
        executadoPorId: ctx.user.id,
        executadoPorNome: ctx.user.name || "Usuário",
      });
      return { success: true };
    }),
});
