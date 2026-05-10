import { createHash } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import {
  adminVisaoCultivoProjectProcedure,
  projetoIdFromCtx,
  router,
  visaoCultivoModuleProcedure,
} from "../_core/trpc";
import { analyzeImageBuffer } from "../vision-engine";
import { ENV } from "../_core/env";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const ROTULOS_TREINO = [
  "saude_ok",
  "atraso_fenologico",
  "doenca_foliar",
  "praga",
  "deficiencia_nutricional",
  "estresse_hidrico",
  "anomalia_iluminacao",
  "outro",
] as const;

function stripAndDecodeBase64Image(
  raw: string,
  mimeFallback: string | undefined,
): { buf: Buffer; mime: string } {
  const compact = raw.replace(/\s/g, "");
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(compact);
  if (dataUrl) {
    const mime = dataUrl[1].split(";")[0].trim();
    const buf = Buffer.from(dataUrl[2], "base64");
    return { buf, mime: mime || mimeFallback || "image/jpeg" };
  }
  const buf = Buffer.from(compact, "base64");
  if (buf.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Imagem base64 inválida" });
  }
  return { buf, mime: mimeFallback?.trim() || "image/jpeg" };
}

export const visaoRouter = router({
  analisar: visaoCultivoModuleProcedure
    .input(
      z.object({
        base64Image: z.string().min(20),
        mimeType: z.string().max(64).optional(),
        torreSlug: z.string().max(64).optional().nullable(),
        variedadeNome: z.string().max(256).optional().nullable(),
        contextoNotas: z.string().max(512).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      let buf: Buffer;
      let mime: string;
      try {
        const d = stripAndDecodeBase64Image(input.base64Image, input.mimeType);
        buf = d.buf;
        mime = d.mime;
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível decodificar a imagem" });
      }
      if (buf.length > MAX_IMAGE_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Imagem muito grande (máx. ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB)`,
        });
      }
      const imageSha256 = createHash("sha256").update(buf).digest("hex");
      const resultado = analyzeImageBuffer(buf, mime);

      let storageKey: string | undefined;
      if (ENV.forgeApiUrl?.trim() && ENV.forgeApiKey?.trim()) {
        try {
          const { storagePut } = await import("../storage");
          const ext =
            mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "bin";
          const up = await storagePut(`vision/p${pid}/${imageSha256}.${ext}`, buf, mime);
          storageKey = up.key;
        } catch (e) {
          console.warn("[visao] Object storage opcional falhou:", e instanceof Error ? e.message : e);
        }
      }

      const { id } = await db.insertVisionAnalysis({
        projetoId: pid,
        createdByUserId: ctx.user!.id,
        torreSlug: input.torreSlug ?? undefined,
        variedadeNome: input.variedadeNome ?? undefined,
        contextoNotas: input.contextoNotas ?? undefined,
        mimeType: mime,
        imageSha256,
        resultadoJson: resultado as unknown as Record<string, unknown>,
        modeloVersao: resultado.modeloVersao,
        storageKey,
        imagemArmazenada: undefined,
      });

      return {
        id,
        imageSha256,
        mimeType: mime,
        resultado,
      };
    }),

  listarAnalises: visaoCultivoModuleProcedure
    .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.listVisionAnalyses(projetoIdFromCtx(ctx), input?.limit ?? 40);
    }),

  listarAmostrasTreino: visaoCultivoModuleProcedure
    .input(z.object({ limit: z.number().min(1).max(300).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.listVisionTrainingSamplesMeta(projetoIdFromCtx(ctx), input?.limit ?? 80);
    }),

  enviarAmostraTreino: visaoCultivoModuleProcedure
    .input(
      z.object({
        base64Image: z.string().min(20),
        mimeType: z.string().max(64).optional(),
        rotuloPrincipal: z.enum(ROTULOS_TREINO),
        splitTreino: z.enum(["treino", "validacao", "teste"]).default("treino"),
        rotulosExtras: z.record(z.string(), z.string()).optional(),
        analysisId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      let buf: Buffer;
      let mime: string;
      try {
        const d = stripAndDecodeBase64Image(input.base64Image, input.mimeType);
        buf = d.buf;
        mime = d.mime;
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível decodificar a imagem" });
      }
      if (buf.length > MAX_IMAGE_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Imagem muito grande (máx. ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB)`,
        });
      }
      if (input.analysisId != null) {
        const a = await db.getVisionAnalysisById(pid, input.analysisId);
        if (!a) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Análise de referência não encontrada" });
        }
      }
      const imagemSha256 = createHash("sha256").update(buf).digest("hex");
      const { id } = await db.insertVisionTrainingSample({
        projetoId: pid,
        analysisId: input.analysisId ?? undefined,
        createdByUserId: ctx.user!.id,
        rotuloPrincipal: input.rotuloPrincipal,
        rotulosExtras: input.rotulosExtras ?? undefined,
        splitTreino: input.splitTreino,
        imagemSha256,
        imagemBase64: buf.toString("base64"),
        mimeType: mime,
        confirmadoPorAdmin: false,
      });
      return { id, imagemSha256 };
    }),

  confirmarAmostraTreino: adminVisaoCultivoProjectProcedure
    .input(z.object({ id: z.number().int().positive(), confirmado: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.setVisionTrainingSampleConfirmacao(projetoIdFromCtx(ctx), input.id, input.confirmado);
      return { ok: true };
    }),

  exportarAmostrasTreinoJson: adminVisaoCultivoProjectProcedure
    .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await db.exportVisionTrainingSamplesFull(projetoIdFromCtx(ctx), input?.limit ?? 200);
      return rows.map((r) => ({
        id: r.id,
        projetoId: r.projetoId,
        analysisId: r.analysisId,
        rotuloPrincipal: r.rotuloPrincipal,
        rotulosExtras: r.rotulosExtras,
        splitTreino: r.splitTreino,
        mimeType: r.mimeType,
        imagemSha256: r.imagemSha256,
        confirmadoPorAdmin: r.confirmadoPorAdmin,
        createdAt: r.createdAt,
        imagemBase64: r.imagemBase64,
      }));
    }),
});
