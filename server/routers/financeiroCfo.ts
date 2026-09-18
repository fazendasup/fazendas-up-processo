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
import {
  addProjecaoColuna,
  carregarComparativoProjecao,
  carregarDashboardKpiDetalhe,
  carregarFinanceiroDashboard,
  carregarProjecaoDesembolso,
  insertProjecaoLinhaManual,
  removeProjecaoColuna,
  softDeleteProjecaoLinhaManual,
  upsertProjecaoCelula,
} from "../financeiroProjecaoService";
import { DASHBOARD_KPI_IDS } from "@shared/financeiroDashboardKpi";

export const financeiroCfoRouter = router({
  /** Pacote financeiro Conta Azul + classificação editável do projeto. */
  analise: custosProducaoModuleProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
        compararMesAnterior: z.boolean().default(true),
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
        { compararMesAnterior: input.compararMesAnterior },
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

  /** Projeção de desembolso (mês ant. + 3 meses, editável). */
  projecaoDesembolso: custosProducaoModuleProcedure
    .input(
      z.object({
        mesInicioYm: z.string().regex(/^\d{4}-\d{2}$/),
        forceRefreshCa: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      carregarProjecaoDesembolso(
        projetoIdFromCtx(ctx),
        input.mesInicioYm,
        { forceRefreshCa: input.forceRefreshCa === true },
      ),
    ),

  /** Projeção × realizado (desembolso) + receita baseline × caixa. */
  comparativoProjecao: custosProducaoModuleProcedure
    .input(
      z.object({
        mesYm: z.string().regex(/^\d{4}-\d{2}$/),
        forceRefreshCa: z.boolean().optional(),
        /** Dia máximo do mês para contar orçamento (1–31). Default 15. */
        diaLimiteOrcamento: z.number().int().min(1).max(31).optional(),
        /** Se vazio/omitido = todos; senão só esses clientes. */
        clienteIdsOrcamento: z.array(z.string().min(1).max(64)).max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      carregarComparativoProjecao(projetoIdFromCtx(ctx), input.mesYm, {
        forceRefreshCa: input.forceRefreshCa === true,
        diaLimiteOrcamento: input.diaLimiteOrcamento,
        clienteIdsOrcamento: input.clienteIdsOrcamento,
      }),
    ),

  /** Dashboard principal: série 3 meses + snapshot do mês. */
  dashboard: custosProducaoModuleProcedure
    .input(
      z.object({
        mesYm: z.string().regex(/^\d{4}-\d{2}$/),
        forceRefreshCa: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      carregarFinanceiroDashboard(projetoIdFromCtx(ctx), input.mesYm, {
        forceRefreshCa: input.forceRefreshCa === true,
      }),
    ),

  /** Linhas por trás de um KPI do dashboard. */
  dashboardKpiDetalhe: custosProducaoModuleProcedure
    .input(
      z.object({
        mesYm: z.string().regex(/^\d{4}-\d{2}$/),
        kpi: z.enum(DASHBOARD_KPI_IDS),
      }),
    )
    .query(async ({ ctx, input }) =>
      carregarDashboardKpiDetalhe(
        projetoIdFromCtx(ctx),
        input.mesYm,
        input.kpi,
      ),
    ),

  salvarCelulaProjecao: custosProducaoModuleProcedure
    .input(
      z.object({
        linhaId: z.string().min(1).max(191),
        mesYm: z.string().regex(/^\d{4}-\d{2}$/),
        valorOverride: z.number().finite().nullable().optional(),
        ativo: z.boolean().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      upsertProjecaoCelula(projetoIdFromCtx(ctx), input),
    ),

  /** Marca várias células de uma vez (ex.: 3 meses à frente). */
  salvarCelulasProjecaoLote: custosProducaoModuleProcedure
    .input(
      z.object({
        celulas: z
          .array(
            z.object({
              linhaId: z.string().min(1).max(191),
              mesYm: z.string().regex(/^\d{4}-\d{2}$/),
              valorOverride: z.number().finite().nullable().optional(),
              ativo: z.boolean().nullable().optional(),
            }),
          )
          .min(1)
          .max(300),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      await Promise.all(
        input.celulas.map(c => upsertProjecaoCelula(projetoId, c)),
      );
      return { ok: true as const, qtd: input.celulas.length };
    }),

  adicionarColunaProjecao: custosProducaoModuleProcedure
    .input(z.object({ mesYm: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(async ({ ctx, input }) =>
      addProjecaoColuna(projetoIdFromCtx(ctx), input.mesYm),
    ),

  removerColunaProjecao: custosProducaoModuleProcedure
    .input(z.object({ mesYm: z.string().regex(/^\d{4}-\d{2}$/) }))
    .mutation(async ({ ctx, input }) => {
      await removeProjecaoColuna(projetoIdFromCtx(ctx), input.mesYm);
      return { ok: true as const };
    }),

  adicionarLinhaProjecao: custosProducaoModuleProcedure
    .input(
      z.object({
        descricao: z.string().min(1).max(255),
        fornecedor: z.string().max(191).nullable().optional(),
        rubrica: z.string().max(191).nullable().optional(),
        natureza: z
          .enum(["parcela", "recorrente", "unico", "manual"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      insertProjecaoLinhaManual(projetoIdFromCtx(ctx), input),
    ),

  removerLinhaProjecao: custosProducaoModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await softDeleteProjecaoLinhaManual(projetoIdFromCtx(ctx), input.id);
      return { ok: true as const };
    }),
});
