import { projetoIdFromCtx, adminFazendaVerticalProcedure, fazendaVerticalProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { ESTRUTURA_OVERRIDE_FV_12x6, MAX_ANDARES_TORRE_MICROVERDES } from "../../shared/types";

export const torresRouter = router({
  list: fazendaVerticalProcedure.query(async ({ ctx }) => {
    return db.getAllTorres(projetoIdFromCtx(ctx));
  }),
  getById: fazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getTorreById(projetoIdFromCtx(ctx), input.id);
    }),
  getBySlug: fazendaVerticalProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return db.getTorreBySlug(projetoIdFromCtx(ctx), input.slug);
    }),
  create: adminFazendaVerticalProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        fase: z.enum(["mudas", "vegetativa", "maturacao"]),
        numAndares: z.number().int().min(1).default(10),
        caixaAguaId: z.number().optional(),
        /** Número operacional fixo (único por projeto). Omitido = próximo livre. */
        numeroTorre: z.number().int().min(1).optional(),
        /** Padrão FV ou grelha 12×6 (torres alteradas). Ignorado em mudas e microverdes. */
        modeloEstrutura: z.enum(["padrao", "fv_12x6"]).optional().default("padrao"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      const proj = await db.getProjetoRow(projetoId);
      const maxAndares = proj?.tipo === "microverdes" ? MAX_ANDARES_TORRE_MICROVERDES : 99;
      let numAndares = input.numAndares;
      if (numAndares > maxAndares) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            proj?.tipo === "microverdes"
              ? "Em microverdes cada torre tem no máximo 6 andares."
              : "Número de andares inválido.",
        });
      }
      let caixaAguaId = input.caixaAguaId;
      if (proj?.tipo === "microverdes" && input.fase === "maturacao") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Em microverdes a torre só tem duas fases: Germinação ou Iluminação.",
        });
      }
      if (proj?.tipo === "microverdes" && !proj.usarCaixaAgua) {
        caixaAguaId = undefined;
      } else if (caixaAguaId != null) {
        const caixa = await db.getCaixaAguaById(projetoId, caixaAguaId);
        if (!caixa) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Caixa d'água não encontrada." });
        }
        if (caixa.fase !== input.fase) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A caixa d'água deve ser da mesma fase da torre.",
          });
        }
      }
      const slug =
        input.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);

      const numeroTorre = input.numeroTorre ?? (await db.getNextNumeroTorre(projetoId));
      const clash = await db.getTorreByProjetoNumero(projetoId, numeroTorre);
      if (clash) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Já existe uma torre com o n.º ${numeroTorre}. Escolha outro número ou edite a torre existente.`,
        });
      }

      let estruturaOverrideJson: string | null = null;
      if (
        proj?.tipo !== "microverdes" &&
        input.modeloEstrutura === "fv_12x6" &&
        input.fase !== "mudas"
      ) {
        estruturaOverrideJson = JSON.stringify(ESTRUTURA_OVERRIDE_FV_12x6);
      }

      return db.createTorreComEstrutura({
        projetoId,
        slug,
        nome: input.nome,
        fase: input.fase,
        numAndares,
        caixaAguaId,
        numeroTorre,
        estruturaOverrideJson,
      });
    }),
  update: adminFazendaVerticalProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        fase: z.enum(["mudas", "vegetativa", "maturacao"]).optional(),
        numAndares: z.number().int().min(1).optional(),
        caixaAguaId: z.number().optional(),
        numeroTorre: z.number().int().min(1).optional(),
        modeloEstrutura: z.enum(["padrao", "fv_12x6"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projetoId = projetoIdFromCtx(ctx);
      const proj = await db.getProjetoRow(projetoId);
      const { id, modeloEstrutura, ...updates } = input;
      if (proj?.tipo === "microverdes" && updates.fase === "maturacao") {
        (updates as { fase?: "mudas" | "vegetativa" | "maturacao" }).fase = "vegetativa";
      }
      const maxAndares = proj?.tipo === "microverdes" ? MAX_ANDARES_TORRE_MICROVERDES : 99;
      if (updates.numAndares != null && updates.numAndares > maxAndares) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            proj?.tipo === "microverdes"
              ? "Em microverdes cada torre tem no máximo 6 andares."
              : "Número de andares inválido.",
        });
      }
      if (proj?.tipo === "microverdes" && !proj.usarCaixaAgua && updates.caixaAguaId !== undefined) {
        (updates as { caixaAguaId?: number | null }).caixaAguaId = undefined;
      }
      const existing = await db.getTorreById(projetoId, id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada." });
      }
      if (updates.numeroTorre != null && updates.numeroTorre !== existing.numeroTorre) {
        const other = await db.getTorreByProjetoNumero(projetoId, updates.numeroTorre);
        if (other && other.id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe uma torre com o n.º ${updates.numeroTorre}.`,
          });
        }
      }
      const faseEfetiva = (updates.fase ?? existing.fase) as "mudas" | "vegetativa" | "maturacao";
      if (updates.caixaAguaId != null && typeof updates.caixaAguaId === "number") {
        const caixa = await db.getCaixaAguaById(projetoId, updates.caixaAguaId);
        if (!caixa) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Caixa d'água não encontrada." });
        }
        if (caixa.fase !== faseEfetiva) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A caixa d'água deve ser da mesma fase da torre.",
          });
        }
      }
      if (updates.fase != null && updates.fase !== existing.fase && updates.caixaAguaId === undefined) {
        const currentCaixaId = existing.caixaAguaId;
        if (currentCaixaId) {
          const c = await db.getCaixaAguaById(projetoId, currentCaixaId);
          if (c && c.fase !== faseEfetiva) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Ao mudar a fase, selecione uma caixa d'água da nova fase.",
            });
          }
        }
      }
      let payload = { ...updates } as typeof updates;
      if (payload.numAndares != null) {
        payload = { ...payload, numAndares: Math.min(maxAndares, payload.numAndares) };
      }
      if (modeloEstrutura !== undefined) {
        if (proj?.tipo !== "microverdes" && faseEfetiva !== "mudas") {
          (payload as Record<string, unknown>).estruturaOverrideJson =
            modeloEstrutura === "fv_12x6" ? JSON.stringify(ESTRUTURA_OVERRIDE_FV_12x6) : null;
        } else {
          (payload as Record<string, unknown>).estruturaOverrideJson = null;
        }
      }
      await db.updateTorre(projetoId, id, payload);
      const updated = await db.getTorreById(projetoId, id);
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada." });
      }
      // Sempre alinhar linhas em `andares` ao N declarado (corrige BD órfão e evita UI com 9 andares e torre.numAndares=6).
      const nDeclarado = Math.max(
        1,
        Math.min(maxAndares, Math.floor(Number(updated.numAndares) || 1)),
      );
      await db.syncTorreAndaresToNumAndares(projetoId, id, nDeclarado);
      return db.getTorreById(projetoId, id);
    }),
  toggleAtiva: adminFazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.toggleTorreAtiva(projetoIdFromCtx(ctx), input.id);
    }),
  delete: adminFazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.deleteTorre(projetoIdFromCtx(ctx), input.id);
    }),
});
