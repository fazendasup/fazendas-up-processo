import { projetoIdFromCtx, commercialEditorProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

const frequenciaCicloSchema = z.enum(["diaria", "semanal", "quinzenal", "mensal", "personalizada"]);
const alvoCicloSchema = z.enum(["ambos", "caixa", "andar"]);
const faseCicloSchema = z.enum(["mudas", "vegetativa", "maturacao"]);

const cicloBaseSchema = z.object({
  nome: z.string().min(1),
  frequencia: frequenciaCicloSchema,
  diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
  intervaloDias: z.number().int().min(1).max(365).optional(),
  produto: z.string().min(1),
  tipo: z.string().min(1),
  dosagem: z.string().optional(),
  fasesAplicaveis: z.array(faseCicloSchema).min(1),
  alvo: alvoCicloSchema.default("ambos"),
  caixaIds: z.array(z.number().int().positive()).optional(),
  ativo: z.boolean().default(true),
  dataInicio: z.coerce.date().optional(),
});

export const ciclosRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllCiclos(projetoIdFromCtx(ctx));
  }),
  create: commercialEditorProjectProcedure
    .input(cicloBaseSchema)
    .mutation(async ({ ctx, input }) => {
      return db.createCiclo({ ...input, projetoId: projetoIdFromCtx(ctx) });
    }),
  update: commercialEditorProjectProcedure
    .input(
      cicloBaseSchema.partial().extend({
        id: z.number(),
        diasSemana: z.array(z.number().int().min(0).max(6)).nullable().optional(),
        intervaloDias: z.number().int().min(1).max(365).nullable().optional(),
        dosagem: z.string().nullable().optional(),
        dataInicio: z.coerce.date().nullable().optional(),
        ultimaExecucao: z.coerce.date().nullable().optional(),
        caixaIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateCiclo(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  marcarExecutado: projectProcedure
    .input(
      z.object({
        id: z.number(),
        ultimaExecucao: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateCiclo(projetoIdFromCtx(ctx), input.id, {
        ultimaExecucao: input.ultimaExecucao,
        ultimoExecutorId: ctx.user.id,
        ultimoExecutorNome: ctx.user.name || "Usuário",
      });
      return { success: true };
    }),
  /** Registra a aplicação numa caixa. A próxima data dessa caixa segue o ritmo do ciclo. */
  aplicarNaCaixa: projectProcedure
    .input(
      z.object({
        cicloId: z.number().int().positive(),
        caixaAguaId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.registrarAplicacaoCicloNaCaixa({
        projetoId: projetoIdFromCtx(ctx),
        cicloId: input.cicloId,
        caixaAguaId: input.caixaAguaId,
        executorId: ctx.user.id,
        executorNome: ctx.user.name || "Usuário",
      });
      return { success: true as const };
    }),
  delete: commercialEditorProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteCiclo(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
