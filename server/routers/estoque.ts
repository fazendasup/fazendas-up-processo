import { estoqueModuleProcedure, projetoIdFromCtx, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import type { EstoqueItemRow } from "../../drizzle/schema";
import {
  CATEGORIAS_ESTOQUE,
  UNIDADES_ESTOQUE,
  projetarEstoque,
  valorLinhaEstoque,
  custoConsumoDiario,
} from "../../shared/estoque";

const categoriaZ = z.enum(CATEGORIAS_ESTOQUE);
const unidadeZ = z.enum(UNIDADES_ESTOQUE);

/** Valores ainda em g/ml na BD são apresentados como kg/L e quantidades ÷1000 (alinhado à migração 0025). */
function normalizeLegacyUnits(row: EstoqueItemRow): EstoqueItemRow {
  if (row.unidadeTipo === "g") {
    return {
      ...row,
      unidadeTipo: "kg",
      quantidadeTotal: row.quantidadeTotal / 1000,
      usoPorEvento: row.usoPorEvento / 1000,
      nivelMinimo: row.nivelMinimo != null ? row.nivelMinimo / 1000 : null,
    };
  }
  if (row.unidadeTipo === "ml") {
    return {
      ...row,
      unidadeTipo: "l",
      quantidadeTotal: row.quantidadeTotal / 1000,
      usoPorEvento: row.usoPorEvento / 1000,
      nivelMinimo: row.nivelMinimo != null ? row.nivelMinimo / 1000 : null,
    };
  }
  return row;
}

function enrich(row: EstoqueItemRow) {
  const p = projetarEstoque({
    quantidadeTotal: row.quantidadeTotal,
    usoPorEvento: row.usoPorEvento,
    frequenciaDias: row.frequenciaDias,
    prazoEntregaDias: row.prazoEntregaDias,
    diasMargemCompra: row.diasMargemCompra,
    nivelMinimo: row.nivelMinimo,
  });
  const valorLinha = valorLinhaEstoque(row.quantidadeTotal, row.precoUnitario);
  const custoDia = custoConsumoDiario(p.consumoMedioDiario, row.precoUnitario);
  return {
    ...row,
    consumoMedioDiario: p.consumoMedioDiario,
    diasAteEsgotar: p.diasAteEsgotar,
    dataEsgotamentoIso: p.dataEsgotamento?.toISOString() ?? null,
    dataCompraSugeridaIso: p.dataCompraSugerida?.toISOString() ?? null,
    status: p.status,
    valorLinha,
    custoConsumoDiario: custoDia,
    custoConsumoMensal: custoDia != null ? custoDia * 30 : null,
  };
}

export const estoqueRouter = router({
  list: estoqueModuleProcedure.query(async ({ ctx }) => {
    const rows = await db.getAllEstoqueItens(projetoIdFromCtx(ctx));
    return rows.map((r) => enrich(normalizeLegacyUnits(r)));
  }),

  kpis: estoqueModuleProcedure.query(async ({ ctx }) => {
    const rows = await db.getAllEstoqueItens(projetoIdFromCtx(ctx));
    const enriched = rows.map((r) => enrich(normalizeLegacyUnits(r)));
    let valorTotal = 0;
    let custoMes = 0;
    let criticos = 0;
    let atencao = 0;
    let diasCoberturaSum = 0;
    let diasCoberturaN = 0;
    const porCategoria: Record<
      string,
      { count: number; valor: number; criticos: number }
    > = {};
    for (const c of CATEGORIAS_ESTOQUE) {
      porCategoria[c] = { count: 0, valor: 0, criticos: 0 };
    }
    for (const e of enriched) {
      valorTotal += e.valorLinha;
      if (e.custoConsumoMensal != null) custoMes += e.custoConsumoMensal;
      if (e.status === "critico") criticos++;
      else if (e.status === "atencao") atencao++;
      if (e.diasAteEsgotar != null && Number.isFinite(e.diasAteEsgotar)) {
        diasCoberturaSum += e.diasAteEsgotar;
        diasCoberturaN++;
      }
      const cat = porCategoria[e.categoria] ?? { count: 0, valor: 0, criticos: 0 };
      cat.count++;
      cat.valor += e.valorLinha;
      if (e.status === "critico") cat.criticos++;
      porCategoria[e.categoria] = cat;
    }
    return {
      valorTotalInventario: valorTotal,
      custoConsumoMensalEstimado: custoMes,
      itensCriticos: criticos,
      itensAtencao: atencao,
      diasMedioCobertura: diasCoberturaN > 0 ? diasCoberturaSum / diasCoberturaN : null,
      totalItens: enriched.length,
      porCategoria,
    };
  }),

  create: estoqueModuleProcedure
    .input(
      z.object({
        categoria: categoriaZ,
        nome: z.string().min(1).max(256),
        quantidadeTotal: z.number().finite(),
        unidadeTipo: unidadeZ,
        usoPorEvento: z.number().finite().min(0),
        frequenciaDias: z.number().finite().positive(),
        prazoEntregaDias: z.number().int().min(0).default(7),
        diasMargemCompra: z.number().int().min(0).default(7),
        nivelMinimo: z.number().finite().optional().nullable(),
        precoUnitario: z.number().finite().optional().nullable(),
        fornecedor: z.string().max(256).optional().nullable(),
        observacoes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return db.createEstoqueItem({
        projetoId: projetoIdFromCtx(ctx),
        categoria: input.categoria,
        nome: input.nome,
        quantidadeTotal: input.quantidadeTotal,
        unidadeTipo: input.unidadeTipo,
        usoPorEvento: input.usoPorEvento,
        frequenciaDias: input.frequenciaDias,
        prazoEntregaDias: input.prazoEntregaDias,
        diasMargemCompra: input.diasMargemCompra,
        nivelMinimo: input.nivelMinimo ?? null,
        precoUnitario: input.precoUnitario ?? null,
        fornecedor: input.fornecedor ?? null,
        observacoes: input.observacoes ?? null,
      });
    }),

  update: estoqueModuleProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        categoria: categoriaZ.optional(),
        nome: z.string().min(1).max(256).optional(),
        quantidadeTotal: z.number().finite().optional(),
        unidadeTipo: unidadeZ.optional(),
        usoPorEvento: z.number().finite().min(0).optional(),
        frequenciaDias: z.number().finite().positive().optional(),
        prazoEntregaDias: z.number().int().min(0).optional(),
        diasMargemCompra: z.number().int().min(0).optional(),
        nivelMinimo: z.number().finite().nullable().optional(),
        precoUnitario: z.number().finite().nullable().optional(),
        fornecedor: z.string().max(256).nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const row = await db.getEstoqueItemById(projetoIdFromCtx(ctx), id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) (updates as Record<string, unknown>)[k] = v;
      }
      if (Object.keys(updates).length === 0) return row;
      return db.updateEstoqueItem(projetoIdFromCtx(ctx), id, updates as never);
    }),

  delete: estoqueModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getEstoqueItemById(projetoIdFromCtx(ctx), input.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
      return db.deleteEstoqueItem(projetoIdFromCtx(ctx), input.id);
    }),
});
