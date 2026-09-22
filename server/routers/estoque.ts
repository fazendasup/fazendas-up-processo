import { estoqueAccessProjectProcedure, projetoIdFromCtx, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import type { EstoqueItemRow } from "../../drizzle/schema";
import {
  UNIDADES_ESTOQUE,
  projetarEstoque,
  valorLinhaEstoque,
  custoConsumoDiario,
  slugifyEstoqueCategoria,
} from "../../shared/estoque";
import {
  assertEstoqueCategoriaExiste,
  createEstoqueCategoria,
  deleteEstoqueCategoria,
  listEstoqueCategorias,
  renameEstoqueCategoria,
} from "../estoqueCategoriasDb";

const categoriaSlugZ = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9_]+$/, "Categoria inválida");
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
    consumoAplicadoAteIso: row.consumoAplicadoAte?.toISOString() ?? null,
    sugestaoCompraQuantidade: p.sugestaoCompraQuantidade,
    estoqueAlvoQuantidade: p.estoqueAlvoQuantidade,
    status: p.status,
    valorLinha,
    custoConsumoDiario: custoDia,
    custoConsumoMensal: custoDia != null ? custoDia * 30 : null,
    valorCompraSugerida:
      row.precoUnitario != null && Number.isFinite(row.precoUnitario)
        ? p.sugestaoCompraQuantidade * row.precoUnitario
        : null,
  };
}

export const estoqueRouter = router({
  list: estoqueAccessProjectProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const rows = await db.getAllEstoqueItens(pid);
    return rows.map(r => enrich(normalizeLegacyUnits(r)));
  }),

  listCategorias: estoqueAccessProjectProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const rows = await listEstoqueCategorias(pid);
    return rows.map(r => ({
      id: r.id,
      slug: r.slug,
      nome: r.nome,
      ordem: r.ordem,
      padrao: r.padrao,
    }));
  }),

  createCategoria: estoqueAccessProjectProcedure
    .input(
      z.object({
        nome: z.string().min(1).max(80),
        slug: z.string().max(32).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createEstoqueCategoria({
          projetoId: projetoIdFromCtx(ctx),
          nome: input.nome,
          slug: input.slug,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Não foi possível criar a classe.",
        });
      }
    }),

  renameCategoria: estoqueAccessProjectProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await renameEstoqueCategoria({
          projetoId: projetoIdFromCtx(ctx),
          id: input.id,
          nome: input.nome,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Não foi possível renomear.",
        });
      }
    }),

  deleteCategoria: estoqueAccessProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteEstoqueCategoria({
          projetoId: projetoIdFromCtx(ctx),
          id: input.id,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Não foi possível excluir.",
        });
      }
    }),

  kpis: estoqueAccessProjectProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const [rows, cats] = await Promise.all([
      db.getAllEstoqueItens(pid),
      listEstoqueCategorias(pid),
    ]);
    const enriched = rows.map(r => enrich(normalizeLegacyUnits(r)));
    let valorTotal = 0;
    let custoMes = 0;
    let valorCompraSugerida = 0;
    let itensComCompraSugerida = 0;
    let criticos = 0;
    let atencao = 0;
    let diasCoberturaSum = 0;
    let diasCoberturaN = 0;
    const porCategoria: Record<
      string,
      { count: number; valor: number; criticos: number }
    > = {};
    for (const c of cats) {
      porCategoria[c.slug] = { count: 0, valor: 0, criticos: 0 };
    }
    for (const e of enriched) {
      valorTotal += e.valorLinha;
      if (e.custoConsumoMensal != null) custoMes += e.custoConsumoMensal;
      if (e.sugestaoCompraQuantidade > 0) {
        itensComCompraSugerida++;
        if (e.valorCompraSugerida != null) valorCompraSugerida += e.valorCompraSugerida;
      }
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
      valorCompraSugerida,
      itensComCompraSugerida,
      itensCriticos: criticos,
      itensAtencao: atencao,
      diasMedioCobertura: diasCoberturaN > 0 ? diasCoberturaSum / diasCoberturaN : null,
      totalItens: enriched.length,
      porCategoria,
    };
  }),

  aplicarConsumoDiario: estoqueAccessProjectProcedure.mutation(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    return db.aplicarConsumoDiarioEstoque(pid);
  }),

  create: estoqueAccessProjectProcedure
    .input(
      z.object({
        categoria: categoriaSlugZ,
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
      const pid = projetoIdFromCtx(ctx);
      await assertEstoqueCategoriaExiste(pid, input.categoria);
      return db.createEstoqueItem({
        projetoId: pid,
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

  update: estoqueAccessProjectProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        categoria: categoriaSlugZ.optional(),
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
      const pid = projetoIdFromCtx(ctx);
      const { id, ...rest } = input;
      const row = await db.getEstoqueItemById(pid, id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
      if (rest.categoria) await assertEstoqueCategoriaExiste(pid, rest.categoria);
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) (updates as Record<string, unknown>)[k] = v;
      }
      if (Object.keys(updates).length === 0) return row;
      if (
        updates.quantidadeTotal !== undefined ||
        updates.usoPorEvento !== undefined ||
        updates.frequenciaDias !== undefined
      ) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        updates.consumoAplicadoAte = hoje;
      }
      return db.updateEstoqueItem(pid, id, updates as never);
    }),

  delete: estoqueAccessProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getEstoqueItemById(projetoIdFromCtx(ctx), input.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
      return db.deleteEstoqueItem(projetoIdFromCtx(ctx), input.id);
    }),

  /** Utilitário p/ UI: preview do slug a partir do nome. */
  previewSlug: estoqueAccessProjectProcedure
    .input(z.object({ nome: z.string() }))
    .query(({ input }) => ({ slug: slugifyEstoqueCategoria(input.nome) })),
});
