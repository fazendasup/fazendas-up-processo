import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import { useMockProjetoResolve, withProjetoBase, TEST_PROJETO_ID } from "./test-projeto-trpc";
import type { TrpcContext } from "./_core/context";

useMockProjetoResolve();

/** PNG 1×1 transparente (base64). */
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function operatorCtx(): TrpcContext {
  return withProjetoBase({
    user: {
      id: 2,
      openId: "op-visao",
      email: "op@visao.test",
      name: "Operador",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext["res"],
  });
}

function adminCtx(): TrpcContext {
  return withProjetoBase({
    user: {
      id: 1,
      openId: "ad-visao",
      email: "admin@visao.test",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext["res"],
  });
}

describe("visao router", () => {
  beforeEach(() => {
    vi.spyOn(db, "insertVisionAnalysis").mockResolvedValue({ id: 101 });
    vi.spyOn(db, "insertVisionTrainingSample").mockResolvedValue({ id: 202 });
    vi.spyOn(db, "listVisionAnalyses").mockResolvedValue([]);
    vi.spyOn(db, "listVisionTrainingSamplesMeta").mockResolvedValue([]);
    vi.spyOn(db, "exportVisionTrainingSamplesFull").mockResolvedValue([]);
    vi.spyOn(db, "setVisionTrainingSampleConfirmacao").mockResolvedValue(undefined);
    vi.spyOn(db, "getVisionAnalysisById").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("analisar persiste resultado do motor stub", async () => {
    const caller = appRouter.createCaller(operatorCtx());
    const r = await caller.visao.analisar({
      base64Image: PNG_1PX,
      mimeType: "image/png",
    });
    expect(r.id).toBe(101);
    expect(r.resultado.modeloVersao).toMatch(/stub/);
    expect(db.insertVisionAnalysis).toHaveBeenCalled();
  });

  it("operador não exporta amostras JSON", async () => {
    const caller = appRouter.createCaller(operatorCtx());
    await expect(caller.visao.exportarAmostrasTreinoJson({ limit: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.exportVisionTrainingSamplesFull).not.toHaveBeenCalled();
  });

  it("admin exporta amostras JSON", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const rows = await caller.visao.exportarAmostrasTreinoJson({ limit: 5 });
    expect(rows).toEqual([]);
    expect(db.exportVisionTrainingSamplesFull).toHaveBeenCalledWith(TEST_PROJETO_ID, 5);
  });
});
