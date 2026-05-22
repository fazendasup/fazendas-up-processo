import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

function ymd(v: Date | string | null | undefined): string {
  if (!v) return "sem-data";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "sem-data";
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function loteRef(prefixo: string, variedadeId: number, data: Date | string | null | undefined, id: number): string {
  return `${prefixo}-${variedadeId}-${ymd(data)}-${String(id).padStart(4, "0")}`;
}

export const variedadesRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllVariedades(projetoIdFromCtx(ctx));
  }),
  historico: projectProcedure
    .input(z.object({ variedadeId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const [germinacao, transplantios, colheitas] = await Promise.all([
        db.getAllGerminacao(pid),
        db.getAllTransplantios(pid),
        db.getAllRegistrosColheita(pid),
      ]);

      const eventos = [
        ...germinacao
          .filter((g) => g.variedadeId === input.variedadeId)
          .map((g) => ({
            id: `g-${g.id}`,
            tipo: "plantio" as const,
            data: g.dataPlantio,
            loteReferencia: loteRef("LOT-PLA", input.variedadeId, g.dataPlantio, g.id),
            quantidade: g.quantidade,
            faseOrigem: null,
            faseDestino: "germinacao",
            observacoes: g.observacoes,
            executadoPorNome: g.executadoPorNome,
          })),
        ...transplantios
          .filter((t) => t.variedadeId === input.variedadeId)
          .map((t) => ({
            id: `t-${t.id}`,
            tipo: t.quantidadeDesperdicio > 0 && t.quantidadeTransplantada === 0 ? ("descarte" as const) : ("transplantio" as const),
            data: t.dataHora,
            loteReferencia: loteRef("LOT-TR", input.variedadeId, t.dataHora, t.id),
            quantidade: t.quantidadeTransplantada || t.quantidadeDesperdicio,
            faseOrigem: t.faseOrigem,
            faseDestino: t.faseDestino,
            observacoes: t.observacoes ?? t.motivoDesperdicio,
            executadoPorNome: t.executadoPorNome,
          })),
        ...colheitas
          .filter((c) => c.variedadeId === input.variedadeId)
          .map((c) => ({
            id: `c-${c.id}`,
            tipo: "colheita" as const,
            data: c.dataColheita,
            loteReferencia: loteRef("LOT-COL", input.variedadeId, c.dataColheita, c.id),
            quantidade: c.quantidadePlantas,
            faseOrigem: "maturacao",
            faseDestino: null,
            observacoes: c.observacoes,
            executadoPorNome: c.executadoPorNome,
          })),
      ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      return eventos;
    }),
  create: adminProjectProcedure
    .input(
      z.object({
        slug: z.string().optional(),
        nome: z.string(),
        /** Legado: prazos vivem na receita; omitir usa defaults do BD. */
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        babyLeaf: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug =
        input.slug ||
        `${input.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now().toString(36)}`;
      return db.createVariedade({
        projetoId: projetoIdFromCtx(ctx),
        slug,
        nome: input.nome,
        diasMudas: input.diasMudas ?? 14,
        diasVegetativa: input.diasVegetativa ?? 21,
        diasMaturacao: input.diasMaturacao ?? 28,
        babyLeaf: input.babyLeaf ?? false,
      });
    }),
  update: adminProjectProcedure
    .input(
      z.object({
        id: z.number(),
        slug: z.string().optional(),
        nome: z.string().optional(),
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        babyLeaf: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateVariedade(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  delete: adminProjectProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteVariedade(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
