import { z } from "zod";
import {
  calcularRentabilidade,
  somarCustoOperacionalSugerido,
} from "@shared/custosRentabilidade";
import {
  MODOS_OVERHEAD_RENTABILIDADE,
  ORIGENS_OVERHEAD_RENTABILIDADE,
  somarOverheadItensIncluidos,
  type ModoOverheadRentabilidade,
} from "@shared/custosRentabilidadeOverhead";
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
import { buscarVendasContaAzulPorPeriodo } from "../custosRentabilidadeContaAzul";
import { buscarPagamentosContaAzulPorPeriodo } from "../custosRentabilidadeContaAzulPagamentos";
import * as moEquipeDb from "../custosMoEquipeDb";
import { mapMoEquipeRowToInput } from "../moEquipeMapper";
import { calcularCustoMensalEquipe, somarMoOverheadEquipes } from "@shared/custosMoEquipe";
import type { CustoRentabilidadePeriodoRow } from "../../drizzle/schema";

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

const overheadInput = z.object({
  id: z.number().int().positive().optional(),
  origem: z.enum(ORIGENS_OVERHEAD_RENTABILIDADE).default("manual"),
  contaAzulParcelaId: z.string().max(64).nullable().optional(),
  refModeloId: z.number().int().positive().nullable().optional(),
  grupo: z.string().min(1).max(64),
  rubrica: z.string().min(1).max(160),
  descricao: z.string().max(2000).nullable().optional(),
  valorOriginal: z.number().nonnegative().nullable().optional(),
  valor: z.number().nonnegative(),
  incluido: z.boolean().default(true),
  ordem: z.number().int().optional(),
});

const periodoInput = z.object({
  id: z.number().int().positive().optional(),
  titulo: z.string().min(1).max(160),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
  custoOperacionalTotal: z.number().nonnegative().nullable().optional(),
  usarCustoSugerido: z.boolean().optional(),
  modoOverhead: z.enum(MODOS_OVERHEAD_RENTABILIDADE).optional(),
  observacoes: z.string().max(4000).nullable().optional(),
  linhas: z.array(linhaInput).default([]),
  overheadItens: z.array(overheadInput).default([]),
});

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function tituloPeriodoPadrao(inicio: Date): string {
  return inicio.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function resolveModoOverhead(periodo: CustoRentabilidadePeriodoRow): ModoOverheadRentabilidade {
  if (periodo.modoOverhead) return periodo.modoOverhead as ModoOverheadRentabilidade;
  return periodo.usarCustoSugerido ? "sugerido" : "manual";
}

function mapOverheadDb(row: Awaited<ReturnType<typeof rentabilidadeDb.listRentabilidadeOverheadItens>>[number]) {
  return {
    id: row.id,
    origem: row.origem,
    contaAzulParcelaId: row.contaAzulParcelaId,
    refModeloId: row.refModeloId,
    grupo: row.grupo,
    rubrica: row.rubrica,
    descricao: row.descricao,
    valorOriginal: num(row.valorOriginal),
    valor: num(row.valor) ?? 0,
    incluido: row.incluido,
    ordem: row.ordem,
  };
}

async function itensModeloOverheadProjeto(projetoId: number) {
  const [sugerido, modoMo] = await Promise.all([
    custoOperacionalSugeridoProjeto(projetoId),
    moEquipeDb.getModoCustoMoEquipe(projetoId),
  ]);
  const itens: Array<{
    origem: "modelo_compartilhados" | "modelo_mo";
    refModeloId: number;
    grupo: string;
    rubrica: string;
    descricao: string | null;
    valorOriginal: number;
    valor: number;
    incluido: boolean;
  }> = [];

  for (const r of sugerido.compartilhados) {
    if (r.ativo === false || r.modo === "rateio_projeto") continue;
    const valor = num(r.valorMensal);
    if ((valor ?? 0) <= 0) continue;
    itens.push({
      origem: "modelo_compartilhados",
      refModeloId: r.id,
      grupo: r.grupo,
      rubrica: r.rubrica,
      descricao: r.descricao,
      valorOriginal: valor!,
      valor: valor!,
      incluido: true,
    });
  }

  for (const e of sugerido.equipes) {
    if (!e.ativo || e.finalidade !== "overhead") continue;
    const valor = calcularCustoMensalEquipe(mapMoEquipeRowToInput(e), modoMo);
    if (valor <= 0) continue;
    itens.push({
      origem: "modelo_mo",
      refModeloId: e.id,
      grupo: "mao_de_obra",
      rubrica: `MO fixa — ${e.nome}`,
      descricao: e.observacoes,
      valorOriginal: valor,
      valor: valor,
      incluido: true,
    });
  }

  return itens;
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

async function custoOperacionalSugeridoProjeto(projetoId: number) {
  const compartilhados = await db.getCustosProducaoCompartilhados(projetoId);
  const rubricasCompartilhados = somarCustoOperacionalSugerido(compartilhados);
  const [equipesRows, modoMo] = await Promise.all([
    moEquipeDb.listMoEquipes(projetoId),
    moEquipeDb.getModoCustoMoEquipe(projetoId),
  ]);
  const equipesInput = equipesRows.map(mapMoEquipeRowToInput);
  const moOverhead = somarMoOverheadEquipes(equipesInput, modoMo);
  return {
    total: rubricasCompartilhados + moOverhead,
    rubricasCompartilhados,
    moOverhead,
    compartilhados,
    equipes: equipesRows,
  };
}

async function montarResultado(
  projetoId: number,
  periodo: CustoRentabilidadePeriodoRow,
  linhasDb: Awaited<ReturnType<typeof rentabilidadeDb.listRentabilidadeLinhas>>,
  overheadDb: Awaited<ReturnType<typeof rentabilidadeDb.listRentabilidadeOverheadItens>>,
) {
  const sugerido = await custoOperacionalSugeridoProjeto(projetoId);
  const custoSugerido = sugerido.total;
  const modoOverhead = resolveModoOverhead(periodo);
  const overheadItens = overheadDb.map(mapOverheadDb);

  let custoOperacional: number;
  if (modoOverhead === "sugerido") {
    custoOperacional = custoSugerido;
  } else if (modoOverhead === "manual") {
    custoOperacional = num(periodo.custoOperacionalTotal) ?? 0;
  } else {
    custoOperacional = somarOverheadItensIncluidos(overheadItens);
  }

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
      custoOperacionalCompartilhados: sugerido.rubricasCompartilhados,
      custoOperacionalMoFixa: sugerido.moOverhead,
      usarCustoSugerido: modoOverhead === "sugerido",
      modoOverhead,
      observacoes: periodo.observacoes,
    },
    overheadItens,
    linhas: linhasDb.map((l, idx) => ({
      ...l,
      quantidade: num(l.quantidade) ?? 0,
      receitaTotal: num(l.receitaTotal) ?? 0,
      custoUnitarioManual: num(l.custoUnitarioManual),
      resultado: calculo.linhas[idx],
    })),
    totais: calculo.totais,
    viabilidade: calculo.viabilidade,
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
      const [linhas, overheadItens] = await Promise.all([
        rentabilidadeDb.listRentabilidadeLinhas(periodo.id),
        rentabilidadeDb.listRentabilidadeOverheadItens(periodo.id),
      ]);
      return montarResultado(pid, periodo, linhas, overheadItens);
    }),

  vendasContaAzul: custosProducaoModuleProcedure
    .input(z.object({ inicio: z.coerce.date(), fim: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      return buscarVendasContaAzulPorPeriodo(pid, input.inicio, input.fim);
    }),

  pagamentosContaAzul: custosProducaoModuleProcedure
    .input(z.object({ inicio: z.coerce.date(), fim: z.coerce.date() }))
    .query(async ({ input }) => buscarPagamentosContaAzulPorPeriodo(input.inicio, input.fim)),

  itensModeloOverhead: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    return itensModeloOverheadProjeto(projetoIdFromCtx(ctx));
  }),

  sugestaoCustoOperacional: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const sugerido = await custoOperacionalSugeridoProjeto(pid);
    return {
      total: sugerido.total,
      rubricasCompartilhados: sugerido.rubricasCompartilhados,
      moOverhead: sugerido.moOverhead,
      rubricas: sugerido.compartilhados
        .filter((r) => r.ativo !== false && r.modo !== "rateio_projeto")
        .map((r) => ({
          id: r.id,
          rubrica: r.rubrica,
          grupo: r.grupo,
          valorMensal: num(r.valorMensal),
        }))
        .filter((r) => (r.valorMensal ?? 0) > 0),
      equipesOverhead: sugerido.equipes
        .filter((e) => e.ativo && e.finalidade === "overhead")
        .map((e) => ({
          id: e.id,
          nome: e.nome,
          regime: e.regime,
          custoMensal: num(e.custoMensalTotal) ?? num(e.custoMensalBase),
        })),
    };
  }),

  salvarPeriodo: commercialEditorCustosProducaoProjectProcedure
    .input(periodoInput)
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const modoOverhead =
        input.modoOverhead ??
        (input.usarCustoSugerido === false ? "manual" : input.usarCustoSugerido ? "sugerido" : "itens");
      const payload = {
        projetoId: pid,
        titulo: input.titulo.trim() || tituloPeriodoPadrao(input.inicio),
        inicio: input.inicio,
        fim: input.fim,
        custoOperacionalTotal:
          input.custoOperacionalTotal != null ? String(input.custoOperacionalTotal) : null,
        usarCustoSugerido: modoOverhead === "sugerido",
        modoOverhead,
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

      await rentabilidadeDb.replaceRentabilidadeOverheadItens(
        periodoId,
        input.overheadItens.map((i, idx) => ({
          origem: i.origem,
          contaAzulParcelaId: i.contaAzulParcelaId ?? null,
          refModeloId: i.refModeloId ?? null,
          grupo: i.grupo,
          rubrica: i.rubrica.trim(),
          descricao: i.descricao?.trim() || null,
          valorOriginal: i.valorOriginal != null ? String(i.valorOriginal) : null,
          valor: String(i.valor),
          incluido: i.incluido,
          ordem: i.ordem ?? idx,
        })),
      );

      const periodo = await rentabilidadeDb.getRentabilidadePeriodo(pid, periodoId);
      const [linhas, overheadItens] = await Promise.all([
        rentabilidadeDb.listRentabilidadeLinhas(periodoId),
        rentabilidadeDb.listRentabilidadeOverheadItens(periodoId),
      ]);
      if (!periodo) throw new Error("Período não encontrado após salvar");
      return montarResultado(pid, periodo, linhas, overheadItens);
    }),

  excluirPeriodo: commercialEditorCustosProducaoProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await rentabilidadeDb.deleteRentabilidadePeriodo(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
