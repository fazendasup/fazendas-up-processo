/**
 * Garante que operações sensíveis multi-tenant não ficam expostas a usuários sem papel adequado.
 * Usa mocks onde necessário para não depender de dados concretos na BD.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROJETO_HEADER } from "@shared/const";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

beforeEach(() => {
  vi.spyOn(db, "ensureProjetoMembershipsBootstrap").mockResolvedValue({ ok: true });
  vi.spyOn(db, "migrateAllOperationalDataToFazendaVerticalPrincipal").mockResolvedValue({
    fvpId: 1,
    mergedFrom: [],
    mergeErrors: [],
    nullRowsUpdated: 0,
    verification: {
      torres: 0,
      andares: 0,
      ciclos: 0,
      receitasCrescimento: 0,
      variedades: 0,
      planosPlantio: 0,
      caixasAgua: 0,
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function ctxUser(role: "user" | "admin" | "platform_admin", projetoHeader?: string): TrpcContext {
  const privileged = role === "admin" || role === "platform_admin";
  return {
    user: {
      id: privileged ? 1 : 42,
      openId: `iso-${role}`,
      email: `${role}@iso.test`,
      name: role,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    projetoId: null,
    projetoTipo: null,
    req: {
      protocol: "https",
      headers: projetoHeader ? { [PROJETO_HEADER]: projetoHeader } : {},
    } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext["res"],
  };
}

describe("Isolamento: migração legado e resync só admin global", () => {
  it("operador não pode resyncBootstrap", async () => {
    const caller = appRouter.createCaller(ctxUser("user"));
    await expect(caller.projetos.resyncBootstrap()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.ensureProjetoMembershipsBootstrap).not.toHaveBeenCalled();
  });

  it("admin pode resyncBootstrap", async () => {
    const caller = appRouter.createCaller(ctxUser("admin"));
    const r = await caller.projetos.resyncBootstrap();
    expect(r.ok).toBe(true);
    expect(db.ensureProjetoMembershipsBootstrap).toHaveBeenCalled();
  });

  it("operador não pode migrateLegacyDataToFazendaVerticalPrincipal", async () => {
    const caller = appRouter.createCaller(ctxUser("user"));
    await expect(caller.projetos.migrateLegacyDataToFazendaVerticalPrincipal()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.migrateAllOperationalDataToFazendaVerticalPrincipal).not.toHaveBeenCalled();
  });

  it("admin pode migrateLegacyDataToFazendaVerticalPrincipal", async () => {
    const caller = appRouter.createCaller(ctxUser("admin"));
    const r = await caller.projetos.migrateLegacyDataToFazendaVerticalPrincipal();
    expect(r.ok).toBe(true);
    expect(db.migrateAllOperationalDataToFazendaVerticalPrincipal).toHaveBeenCalled();
  });
});

describe("Isolamento: getById e contagens só com vínculo ao projeto", () => {
  beforeEach(() => {
    vi.spyOn(db, "getProjetoByIdForUser").mockImplementation(async (userId, id) => {
      if (userId === 7 && id === 100) return { id: 100, nome: "P100", tipo: "fazenda_vertical", status: "ativo" } as any;
      return undefined;
    });
    vi.spyOn(db, "listProjetosForUser").mockResolvedValue([
      { projeto: { id: 100, nome: "P100", tipo: "fazenda_vertical", status: "ativo" }, role: "operador" },
    ] as any);
    vi.spyOn(db, "getOperationalCountsForProjetos").mockResolvedValue({
      100: {
        torres: 1,
        andares: 2,
        ciclos: 0,
        caixasAgua: 0,
        variedades: 3,
        bancadas: 0,
        planosPlantio: 0,
      },
    });
  });

  it("getById retorna FORBIDDEN se o usuário não tem acesso ao id pedido", async () => {
    const caller = appRouter.createCaller({
      ...ctxUser("user"),
      user: {
        ...ctxUser("user").user!,
        id: 7,
      },
    });
    await expect(caller.projetos.getById({ id: 999 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const row = await caller.projetos.getById({ id: 100 });
    expect(row).toMatchObject({ id: 100 });
  });

  it("operationalCounts ignora ids de projetos que não pertencem ao usuário", async () => {
    const caller = appRouter.createCaller({
      ...ctxUser("user"),
      user: {
        ...ctxUser("user").user!,
        id: 7,
      },
    });
    const out = await caller.projetos.operationalCounts({ projetoIds: [100, 200, 300] });
    expect(db.getOperationalCountsForProjetos).toHaveBeenCalledWith([100]);
    expect(out[100]?.torres).toBe(1);
    expect(out[200]).toBeUndefined();
    expect(out[300]).toBeUndefined();
  });
});
