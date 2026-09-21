import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  custosProducaoModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import { resolveComercialUsuario } from "../comercial/resolve-usuario";
import type { User } from "../../drizzle/schema";
import {
  analisarFinanceiroCfoContaAzul,
  buscarParcelaDetalheFinanceiro,
} from "../financeiroContaAzulFluxo";
import {
  deleteFinanceiroCaClassificacao,
  deleteFinanceiroCaRubricaMeta,
  insertFinanceiroCaAjusteManual,
  listFinanceiroCaAjustesManuais,
  listFinanceiroCaClassificacoes,
  listFinanceiroCaRubricasMeta,
  softDeleteFinanceiroCaAjusteManual,
  upsertFinanceiroCaClassificacao,
  upsertFinanceiroCaRubricaMeta,
} from "../financeiroClassificacaoDb";
import {
  inferirComportamentoCustoHeuristico,
  resolverComportamentoCusto,
} from "@shared/financeiroRubricaComportamento";
import { aplicarEdicoesClassificacao } from "@shared/financeiroCfoInsights";
import { ehNaoDesembolsoCusto } from "@shared/financeiroProjecaoDesembolso";
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
import { upsertRubricaMesConcluida } from "../financeiroProjecaoDb";
import {
  getFinanceiroCaConfig,
  upsertFinanceiroCaConfig,
} from "../financeiroConfigDb";
import { DASHBOARD_KPI_IDS } from "@shared/financeiroDashboardKpi";
import { DASHBOARD_GRANULARIDADES } from "@shared/financeiroPeriodoDashboard";

async function assertNaoPerfilSomenteAnalise(user: User) {
  if (user.role !== "comercial") return;
  const comercialUsuario = await resolveComercialUsuario(user);
  if (comercialUsuario?.perfil === "FINANCEIRO") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Perfil financeiro não edita rúbricas, gaps, lançamentos ou ajustes.",
    });
  }
}

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
      await assertNaoPerfilSomenteAnalise(ctx.user);
      return upsertFinanceiroCaClassificacao(projetoIdFromCtx(ctx), input);
    }),

  removerClassificacao: custosProducaoModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertNaoPerfilSomenteAnalise(ctx.user);
      await deleteFinanceiroCaClassificacao(projetoIdFromCtx(ctx), input.id);
      return { ok: true as const };
    }),

  /** Overrides de custo fixo × variável por rúbrica. */
  listRubricasMeta: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    return listFinanceiroCaRubricasMeta(projetoIdFromCtx(ctx));
  }),

  /**
   * Rúbricas da projeção (mês ant. + 3 meses) para classificar fixo × variável.
   * Fonte = mesmas linhas da aba Projeção (não o catálogo CA nem só o mês aberto).
   */
  listRubricasComportamento: custosProducaoModuleProcedure
    .input(
      z.object({
        /** Mês âncora da projeção (AAAA-MM), igual à aba Projeção. */
        mesYm: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        /** Alias legado — usa o mês de `inicio` se `mesYm` omitido. */
        inicio: z.coerce.date().optional(),
        fim: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      const mesYm =
        input.mesYm ??
        (input.inicio
          ? `${input.inicio.getFullYear()}-${String(input.inicio.getMonth() + 1).padStart(2, "0")}`
          : null);
      if (!mesYm || !/^\d{4}-\d{2}$/.test(mesYm)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe mesYm (AAAA-MM).",
        });
      }

      const [grade, metas] = await Promise.all([
        carregarProjecaoDesembolso(projetoId, mesYm),
        listFinanceiroCaRubricasMeta(projetoId),
      ]);

      const mesesNoTotal = new Set(
        grade.colunas.filter(c => c.contaNoTotal).map(c => c.mesYm),
      );

      type Acc = {
        rubrica: string;
        projetado3m: number;
        qtdLinhas: number;
      };
      const byLower = new Map<string, Acc>();

      const addLinha = (rubricaRaw: string | null | undefined, projetado: number) => {
        const rubrica = (rubricaRaw ?? "").trim() || "(Sem rúbrica)";
        const k = rubrica.toLowerCase();
        const cur = byLower.get(k) ?? {
          rubrica,
          projetado3m: 0,
          qtdLinhas: 0,
        };
        cur.projetado3m = Math.round((cur.projetado3m + projetado) * 100) / 100;
        cur.qtdLinhas += 1;
        byLower.set(k, cur);
      };

      for (const lin of grade.linhas) {
        if (ehNaoDesembolsoCusto(lin.label, lin.rubrica)) continue;
        // Qualquer linha que aparece na grade da projeção (3 meses + contexto).
        const projetado3m = lin.celulas
          .filter(c => mesesNoTotal.has(c.mesYm) && c.ativo)
          .reduce((s, c) => s + (c.valorEfetivo || 0), 0);
        addLinha(lin.rubrica, projetado3m);
      }

      // Overrides salvos que ainda não estão na grade atual.
      for (const m of metas) {
        const t = m.rubrica.trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (!byLower.has(k)) {
          byLower.set(k, { rubrica: t, projetado3m: 0, qtdLinhas: 0 });
        }
      }

      const metaByRubrica = new Map(
        metas.map(m => [m.rubrica.trim().toLowerCase(), m]),
      );

      return Array.from(byLower.values())
        .sort((a, b) => {
          if (b.projetado3m !== a.projetado3m) {
            return b.projetado3m - a.projetado3m;
          }
          return a.rubrica.localeCompare(b.rubrica, "pt-BR");
        })
        .map(row => {
          const meta = metaByRubrica.get(row.rubrica.toLowerCase());
          const override =
            meta?.comportamentoCusto === "fixo" ||
            meta?.comportamentoCusto === "variavel"
              ? meta.comportamentoCusto
              : null;
          const heuristico = inferirComportamentoCustoHeuristico(row.rubrica);
          return {
            rubrica: row.rubrica,
            heuristico,
            comportamentoCusto: override,
            efetivo: resolverComportamentoCusto(row.rubrica, override),
            nota: meta?.nota ?? null,
            editado: override != null,
            projetado3m: row.projetado3m,
            qtdLinhas: row.qtdLinhas,
          };
        });
    }),

  salvarRubricaComportamento: custosProducaoModuleProcedure
    .input(
      z.object({
        rubrica: z.string().min(1).max(191),
        /** null = voltar à heurística automática */
        comportamentoCusto: z.enum(["fixo", "variavel"]).nullable(),
        nota: z.string().max(2000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertNaoPerfilSomenteAnalise(ctx.user);
      const projetoId = projetoIdFromCtx(ctx);
      if (input.comportamentoCusto == null && (input.nota == null || input.nota === "")) {
        await deleteFinanceiroCaRubricaMeta(projetoId, input.rubrica);
        return { ok: true as const, deleted: true as const };
      }
      const row = await upsertFinanceiroCaRubricaMeta(projetoId, {
        rubrica: input.rubrica,
        comportamentoCusto: input.comportamentoCusto,
        nota: input.nota,
      });
      return { ok: true as const, deleted: false as const, row };
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
      await assertNaoPerfilSomenteAnalise(ctx.user);
      return insertFinanceiroCaAjusteManual(projetoIdFromCtx(ctx), {
        ...input,
        valor: String(input.valor),
      });
    }),

  excluirAjusteManual: custosProducaoModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertNaoPerfilSomenteAnalise(ctx.user);
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

  /** Dashboard principal: série 3 meses + snapshot do período. */
  dashboard: custosProducaoModuleProcedure
    .input(
      z.object({
        granularidade: z.enum(DASHBOARD_GRANULARIDADES).default("mes"),
        /** dia/semana: YYYY-MM-DD · mes: YYYY-MM · ano: YYYY */
        ref: z.string().min(4).max(10).optional(),
        /** Alias legado — equivalente a granularidade=mes + ref. */
        mesYm: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        forceRefreshCa: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const ref = input.ref ?? input.mesYm;
      if (!ref) throw new Error("Informe ref ou mesYm.");
      return carregarFinanceiroDashboard(projetoIdFromCtx(ctx), {
        granularidade: input.granularidade,
        ref,
        forceRefreshCa: input.forceRefreshCa === true,
      });
    }),

  /** Linhas por trás de um KPI do dashboard. */
  dashboardKpiDetalhe: custosProducaoModuleProcedure
    .input(
      z.object({
        granularidade: z.enum(DASHBOARD_GRANULARIDADES).default("mes"),
        ref: z.string().min(4).max(10).optional(),
        mesYm: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        kpi: z.enum(DASHBOARD_KPI_IDS),
      }),
    )
    .query(async ({ ctx, input }) => {
      const ref = input.ref ?? input.mesYm;
      if (!ref) throw new Error("Informe ref ou mesYm.");
      return carregarDashboardKpiDetalhe(
        projetoIdFromCtx(ctx),
        {
          granularidade: input.granularidade,
          ref,
        },
        input.kpi,
      );
    }),

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

  /** Marca rúbrica do comparativo como concluída (pago a menos vira saldo). */
  marcarRubricaConcluida: custosProducaoModuleProcedure
    .input(
      z.object({
        mesYm: z.string().regex(/^\d{4}-\d{2}$/),
        rubrica: z.string().min(1).max(191),
        concluida: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      upsertRubricaMesConcluida(projetoIdFromCtx(ctx), input),
    ),

  /** Âncora do saldo bancário consolidado (todas as contas). */
  configSaldos: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const projetoId = projetoIdFromCtx(ctx);
    const row = await getFinanceiroCaConfig(projetoId);
    const inicial =
      row?.saldoBancarioInicial ?? row?.bradescoSaldoInicial ?? null;
    const data =
      row?.saldoBancarioInicialData ?? row?.bradescoSaldoInicialData ?? null;
    return {
      saldoBancarioInicial: inicial != null ? Number(inicial) : null,
      saldoBancarioInicialData: data,
      // aliases legados
      bradescoSaldoInicial: inicial != null ? Number(inicial) : null,
      bradescoSaldoInicialData: data,
    };
  }),

  salvarConfigSaldos: custosProducaoModuleProcedure
    .input(
      z.object({
        saldoBancarioInicial: z.number().finite().nullable().optional(),
        saldoBancarioInicialData: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        /** @deprecated use saldoBancarioInicial */
        bradescoSaldoInicial: z.number().finite().nullable().optional(),
        bradescoSaldoInicialData: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await upsertFinanceiroCaConfig(projetoIdFromCtx(ctx), {
        saldoBancarioInicial:
          input.saldoBancarioInicial !== undefined
            ? input.saldoBancarioInicial
            : input.bradescoSaldoInicial,
        saldoBancarioInicialData:
          input.saldoBancarioInicialData !== undefined
            ? input.saldoBancarioInicialData
            : input.bradescoSaldoInicialData,
      });
      const inicial =
        row.saldoBancarioInicial ?? row.bradescoSaldoInicial ?? null;
      const data =
        row.saldoBancarioInicialData ?? row.bradescoSaldoInicialData ?? null;
      return {
        saldoBancarioInicial: inicial != null ? Number(inicial) : null,
        saldoBancarioInicialData: data,
        bradescoSaldoInicial: inicial != null ? Number(inicial) : null,
        bradescoSaldoInicialData: data,
      };
    }),
});
