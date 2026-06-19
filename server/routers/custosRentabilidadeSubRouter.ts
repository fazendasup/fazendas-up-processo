import { z } from "zod";
import {
  calcularRentabilidade,
  somarCustoOperacionalSugerido,
} from "@shared/custosRentabilidade";
import {
  commercialEditorCustosProducaoProjectProcedure,
  custosProducaoModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import * as db from "../db";
import * as rentabilidadeDb from "../custosRentabilidadeDb";
import * as custosProdutoDb from "../custosProdutoDb";
import { calcularFichaCompleta } from "../custosProdutoResolver";

const linhaInput = z.object({
  id: z.number().int().positive().optional(),
  fichaId: z.number().int().positive().nullable().optional(),
  nomeProduto: z.string().min(1).max(200),
  quantidade: z.number().nonnegative(),
  receitaTotal: z.number().nonnegative(),
  custoUnitarioManual: z.number().nonnegative().nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  ordem: z.number().int().optional(),
});

const periodoInput = z.object({
  id: z.number().int().positive().optional(),
  titulo: z.string().min(1).max(160),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
  custoOperacionalTotal: z.number().nonnegative().nullable().optional(),
  usarCustoSugerido: z.boolean().optional(),
  observacoes: z.string().max(4000).nullable().optional(),
  linhas: z.array(linhaInput).default([]),
});

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function tituloPeriodoPadrao(inicio: Date): string {
  return inicio.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

async function custoUnitarioPorFicha(projetoId: number, fichaIds: number[]) {
  const map = new Map<number, number | null>();
  if (fichaIds.length === 0) return map;
  const fichas = await custosProdutoDb.listCustosProdutoFichas(projetoId);
  const alvo = new Set(fichaIds);
  await Promise.all(
    fichas
      .filter((f) => alvo.has(f.id))
      .map(async (f) => {
        const r = await calcularFichaCompleta(projetoId, f);
        map.set(f.id, r.custoPorUnidade ?? null);
      }),
  );
  return map;
}

async function montarResultado(
  projetoId: number,
  periodo: {
    id: number;
    titulo: string;
    inicio: Date | string;
    fim: Date | string;
    custoOperacionalTotal: unknown;
    usarCustoSugerido: boolean;
    observacoes: string | null;
  },
  linhasDb: Awaited<ReturnType<typeof rentabilidadeDb.listRentabilidadeLinhas>>,
) {
  const compartilhados = await db.getCustosProducaoCompartilhados(projetoId);
  const custoSugerido = somarCustoOperacionalSugerido(compartilhados);
  const custoOperacional = periodo.usarCustoSugerido
    ? custoSugerido
    : num(periodo.custoOperacionalTotal) ?? custoSugerido;

  const fichaIds = linhasDb.map((l) => l.fichaId).filter((id): id is number => id != null);
  const custosFicha = await custoUnitarioPorFicha(projetoId, fichaIds);

  const calculo = calcularRentabilidade({
    custoOperacionalTotal: custoOperacional,
    linhas: linhasDb.map((l) => ({
      id: l.id,
      fichaId: l.fichaId,
      nomeProduto: l.nomeProduto,
      quantidade: num(l.quantidade) ?? 0,
      receitaTotal: num(l.receitaTotal) ?? 0,
      custoUnitarioManual: num(l.custoUnitarioManual),
      custoUnitarioFicha: l.fichaId != null ? (custosFicha.get(l.fichaId) ?? null) : null,
    })),
  });

  return {
    periodo: {
      id: periodo.id,
      titulo: periodo.titulo,
      inicio: periodo.inicio,
      fim: periodo.fim,
      custoOperacionalTotal: custoOperacional,
      custoOperacionalSugerido: custoSugerido,
      usarCustoSugerido: periodo.usarCustoSugerido,
      observacoes: periodo.observacoes,
    },
    linhas: linhasDb.map((l, idx) => ({
      ...l,
      quantidade: num(l.quantidade) ?? 0,
      receitaTotal: num(l.receitaTotal) ?? 0,
      custoUnitarioManual: num(l.custoUnitarioManual),
      resultado: calculo.linhas[idx],
    })),
    totais: calculo.totais,
  };
}

export const custosRentabilidadeSubRouter = router({
  listarPeriodos: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const periodos = await rentabilidadeDb.listRentabilidadePeriodos(pid);
    return periodos.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      inicio: p.inicio,
      fim: p.fim,
      updatedAt: p.updatedAt,
    }));
  }),

  obterPeriodo: custosProducaoModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const periodo = await rentabilidadeDb.getRentabilidadePeriodo(pid, input.id);
      if (!periodo) return null;
      const linhas = await rentabilidadeDb.listRentabilidadeLinhas(periodo.id);
      return montarResultado(pid, periodo, linhas);
    }),

  sugestaoCustoOperacional: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const compartilhados = await db.getCustosProducaoCompartilhados(pid);
    const total = somarCustoOperacionalSugerido(compartilhados);
    return {
      total,
      rubricas: compartilhados
        .filter((r) => r.ativo !== false && r.modo !== "rateio_projeto")
        .map((r) => ({
          id: r.id,
          rubrica: r.rubrica,
          grupo: r.grupo,
          valorMensal: num(r.valorMensal),
        }))
        .filter((r) => (r.valorMensal ?? 0) > 0),
    };
  }),

  salvarPeriodo: commercialEditorCustosProducaoProjectProcedure
    .input(periodoInput)
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const payload = {
        projetoId: pid,
        titulo: input.titulo.trim() || tituloPeriodoPadrao(input.inicio),
        inicio: input.inicio,
        fim: input.fim,
        custoOperacionalTotal:
          input.custoOperacionalTotal != null ? String(input.custoOperacionalTotal) : null,
        usarCustoSugerido: input.usarCustoSugerido ?? true,
        observacoes: input.observacoes?.trim() || null,
      };

      let periodoId = input.id;
      if (periodoId) {
        await rentabilidadeDb.updateRentabilidadePeriodo(pid, periodoId, payload);
      } else {
        periodoId = await rentabilidadeDb.insertRentabilidadePeriodo(payload);
      }

      await rentabilidadeDb.replaceRentabilidadeLinhas(
        periodoId,
        input.linhas.map((l, idx) => ({
          fichaId: l.fichaId ?? null,
          nomeProduto: l.nomeProduto.trim(),
          quantidade: String(l.quantidade),
          receitaTotal: String(l.receitaTotal),
          custoUnitarioManual:
            l.custoUnitarioManual != null ? String(l.custoUnitarioManual) : null,
          observacoes: l.observacoes?.trim() || null,
          ordem: l.ordem ?? idx,
        })),
      );

      const periodo = await rentabilidadeDb.getRentabilidadePeriodo(pid, periodoId);
      const linhas = await rentabilidadeDb.listRentabilidadeLinhas(periodoId);
      if (!periodo) throw new Error("Período não encontrado após salvar");
      return montarResultado(pid, periodo, linhas);
    }),

  excluirPeriodo: commercialEditorCustosProducaoProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await rentabilidadeDb.deleteRentabilidadePeriodo(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
