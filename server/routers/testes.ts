import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as testesDb from "../testesDb";

const culturaSchema = z.enum(["microverdes", "alface"]);
const faseAlfaceSchema = z.enum(["mudas", "vegetativa", "maturacao"]);
const tipoAplicacaoSchema = z.enum(["tanque", "primeira_rega_pre_escuro"]);

export const testesRouter = router({
  list: protectedProcedure.query(async () => {
    return testesDb.listTestes();
  }),

  bySlug: protectedProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      return testesDb.getTesteBySlug(input.slug);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        titulo: z.string().min(1).optional(),
        status: z.enum(["ativo", "pausado", "concluido"]).optional(),
        protocoloResumo: z.string().nullable().optional(),
        doseAlvoMlPorL: z.number().positive().optional(),
        intervaloLembreteDias: z.number().int().min(1).max(30).optional(),
        notas: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await testesDb.updateTeste(id, data);
      return { success: true };
    }),

  updateParcela: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        variedadeNome: z.string().min(1).optional(),
        ativo: z.boolean().optional(),
        diasEscuro: z.number().int().min(0).nullable().optional(),
        diasFotoperiodo: z.number().int().min(0).nullable().optional(),
        horasLuz: z.number().int().min(0).max(24).nullable().optional(),
        diasMudas: z.number().int().min(0).nullable().optional(),
        diasVegetativa: z.number().int().min(0).nullable().optional(),
        diasMaturacao: z.number().int().min(0).nullable().optional(),
        biomassaEsperadaGramas: z.number().min(0).nullable().optional(),
        biomassaObservadaGramas: z.number().min(0).nullable().optional(),
        dataInicio: z.string().nullable().optional(),
        dataColheita: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await testesDb.updateParcela(id, data as never);
      return { success: true };
    }),

  addParcela: protectedProcedure
    .input(
      z.object({
        testeId: z.number(),
        cultura: culturaSchema,
        variedadeNome: z.string().min(1),
        ativo: z.boolean().optional(),
        diasEscuro: z.number().int().min(0).optional(),
        diasFotoperiodo: z.number().int().min(0).optional(),
        horasLuz: z.number().int().min(0).max(24).optional(),
        diasMudas: z.number().int().min(0).optional(),
        diasVegetativa: z.number().int().min(0).optional(),
        diasMaturacao: z.number().int().min(0).optional(),
        biomassaEsperadaGramas: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return testesDb.addParcela({
        ...input,
        ativo: input.ativo ?? true,
      });
    }),

  deleteParcela: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await testesDb.deleteParcela(input.id);
      return { success: true };
    }),

  registrarDosagem: protectedProcedure
    .input(
      z.object({
        testeId: z.number(),
        cultura: culturaSchema,
        fase: faseAlfaceSchema.nullable().optional(),
        tipoAplicacao: tipoAplicacaoSchema,
        doseMlPorL: z.number().positive(),
        volumeTanqueLitros: z.union([
          z.literal(5),
          z.literal(10),
          z.literal(50),
          z.literal(310),
          z.literal(500),
        ]),
        dataAplicacao: z.string().min(8),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.cultura === "alface" && !input.fase) {
        throw new Error("Informe a fase da alface (mudas, vegetativa ou maturação).");
      }
      if (input.cultura === "microverdes" && input.fase) {
        throw new Error("Microverdes não usam fase de alface na dosagem.");
      }
      if (
        input.tipoAplicacao === "primeira_rega_pre_escuro" &&
        input.cultura !== "microverdes"
      ) {
        throw new Error("A 1ª rega pré-escuro é só para microverdes.");
      }
      if (
        input.tipoAplicacao === "primeira_rega_pre_escuro" &&
        input.volumeTanqueLitros !== 5 &&
        input.volumeTanqueLitros !== 10
      ) {
        throw new Error("Na 1ª rega pré-escuro use 5 L ou 10 L.");
      }
      if (
        input.tipoAplicacao === "tanque" &&
        (input.volumeTanqueLitros === 5 || input.volumeTanqueLitros === 10)
      ) {
        throw new Error("5 L e 10 L são só para a 1ª rega pré-escuro.");
      }
      return testesDb.createDosagem({
        ...input,
        fase: input.fase ?? null,
        registradoPorId: ctx.user.id,
        registradoPorNome: ctx.user.name || "Usuário",
      });
    }),

  deleteDosagem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await testesDb.deleteDosagem(input.id);
      return { success: true };
    }),
});
