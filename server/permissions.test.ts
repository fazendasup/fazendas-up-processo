import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Helpers ----

function createContext(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `test-${role}`,
      email: `${role}@test.com`,
      name: role === "admin" ? "Admin User" : "Operator User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ---- Tests ----

describe("Permissões: publicProcedure", () => {
  it("permite acesso anônimo ao loadAll", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.fazenda.loadAll();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("torres");
    expect(result).toHaveProperty("caixasAgua");
    expect(result).toHaveProperty("andares");
  });

  it("permite acesso de operador ao loadAll", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.fazenda.loadAll();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("torres");
  });

  it("permite acesso de admin ao loadAll", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.fazenda.loadAll();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("torres");
  });
});

describe("Permissões: protectedProcedure (operador + admin)", () => {
  it("bloqueia acesso anônimo a medições", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.medicoes.create({
        caixaAguaId: 1,
        ec: 1.5,
        ph: 6.0,
        dataHora: new Date(),
      })
    ).rejects.toThrow();
  });

  it("permite operador criar medição", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    // This may fail if caixaAguaId=1 doesn't exist, but it should NOT fail on auth
    try {
      await caller.medicoes.create({
        caixaAguaId: 1,
        ec: 1.5,
        ph: 6.0,
        dataHora: new Date(),
      });
    } catch (e: any) {
      // Should NOT be an auth error
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("permite admin criar medição", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.medicoes.create({
        caixaAguaId: 1,
        ec: 1.5,
        ph: 6.0,
        dataHora: new Date(),
      });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });
});

describe("Permissões: adminProcedure (só admin)", () => {
  it("bloqueia operador de acessar seed", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.seed()).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de acessar reset", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.reset()).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de criar variedade", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.variedades.create({
        nome: "Test",
        diasMudas: 14,
        diasVegetativa: 21,
        diasMaturacao: 28,
      })
    ).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de criar ciclo", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ciclos.create({
        nome: "Test Ciclo",
        frequencia: "diaria",
        produto: "Teste",
        tipo: "nutriente",
        fasesAplicaveis: ["mudas"],
        alvo: "caixa",
        ativo: true,
      })
    ).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de atualizar config de fases", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.fasesConfig.upsert({
        fase: "mudas",
        label: "Mudas",
        ecMin: 1.0,
        ecMax: 2.0,
        phMin: 5.5,
        phMax: 6.5,
        cor: "#22c55e",
        corLight: "#dcfce7",
        icon: "\ud83c\udf31",
      })
    ).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia anônimo de acessar seed", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.seed()).rejects.toThrow();
  });

  it("permite admin executar seed", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    // Should not throw auth error - seed may take a while
    try {
      await caller.admin.seed();
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  }, 30000);
});

describe("Permissões: users.list (admin only)", () => {
  it("bloqueia operador de listar usuários", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.list()).rejects.toThrow(/permission|forbidden/i);
  });

  it("permite admin listar usuários", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
