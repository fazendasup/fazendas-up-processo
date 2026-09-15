import { z } from "zod";
import {
  custosProducaoModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import {
  analisarFinanceiroCfoContaAzul,
  buscarParcelaDetalheFinanceiro,
} from "../financeiroContaAzulFluxo";
import {
  deleteFinanceiroCaClassificacao,
  insertFinanceiroCaAjusteManual,
  listFinanceiroCaAjustesManuais,
  listFinanceiroCaClassificacoes,
  softDeleteFinanceiroCaAjusteManual,
  upsertFinanceiroCaClassificacao,
} from "../financeiroClassificacaoDb";
import { aplicarEdicoesClassificacao } from "@shared/financeiroCfoInsights";

export const financeiroCfoRouter = router({
  /** Pacote financeiro Conta Azul + classificação editável do projeto. */
  analise: custosProducaoModuleProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const inicio = new Date(input.inicio);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(input.fim);
      fim.setHours(23, 59, 59, 999);
      if (fim.getTime() < inicio.getTime()) {
        throw new Error("Período inválido: fim antes do início.");
      }
      const dias =
        (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
      if (dias > 120) {
        throw new Error("Período máximo de 120 dias por análise.");
      }
      return analisarFinanceiroCfoContaAzul(
        inicio,
        fim,
        projetoIdFromCtx(ctx),
      );
    }),

  /** Rateio Conta Azul de um título — sob demanda ao inspecionar. */
  parcelaDetalhe: custosProducaoModuleProcedure
    .input(
      z.object({
        parcelaId: z.string().min(1),
        tipo: z.enum(["pagar", "receber"]).default("pagar"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const det = await buscarParcelaDetalheFinanceiro(
        input.parcelaId,
        input.tipo,
      );
      if (!det) return null;
      const classifs = await listFinanceiroCaClassificacoes(
        projetoIdFromCtx(ctx),
      );
      const [aplicada] = aplicarEdicoesClassificacao(
        [det],
        classifs.map(c => ({
          tipo: c.tipo,
          chave: c.chave,
          rubricaOverride: c.rubricaOverride,
          centroCustoOverride: c.centroCustoOverride,
          excluido: c.excluido,
          nota: c.nota,
        })),
      );
      return aplicada ?? det;
    }),

  listClassificacoes: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    return listFinanceiroCaClassificacoes(projetoIdFromCtx(ctx));
  }),

  salvarClassificacao: custosProducaoModuleProcedure
    .input(
      z.object({
        tipo: z.enum(["parcela", "fornecedor"]),
        chave: z.string().min(1).max(191),
        rubricaOverride: z.string().max(191).nullable().optional(),
        centroCustoOverride: z.string().max(191).nullable().optional(),
        excluido: z.boolean().optional(),
        nota: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return upsertFinanceiroCaClassificacao(projetoIdFromCtx(ctx), input);
    }),

  removerClassificacao: custosProducaoModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteFinanceiroCaClassificacao(projetoIdFromCtx(ctx), input.id);
      return { ok: true as const };
    }),

  listAjustesManuais: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    return listFinanceiroCaAjustesManuais(projetoIdFromCtx(ctx));
  }),

  criarAjusteManual: custosProducaoModuleProcedure
    .input(
      z.object({
        tipo: z.enum(["pagar", "receber"]).default("pagar"),
        descricao: z.string().min(1).max(255),
        contraparte: z.string().max(191).nullable().optional(),
        rubrica: z.string().min(1).max(191),
        centroCusto: z.string().max(191).nullable().optional(),
        valor: z.number().finite(),
        dataCompetencia: z.string().max(10).nullable().optional(),
        dataVencimento: z.string().max(10).nullable().optional(),
        nota: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return insertFinanceiroCaAjusteManual(projetoIdFromCtx(ctx), {
        ...input,
        valor: String(input.valor),
      });
    }),

  excluirAjusteManual: custosProducaoModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await softDeleteFinanceiroCaAjusteManual(
        projetoIdFromCtx(ctx),
        input.id,
      );
      return { ok: true as const };
    }),
});
