import {
  adminInteligenciaProjectProcedure,
  inteligenciaModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

export const inteligenciaRouter = router({
  recalcular: inteligenciaModuleProcedure.mutation(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const { executarMotorInteligencia } = await import("../intelligence-engine");
    const fazendaData = await db.loadFullFazendaData(pid);
    const candidatos = executarMotorInteligencia(fazendaData);

    let criados = 0;
    let atualizados = 0;
    let resolvidos = 0;

    const alertasExistentes = await db.getAllAlerts(pid);
    const hashesAtivos = new Set(candidatos.map((c) => c.hashUnico));
    const hashesExistentes = new Map(alertasExistentes.map((a) => [a.hashUnico, a]));

    for (const candidato of candidatos) {
      const existente = hashesExistentes.get(candidato.hashUnico);
      if (existente) {
        if (existente.status === "resolvido" || existente.status === "ignorado") continue;
        if (
          existente.severidade !== candidato.severidade ||
          existente.descricao !== candidato.descricao
        ) {
          await db.updateAlert(pid, existente.id, {
            severidade: candidato.severidade,
            prioridade: candidato.prioridade,
            descricao: candidato.descricao,
            dadosSnapshot: candidato.dadosSnapshot,
          });
          await db.createAlertEvent({
            projetoId: pid,
            alertaId: existente.id,
            eventoTipo: "atualizado",
            usuarioId: ctx.user!.id,
            usuarioNome: ctx.user!.name || "Sistema",
            observacao: "Alerta atualizado pelo motor de regras",
          });
          atualizados++;
        }
      } else {
        const { id: alertaId } = await db.createAlert({
          projetoId: pid,
          tipo: candidato.tipo,
          severidade: candidato.severidade,
          prioridade: candidato.prioridade,
          titulo: candidato.titulo,
          descricao: candidato.descricao,
          entidadeTipo: candidato.entidadeTipo,
          entidadeId: candidato.entidadeId,
          entidadeNome: candidato.entidadeNome,
          fase: candidato.fase,
          origem: candidato.origem,
          ruleId: candidato.ruleId,
          dadosSnapshot: candidato.dadosSnapshot,
          sugestaoAcao: candidato.sugestaoAcao,
          nivelConfianca: candidato.nivelConfianca,
          gerarTarefa: candidato.gerarTarefa,
          hashUnico: candidato.hashUnico,
          status: "novo",
        });
        await db.createAlertEvent({
          projetoId: pid,
          alertaId,
          eventoTipo: "criado",
          usuarioId: ctx.user!.id,
          usuarioNome: ctx.user!.name || "Sistema",
          observacao: "Alerta gerado pelo motor de regras",
        });
        criados++;
      }
    }

    for (const existente of alertasExistentes) {
      if (existente.status === "resolvido" || existente.status === "ignorado") continue;
      if (!hashesAtivos.has(existente.hashUnico || "")) {
        await db.updateAlert(pid, existente.id, { status: "resolvido" });
        await db.createAlertEvent({
          projetoId: pid,
          alertaId: existente.id,
          eventoTipo: "resolvido",
          usuarioId: ctx.user!.id,
          usuarioNome: ctx.user!.name || "Sistema",
          observacao: "Auto-resolvido: condição não detectada mais",
        });
        resolvidos++;
      }
    }

    return { success: true, criados, atualizados, resolvidos, totalCandidatos: candidatos.length };
  }),

  list: inteligenciaModuleProcedure.query(async ({ ctx }) => {
    return db.getAllAlerts(projetoIdFromCtx(ctx));
  }),

  getById: inteligenciaModuleProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const alerta = await db.getAlertById(projetoIdFromCtx(ctx), input.id);
      if (!alerta) throw new TRPCError({ code: "NOT_FOUND", message: "Alerta não encontrado" });
      const eventos = await db.getEventsByAlertId(projetoIdFromCtx(ctx), input.id);
      return { ...alerta, eventos };
    }),

  marcarLido: inteligenciaModuleProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateAlert(projetoIdFromCtx(ctx), input.id, {
        status: "lido",
        lidoPorId: ctx.user!.id,
        lidoPorNome: ctx.user!.name || "Usuário",
      });
      await db.createAlertEvent({
        projetoId: projetoIdFromCtx(ctx),
        alertaId: input.id,
        eventoTipo: "lido",
        usuarioId: ctx.user!.id,
        usuarioNome: ctx.user!.name || "Usuário",
      });
      return { success: true };
    }),

  marcarEmAndamento: inteligenciaModuleProcedure
    .input(z.object({ id: z.number(), observacao: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateAlert(projetoIdFromCtx(ctx), input.id, { status: "em_andamento" });
      await db.createAlertEvent({
        projetoId: projetoIdFromCtx(ctx),
        alertaId: input.id,
        eventoTipo: "em_andamento",
        usuarioId: ctx.user!.id,
        usuarioNome: ctx.user!.name || "Usuário",
        observacao: input.observacao,
      });
      return { success: true };
    }),

  resolver: inteligenciaModuleProcedure
    .input(z.object({ id: z.number(), observacao: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateAlert(projetoIdFromCtx(ctx), input.id, {
        status: "resolvido",
        resolvidoPorId: ctx.user!.id,
        resolvidoPorNome: ctx.user!.name || "Usuário",
      });
      await db.createAlertEvent({
        projetoId: projetoIdFromCtx(ctx),
        alertaId: input.id,
        eventoTipo: "resolvido",
        usuarioId: ctx.user!.id,
        usuarioNome: ctx.user!.name || "Usuário",
        observacao: input.observacao,
      });
      return { success: true };
    }),

  ignorar: inteligenciaModuleProcedure
    .input(
      z.object({
        id: z.number(),
        motivo: z.string().min(1, "Justificativa obrigatória"),
        prazo: z.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateAlert(projetoIdFromCtx(ctx), input.id, {
        status: "ignorado",
        ignoradoPorId: ctx.user!.id,
        ignoradoPorNome: ctx.user!.name || "Usuário",
        ignoradoMotivo: input.motivo,
        ignoradoPrazo: input.prazo,
      });
      await db.createAlertEvent({
        projetoId: projetoIdFromCtx(ctx),
        alertaId: input.id,
        eventoTipo: "ignorado",
        usuarioId: ctx.user!.id,
        usuarioNome: ctx.user!.name || "Usuário",
        observacao: `Motivo: ${input.motivo}`,
      });
      return { success: true };
    }),

  criarTarefa: inteligenciaModuleProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const alerta = await db.getAlertById(projetoIdFromCtx(ctx), input.id);
      if (!alerta) throw new TRPCError({ code: "NOT_FOUND", message: "Alerta não encontrado" });

      const tarefa = await db.createTarefa({
        projetoId: projetoIdFromCtx(ctx),
        titulo: `[Inteligência] ${alerta.titulo}`,
        descricao: `${alerta.descricao}\n\nAção sugerida: ${alerta.sugestaoAcao}`,
        tipo: alerta.tipo.includes("manutencao")
          ? "manutencao"
          : alerta.tipo.includes("transplantio") || alerta.tipo.includes("atraso")
            ? "transplantio"
            : "outro",
        prioridade: alerta.prioridade,
        dataVencimento: new Date(),
        torreId: alerta.entidadeTipo === "torre" ? alerta.entidadeId ?? undefined : undefined,
      });

      await db.updateAlert(projetoIdFromCtx(ctx), input.id, {
        tarefaGeradaId: tarefa.id,
        status: "em_andamento",
      });
      await db.createAlertEvent({
        projetoId: projetoIdFromCtx(ctx),
        alertaId: input.id,
        eventoTipo: "tarefa_criada",
        usuarioId: ctx.user!.id,
        usuarioNome: ctx.user!.name || "Usuário",
        observacao: `Tarefa #${tarefa.id} criada`,
        dadosExtra: { tarefaId: tarefa.id },
      });

      return { success: true, tarefaId: tarefa.id };
    }),

  limparResolvidos: adminInteligenciaProjectProcedure.mutation(async ({ ctx }) => {
    await db.deleteResolvedAlerts(projetoIdFromCtx(ctx));
    return { success: true };
  }),

  resumo: inteligenciaModuleProcedure.query(async ({ ctx }) => {
    const alertas = await db.getAllAlerts(projetoIdFromCtx(ctx));
    const ativos = alertas.filter((a) => a.status !== "resolvido" && a.status !== "ignorado");
    return {
      total: ativos.length,
      criticos: ativos.filter((a) => a.severidade === "critica").length,
      altos: ativos.filter((a) => a.severidade === "alta").length,
      medios: ativos.filter((a) => a.severidade === "media").length,
      baixos: ativos.filter((a) => a.severidade === "baixa").length,
      urgentes: ativos.filter((a) => a.prioridade === "urgente").length,
      novos: ativos.filter((a) => a.status === "novo").length,
      porTipo: Object.fromEntries(
        Array.from(new Set(ativos.map((a) => a.tipo))).map((tipo) => [
          tipo,
          ativos.filter((a) => a.tipo === tipo).length,
        ]),
      ),
    };
  }),
});
