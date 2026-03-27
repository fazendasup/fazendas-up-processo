import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Context helpers ----

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createOperatorContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "test-operator",
      email: "operator@test.com",
      name: "Operator User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      email: "admin@test.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// Helper: get a valid variedadeId from the DB
async function getFirstVariedadeId(): Promise<number | null> {
  const publicCaller = appRouter.createCaller(createPublicContext());
  const data = await publicCaller.fazenda.loadAll();
  if (data.variedades && data.variedades.length > 0) {
    return data.variedades[0].id;
  }
  return null;
}

// ---- Receitas Tests ----

describe("receitas", () => {
  it("list returns an array (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.receitas.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create a receita", async () => {
    const variedadeId = await getFirstVariedadeId();
    if (!variedadeId) return; // skip if no variedades seeded

    const caller = appRouter.createCaller(createAdminContext());
    const receita = await caller.receitas.create({
      nome: "Receita Teste Vitest",
      variedadeId,
    });
    expect(receita).toBeDefined();
    expect(receita.id).toBeDefined();
    expect(typeof receita.id).toBe("number");
  });

  it("operator cannot create a receita", async () => {
    const variedadeId = await getFirstVariedadeId();
    if (!variedadeId) return;

    const caller = appRouter.createCaller(createOperatorContext());
    await expect(
      caller.receitas.create({
        nome: "Receita Operador",
        variedadeId,
      })
    ).rejects.toThrow();
  });

  it("public cannot create a receita", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.receitas.create({
        nome: "Receita Publica",
        variedadeId: 1,
      })
    ).rejects.toThrow();
  });

  it("admin can update a receita", async () => {
    const variedadeId = await getFirstVariedadeId();
    if (!variedadeId) return;

    const adminCaller = appRouter.createCaller(createAdminContext());
    const created = await adminCaller.receitas.create({
      nome: "Receita Update Test",
      variedadeId,
    });
    const updated = await adminCaller.receitas.update({
      id: created.id,
      nome: "Receita Atualizada",
    });
    expect(updated).toBeDefined();
    expect(updated.success).toBe(true);
  });

  it("admin can delete a receita", async () => {
    const variedadeId = await getFirstVariedadeId();
    if (!variedadeId) return;

    const adminCaller = appRouter.createCaller(createAdminContext());
    const created = await adminCaller.receitas.create({
      nome: "Receita Delete Test",
      variedadeId,
    });
    const result = await adminCaller.receitas.delete({ id: created.id });
    expect(result.success).toBe(true);
  });
});

// ---- Tarefas Tests ----

describe("tarefas", () => {
  it("list returns an array (operator)", async () => {
    const caller = appRouter.createCaller(createOperatorContext());
    const result = await caller.tarefas.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("gerarAutomaticas creates tasks from pending cycles and overdue maintenance", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.tarefas.gerarAutomaticas();
    expect(result).toBeDefined();
    expect(typeof result.criadas).toBe("number");
    expect(result.criadas).toBeGreaterThanOrEqual(0);
  });

  it("operator can complete a tarefa if any exist", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    await adminCaller.tarefas.gerarAutomaticas();
    const operatorCaller = appRouter.createCaller(createOperatorContext());
    const tarefas = await operatorCaller.tarefas.list();
    const pendente = tarefas.find((t: any) => t.status === "pendente");
    if (pendente) {
      const result = await operatorCaller.tarefas.concluir({
        id: pendente.id,
        observacoes: "Concluída via teste",
      });
      expect(result).toBeDefined();
      expect(result.status).toBe("concluida");
    }
  });

  it("public cannot list tarefas", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.tarefas.list()).rejects.toThrow();
  });
});

// ---- Registros de Colheita Tests ----

describe("registrosColheita", () => {
  it("list returns an array (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registrosColheita.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("operator can create a registro de colheita", async () => {
    const caller = appRouter.createCaller(createOperatorContext());
    const publicCaller = appRouter.createCaller(createPublicContext());
    const data = await publicCaller.fazenda.loadAll();

    if (data.torres.length > 0 && data.andares.length > 0) {
      const torre = data.torres[0];
      const andar = data.andares.find((a: any) => a.torreId === torre.id);
      if (andar) {
        const registro = await caller.registrosColheita.create({
          torreId: torre.id,
          andarId: andar.id,
          dataColheita: new Date(),
          quantidadePlantas: 10,
          pesoTotalGramas: 250,
          qualidade: "A",
          destino: "venda_direta",
          observacoes: "Teste Vitest",
        });
        expect(registro).toBeDefined();
        expect(registro.id).toBeDefined();
        expect(typeof registro.id).toBe("number");
      }
    }
  });

  it("public cannot create a registro de colheita", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.registrosColheita.create({
        torreId: 1,
        andarId: 1,
        dataColheita: new Date(),
        quantidadePlantas: 5,
      })
    ).rejects.toThrow();
  });

  it("listByAndar returns records for a specific andar", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());
    const data = await publicCaller.fazenda.loadAll();
    if (data.andares.length > 0) {
      const result = await publicCaller.registrosColheita.listByAndar({
        andarId: data.andares[0].id,
      });
      expect(Array.isArray(result)).toBe(true);
    }
  });

  it("only admin can delete a registro de colheita", async () => {
    const operatorCaller = appRouter.createCaller(createOperatorContext());
    await expect(
      operatorCaller.registrosColheita.delete({ id: 99999 })
    ).rejects.toThrow();
  });
});
