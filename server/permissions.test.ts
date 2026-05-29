import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROJETO_HEADER, PROJETO_REQUIRED_ERR_MSG, UNAUTHED_ERR_MSG, VISITOR_READONLY_MSG } from "@shared/const";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/** Evita dependência de tabelas `projetos` no banco ao testar middleware + papéis. */
beforeEach(() => {
  vi.spyOn(db, "resolveProjetoForUser").mockImplementation(async (_userId, projetoId) => {
    if (projetoId === 999999) return undefined;
    return { id: projetoId, tipo: "fazenda_vertical", status: "ativo" };
  });
  vi.spyOn(db, "getProjetoByIdForUser").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createContext(
  role: "user" | "admin" | "platform_admin" | "visitante",
  opts?: { projetoHeader?: string },
): TrpcContext {
  const privileged = role === "admin" || role === "platform_admin";
  return {
    user: {
      id: privileged ? 1 : 2,
      openId: `test-${role}`,
      email: `${role}@test.com`,
      name: privileged ? "Admin User" : "Operator User",
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
      headers: opts?.projetoHeader ? { [PROJETO_HEADER]: opts.projetoHeader } : {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    projetoId: null,
    projetoTipo: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Permissões: fazenda.loadAll (projeto obrigatório)", () => {
  it("bloqueia anônimo", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.fazenda.loadAll()).rejects.toMatchObject({
      message: UNAUTHED_ERR_MSG,
    });
  });

  it("bloqueia usuário sem header/cookie de projeto", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.fazenda.loadAll()).rejects.toMatchObject({
      message: PROJETO_REQUIRED_ERR_MSG,
    });
  });

  it("projeto inexistente/s sem vínculo retorna FORBIDDEN (não expõe dados)", async () => {
    const ctx = createContext("user", { projetoHeader: "999999" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.fazenda.loadAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Permissões: visitante (somente leitura no projeto)", () => {
  it("bloqueia visitante de atualizar perfil", async () => {
    const ctx = createContext("visitante", { projetoHeader: "1" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.perfis.update({
        andarId: 1,
        perfilIndex: 0,
        ativo: true,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: VISITOR_READONLY_MSG,
    });
  });

  it("bloqueia visitante de batchUpdate em furos", async () => {
    const ctx = createContext("visitante", { projetoHeader: "1" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.furos.batchUpdate({
        andarId: 1,
        updates: [{ perfilIndex: 0, furoIndex: 0, status: "plantado" }],
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: VISITOR_READONLY_MSG,
    });
  });

  it("bloqueia membro visualizador de atualizar perfil", async () => {
    vi.spyOn(db, "getProjetoMembership").mockResolvedValue({ role: "visualizador" });
    const ctx = createContext("user", { projetoHeader: "1" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.perfis.update({
        andarId: 1,
        perfilIndex: 0,
        ativo: true,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: VISITOR_READONLY_MSG,
    });
  });

  it("permite visitante listar perfis por andar", async () => {
    vi.spyOn(db, "getPerfisByAndarId").mockResolvedValue([]);
    const ctx = createContext("visitante", { projetoHeader: "1" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.perfis.listByAndar({ andarId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Permissões: medicoesCaixa (operador + projeto)", () => {
  it("bloqueia anônimo", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.medicoesCaixa.create({
        caixaAguaId: 1,
        ec: 1.5,
        ph: 6.0,
        dataHora: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("bloqueia sem projeto no contexto", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.medicoesCaixa.create({
        caixaAguaId: 1,
        ec: 1.5,
        ph: 6.0,
        dataHora: new Date(),
      }),
    ).rejects.toMatchObject({ message: PROJETO_REQUIRED_ERR_MSG });
  });
});

describe("Permissões: admin global + projeto (adminProjectProcedure)", () => {
  it("bloqueia operador de seed", async () => {
    const ctx = createContext("user", { projetoHeader: "1" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.seed()).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de reset", async () => {
    const ctx = createContext("user", { projetoHeader: "1" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.reset()).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de criar variedade", async () => {
    const ctx = createContext("user", { projetoHeader: "1" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.variedades.create({
        nome: "Test",
      }),
    ).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de criar ciclo", async () => {
    const ctx = createContext("user", { projetoHeader: "1" });
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
      }),
    ).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia operador de upsert fases", async () => {
    const ctx = createContext("user", { projetoHeader: "1" });
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
      }),
    ).rejects.toThrow(/permission|forbidden/i);
  });

  it("bloqueia anônimo de seed", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.seed()).rejects.toThrow();
  });

  it("admin tem role global para rotas administrativas", async () => {
    const ctx = createContext("admin");
    expect(ctx.user?.role).toBe("admin");
  });
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

  it("bloqueia exclusão de usuário da Equipe FUP mesmo por outro FUP", async () => {
    vi.spyOn(db, "getUserById").mockResolvedValue({
      id: 10,
      openId: "fup-target",
      email: "fup-target@test.com",
      name: "FUP Target",
      passwordHash: null,
      loginMethod: "password",
      role: "platform_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const deleteSpy = vi.spyOn(db, "deleteUser").mockResolvedValue(undefined);

    const ctx = createContext("platform_admin");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.delete({ id: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Usuários da Equipe FUP não podem ser excluídos",
    });
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
