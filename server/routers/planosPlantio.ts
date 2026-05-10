import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { addDays } from "date-fns";
import * as db from "../db";
import { syncPlanoAposContagemGerminacao } from "../planoOperacaoSync";
import type { InsertPlanoPlantio } from "../../drizzle/schema";

export const planosPlantioRouter = router({
    list: projectProcedure.query(async ({ ctx }) => {
      return db.getAllPlanosPlantio(projetoIdFromCtx(ctx));
    }),
    create: adminProjectProcedure
      .input(z.object({
        receitaId: z.coerce.number(),
        receitaNome: z.string(),
        variedadeId: z.coerce.number(),
        variedadeNome: z.string(),
        quantidadePlantas: z.coerce.number(),
        dataInicioGerminacao: z.coerce.date(),
        dataTransplantioMudas: z.coerce.date(),
        dataTransplantioVeg: z.coerce.date(),
        dataTransplantioMat: z.coerce.date(),
        dataColheitaPrevista: z.coerce.date(),
        torreDestinoId: z.union([z.number(), z.null()]).optional(),
        andarDestinoId: z.union([z.number(), z.null()]).optional(),
        observacoes: z.string().nullable().optional(),
        /** Intervalo entre inícios de cada ciclo (gera N planos com datas deslocadas). */
        recorrencia: z.enum(['nenhuma', 'semanal', 'quinzenal', 'mensal', 'personalizado']).optional().default('nenhuma'),
        /** Obrigatório quando `recorrencia` é `personalizado`: dias entre um início e o próximo. */
        intervaloDiasPersonalizado: z.number().int().min(1).max(365).optional(),
        /** Quantidade de ciclos (>=1). Com recorrência "nenhuma" vale 1. Máx. 52. */
        repeticoes: z.coerce.number().int().min(1).max(52).optional().default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const {
          recorrencia,
          repeticoes,
          intervaloDiasPersonalizado,
          receitaId,
          receitaNome,
          variedadeId,
          variedadeNome,
          quantidadePlantas,
          dataInicioGerminacao,
          dataTransplantioMudas,
          dataTransplantioVeg,
          dataTransplantioMat,
          dataColheitaPrevista,
          torreDestinoId,
          andarDestinoId,
          observacoes,
        } = input;

        let stepDays = 0;
        if (recorrencia === 'personalizado') {
          if (intervaloDiasPersonalizado == null) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Informe quantos dias entre cada ciclo (recorrência personalizada).',
            });
          }
          stepDays = intervaloDiasPersonalizado;
        } else {
          stepDays =
            recorrencia === 'semanal' ? 7
            : recorrencia === 'quinzenal' ? 14
            : recorrencia === 'mensal' ? 28
            : 0;
        }
        const total = recorrencia === 'nenhuma' ? 1 : Math.min(52, Math.max(1, repeticoes));
        const ids: number[] = [];
        const baseObs = observacoes?.trim() || '';

        for (let i = 0; i < total; i++) {
          const offset = i * stepDays;
          const cicloTag = total > 1 ? ` [Ciclo ${i + 1}/${total}]` : '';
          const observacoesPlano = baseObs ? `${baseObs}${cicloTag}` : (cicloTag.trim() || null);

          const row: InsertPlanoPlantio = {
            projetoId: projetoIdFromCtx(ctx),
            receitaId,
            receitaNome,
            variedadeId,
            variedadeNome,
            quantidadePlantas,
            dataInicioGerminacao: addDays(dataInicioGerminacao, offset),
            dataTransplantioMudas: addDays(dataTransplantioMudas, offset),
            dataTransplantioVeg: addDays(dataTransplantioVeg, offset),
            dataTransplantioMat: addDays(dataTransplantioMat, offset),
            dataColheitaPrevista: addDays(dataColheitaPrevista, offset),
            observacoes: observacoesPlano || null,
            germinadas: 0,
            naoGerminadas: quantidadePlantas,
            transplantadasGerminacao: 0,
            germinacaoFase: 'pendente',
            criadoPorId: ctx.user.id,
            criadoPorNome: ctx.user.name || 'Admin',
            ...(torreDestinoId != null ? { torreDestinoId } : {}),
            ...(andarDestinoId != null ? { andarDestinoId } : {}),
          };

          try {
            const { id } = await db.createPlanoPlantio(row);
            ids.push(Number(id));
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (/unknown column/i.test(msg) && (/germinadas/i.test(msg) || /germinacaoFase/i.test(msg) || /naoGerminadas/i.test(msg))) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message:
                  'O banco precisa da migração dos planos (campos de germinação). Rode: pnpm db:push — ou aplique drizzle/0009_planos_germinacao_cols.sql',
              });
            }
            console.error('[planosPlantio.create]', err);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: msg || 'Não foi possível criar o plano de plantio',
            });
          }
        }

        return { id: ids[0], ids, count: total };
      }),
    update: adminProjectProcedure
      .input(z.object({
        id: z.number(),
        quantidadePlantas: z.number().optional(),
        dataInicioGerminacao: z.date().optional(),
        dataTransplantioMudas: z.date().optional(),
        dataTransplantioVeg: z.date().optional(),
        dataTransplantioMat: z.date().optional(),
        dataColheitaPrevista: z.date().optional(),
        torreDestinoId: z.number().nullable().optional(),
        andarDestinoId: z.number().nullable().optional(),
        status: z.string().optional(),
        observacoes: z.string().nullable().optional(),
        germinadas: z.number().int().min(0).optional(),
        naoGerminadas: z.number().int().min(0).optional(),
        transplantadasGerminacao: z.number().int().min(0).optional(),
        germinacaoFase: z.enum(['pendente', 'germinando', 'pronto_mudas']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updatePlanoPlantio(projetoIdFromCtx(ctx), id, data);
        return { success: true };
      }),
    /** Desloca todas as datas dos planos ativos (não colhidos/cancelados) da mesma variedade. */
    deslocarDatasPorVariedade: adminProjectProcedure
      .input(
        z.object({
          variedadeId: z.number(),
          dias: z.number().int().min(-365).max(365),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.dias === 0) {
          return { atualizados: 0 };
        }
        const todos = await db.getAllPlanosPlantio(projetoIdFromCtx(ctx));
        const alvo = todos.filter(
          (p) =>
            p.variedadeId === input.variedadeId &&
            p.status !== "colhido" &&
            p.status !== "cancelado",
        );
        for (const p of alvo) {
          await db.updatePlanoPlantio(projetoIdFromCtx(ctx), p.id, {
            dataInicioGerminacao: addDays(new Date(p.dataInicioGerminacao), input.dias),
            dataTransplantioMudas: addDays(new Date(p.dataTransplantioMudas), input.dias),
            dataTransplantioVeg: addDays(new Date(p.dataTransplantioVeg), input.dias),
            dataTransplantioMat: addDays(new Date(p.dataTransplantioMat), input.dias),
            dataColheitaPrevista: addDays(new Date(p.dataColheitaPrevista), input.dias),
          });
        }
        return { atualizados: alvo.length };
      }),
    registrarContagemGerminacao: projectProcedure
      .input(z.object({
        id: z.number(),
        germinadas: z.number().int().min(0),
        naoGerminadas: z.number().int().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const plano = await db.getPlanoPlantioById(projetoIdFromCtx(ctx), input.id);
        if (!plano) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Plano não encontrado' });
        }
        if (
          plano.status !== 'planejado' &&
          plano.status !== 'em_germinacao' &&
          plano.status !== 'em_producao'
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Contagem só é permitida em planos em andamento (planejado, em germinação ou em produção)',
          });
        }
        if (input.germinadas + input.naoGerminadas > plano.quantidadePlantas) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Germinadas + não germinadas não pode exceder a quantidade do plano' });
        }
        const pid = projetoIdFromCtx(ctx);
        const statusAntes = plano.status;
        await db.updatePlanoPlantio(pid, input.id, {
          germinadas: input.germinadas,
          naoGerminadas: input.naoGerminadas,
        });
        await syncPlanoAposContagemGerminacao(pid, input.id, statusAntes);
        return { success: true };
      }),
    marcarGerminacaoPronta: projectProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const plano = await db.getPlanoPlantioById(projetoIdFromCtx(ctx), input.id);
        if (!plano) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Plano não encontrado' });
        }
        if (plano.status !== 'planejado' && plano.status !== 'em_germinacao') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Só é possível concluir germinação em planos nesta fase' });
        }
        await db.updatePlanoPlantio(projetoIdFromCtx(ctx), input.id, { germinacaoFase: 'pronto_mudas' });
        return { success: true };
      }),
    avancarStatus: adminProjectProcedure
      .input(z.object({
        id: z.number(),
        novoStatus: z.enum(['em_germinacao', 'em_producao', 'colhido', 'cancelado']),
      }))
      .mutation(async ({ ctx, input }) => {
        const plano = await db.getPlanoPlantioById(projetoIdFromCtx(ctx), input.id);
        if (!plano) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Plano não encontrado' });
        }

        if (input.novoStatus === 'em_producao') {
          if (plano.status !== 'em_germinacao') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'O plano precisa estar em germinação antes de ir para produção',
            });
          }
          if (plano.germinacaoFase !== 'pronto_mudas') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Marque a germinação como pronta para mudas antes de avançar para produção',
            });
          }
        }

        const patch: Record<string, unknown> = { status: input.novoStatus };
        if (input.novoStatus === 'em_germinacao' && plano.germinacaoFase === 'pendente') {
          patch.germinacaoFase = 'germinando';
        }

        await db.updatePlanoPlantio(projetoIdFromCtx(ctx), input.id, patch as Partial<InsertPlanoPlantio>);
        return { success: true, status: input.novoStatus };
      }),
    delete: adminProjectProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePlanoPlantio(projetoIdFromCtx(ctx), input.id);
        return { success: true };
      }),
    /** Remove todos os planos do projeto atual (admin). Irreversível. */
    deleteAll: adminProjectProcedure.mutation(async ({ ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      const todos = await db.getAllPlanosPlantio(pid);
      const n = todos.length;
      if (n === 0) return { removed: 0 };
      await db.deleteAllPlanosPlantio(pid);
      return { removed: n };
    }),
});
