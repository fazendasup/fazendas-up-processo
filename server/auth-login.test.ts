import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import bcrypt from "bcryptjs";

// ---- Helpers ----

function createContext(role: "user" | "admin", userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
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
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
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
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ---- Tests ----

describe("Auth: login por email/senha", () => {
  const testEmail = `testlogin_${Date.now()}@test.com`;
  const testPassword = "TestPass123!";

  beforeAll(async () => {
    // Criar um usuário de teste no banco com senha
    const passwordHash = await bcrypt.hash(testPassword, 10);
    await db.createUserWithPassword({
      name: "Test Login User",
      email: testEmail,
      passwordHash,
      role: "user",
    });
  });

  it("login com credenciais corretas retorna sucesso", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      email: testEmail,
      password: testPassword,
    });
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.role).toBe("user");
  });

  it("login com senha errada falha", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({
        email: testEmail,
        password: "SenhaErrada123",
      })
    ).rejects.toThrow(/inválidos/i);
  });

  it("login com email inexistente falha", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({
        email: "naoexiste@test.com",
        password: testPassword,
      })
    ).rejects.toThrow(/inválidos/i);
  });
});

describe("Users: CRUD por admin", () => {
  const newUserEmail = `newuser_${Date.now()}@test.com`;

  it("admin pode criar novo usuário com senha", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.create({
      name: "Novo Operador",
      email: newUserEmail,
      password: "Senha123!",
      role: "user",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("não permite criar usuário com email duplicado", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.create({
        name: "Duplicado",
        email: newUserEmail,
        password: "Senha123!",
        role: "user",
      })
    ).rejects.toThrow(/já existe/i);
  });

  it("operador não pode criar usuário", async () => {
    const ctx = createContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.users.create({
        name: "Tentativa",
        email: "tentativa@test.com",
        password: "Senha123!",
        role: "user",
      })
    ).rejects.toThrow(/permission|forbidden/i);
  });

  it("admin pode resetar senha de usuário", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    // Buscar o ID do usuário criado
    const users = await caller.users.list();
    const user = users.find((u: any) => u.email === newUserEmail);
    expect(user).toBeDefined();

    const result = await caller.users.resetPassword({
      id: user!.id,
      newPassword: "NovaSenha456!",
    });
    expect(result.success).toBe(true);

    // Verificar que a nova senha funciona
    const anonCtx = createAnonymousContext();
    const anonCaller = appRouter.createCaller(anonCtx);
    const loginResult = await anonCaller.auth.login({
      email: newUserEmail,
      password: "NovaSenha456!",
    });
    expect(loginResult.success).toBe(true);
  });

  it("admin pode alterar role de usuário", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);
    const users = await caller.users.list();
    const user = users.find((u: any) => u.email === newUserEmail);
    expect(user).toBeDefined();

    const result = await caller.users.updateRole({
      id: user!.id,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });
});
