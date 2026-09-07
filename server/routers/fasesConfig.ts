import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { FASES_CONFIG_DEFAULT, type Fase } from "@shared/types";

const FASES: Fase[] = ["mudas", "vegetativa", "maturacao"];

function mapFaixasPublicas(
  rows: Awaited<ReturnType<typeof db.getAllFasesConfig>>,
): Array<{
  fase: Fase;
  label: string;
  ecMin: number;
  ecMax: number;
  phMin: number;
  phMax: number;
}> {
  const byFase = new Map(rows.map((r) => [r.fase, r]));
  return FASES.map((fase) => {
    const row = byFase.get(fase);
    const fallback = FASES_CONFIG_DEFAULT[fase];
    return {
      fase,
      label: row?.label || fallback.label,
      ecMin: Number(row?.ecMin ?? fallback.ecMin),
      ecMax: Number(row?.ecMax ?? fallback.ecMax),
      phMin: Number(row?.phMin ?? fallback.phMin),
      phMax: Number(row?.phMax ?? fallback.phMax),
    };
  });
}

export const fasesConfigRouter = router({
  list: projectProcedure.query(async ({ ctx }) => {
    return db.getAllFasesConfig(projetoIdFromCtx(ctx));
  }),

  /**
   * Faixas EC/pH para a calculadora pública (sem login).
   * Aceita `projetoId` na query; sem id, usa CALCULADORA_PUBLIC_PROJETO_ID ou o único projeto ativo.
   */
  publicFaixas: publicProcedure
    .input(z.object({ projetoId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => {
      let projetoId = input?.projetoId ?? null;

      if (projetoId == null) {
        const fromEnv = Number((process.env.CALCULADORA_PUBLIC_PROJETO_ID ?? "").trim());
        if (Number.isFinite(fromEnv) && fromEnv > 0) projetoId = fromEnv;
        else projetoId = await db.getUniqueActiveProjetoId();
      }

      if (projetoId == null) {
        return {
          projetoId: null as number | null,
          projetoNome: null as string | null,
          fases: mapFaixasPublicas([]),
          origem: "padrao" as const,
        };
      }

      const proj = await db.getProjetoById(projetoId);
      if (!proj || proj.status === "inativo") {
        return {
          projetoId: null as number | null,
          projetoNome: null as string | null,
          fases: mapFaixasPublicas([]),
          origem: "padrao" as const,
        };
      }

      const rows = await db.getAllFasesConfig(projetoId);
      return {
        projetoId,
        projetoNome: proj.nome,
        fases: mapFaixasPublicas(rows),
        origem: rows.length > 0 ? ("cadastrado" as const) : ("padrao" as const),
      };
    }),

  upsert: adminProjectProcedure
    .input(
      z.object({
        fase: z.string(),
        label: z.string(),
        ecMin: z.number(),
        ecMax: z.number(),
        phMin: z.number(),
        phMax: z.number(),
        cor: z.string(),
        corLight: z.string(),
        icon: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.upsertFaseConfig({ ...input, projetoId: projetoIdFromCtx(ctx) });
      return { success: true };
    }),
});
