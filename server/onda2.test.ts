import { describe, it, expect } from "vitest";
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
      openId: "test-operator-onda2",
      email: "operator-onda2@test.com",
      name: "Operator Onda2",
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
      openId: "test-admin-onda2",
      email: "admin-onda2@test.com",
      name: "Admin Onda2",
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

// Helper: get first receita and variedade
async function getReceitaAndVariedade() {
  const publicCaller = appRouter.createCaller(createPublicContext());
  const adminCaller = appRouter.createCaller(createAdminContext());

  // Get variedade
  const data = await publicCaller.fazenda.loadAll();
  if (!data.variedades || data.variedades.length === 0) return null;
  const variedade = data.variedades[0];

  // Get or create receita
  const receitas = await publicCaller.receitas.list();
  let receita: any;
  if (receitas.length > 0) {
    receita = receitas[0];
  } else {
    const created = await adminCaller.receitas.create({
      nome: "Receita Onda2 Test",
      variedadeId: variedade.id,
    });
    // createReceita returns only {id}, so we add the nome manually
    receita = { id: created.id, nome: "Receita Onda2 Test" };
  }

  return { receita, variedade };
}

// ---- Planos de Plantio Tests ----

describe("planosPlantio", () => {
  it("list returns an array (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.planosPlantio.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create a plano de plantio", async () => {
    const rv = await getReceitaAndVariedade();
    if (!rv) return; // skip if no data

    const adminCaller = appRouter.createCaller(createAdminContext());
    const now = new Date();
    const plano = await adminCaller.planosPlantio.create({
      receitaId: rv.receita.id,
      receitaNome: rv.receita.nome,
      variedadeId: rv.variedade.id,
      variedadeNome: rv.variedade.nome,
      quantidadePlantas: 50,
      dataInicioGerminacao: now,
      dataTransplantioMudas: new Date(now.getTime() + 7 * 86400000),
      dataTransplantioVeg: new Date(now.getTime() + 14 * 86400000),
      dataTransplantioMat: new Date(now.getTime() + 28 * 86400000),
      dataColheitaPrevista: new Date(now.getTime() + 42 * 86400000),
    });
    expect(plano).toBeDefined();
    expect(plano.id).toBeDefined();
    expect(typeof plano.id).toBe("number");
  });

  it("operator cannot create a plano de plantio", async () => {
    const rv = await getReceitaAndVariedade();
    if (!rv) return;

    const operatorCaller = appRouter.createCaller(createOperatorContext());
    const now = new Date();
    await expect(
      operatorCaller.planosPlantio.create({
        receitaId: rv.receita.id,
        receitaNome: rv.receita.nome,
        variedadeId: rv.variedade.id,
        variedadeNome: rv.variedade.nome,
        quantidadePlantas: 50,
        dataInicioGerminacao: now,
        dataTransplantioMudas: new Date(now.getTime() + 7 * 86400000),
        dataTransplantioVeg: new Date(now.getTime() + 14 * 86400000),
        dataTransplantioMat: new Date(now.getTime() + 28 * 86400000),
        dataColheitaPrevista: new Date(now.getTime() + 42 * 86400000),
      })
    ).rejects.toThrow();
  });

  it("public cannot create a plano de plantio", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());
    const now = new Date();
    await expect(
      publicCaller.planosPlantio.create({
        receitaId: 1,
        receitaNome: "Test",
        variedadeId: 1,
        variedadeNome: "Test",
        quantidadePlantas: 50,
        dataInicioGerminacao: now,
        dataTransplantioMudas: new Date(now.getTime() + 7 * 86400000),
        dataTransplantioVeg: new Date(now.getTime() + 14 * 86400000),
        dataTransplantioMat: new Date(now.getTime() + 28 * 86400000),
        dataColheitaPrevista: new Date(now.getTime() + 42 * 86400000),
      })
    ).rejects.toThrow();
  });

  it("admin can advance status of a plano", async () => {
    const rv = await getReceitaAndVariedade();
    if (!rv) return;

    const adminCaller = appRouter.createCaller(createAdminContext());
    const now = new Date();
    const plano = await adminCaller.planosPlantio.create({
      receitaId: rv.receita.id,
      receitaNome: rv.receita.nome,
      variedadeId: rv.variedade.id,
      variedadeNome: rv.variedade.nome,
      quantidadePlantas: 30,
      dataInicioGerminacao: now,
      dataTransplantioMudas: new Date(now.getTime() + 7 * 86400000),
      dataTransplantioVeg: new Date(now.getTime() + 14 * 86400000),
      dataTransplantioMat: new Date(now.getTime() + 28 * 86400000),
      dataColheitaPrevista: new Date(now.getTime() + 42 * 86400000),
    });

    const result = await adminCaller.planosPlantio.avancarStatus({
      id: plano.id,
      novoStatus: "em_germinacao",
    });
    expect(result.success).toBe(true);
    expect(result.status).toBe("em_germinacao");
  });

  it("admin can update a plano", async () => {
    const rv = await getReceitaAndVariedade();
    if (!rv) return;

    const adminCaller = appRouter.createCaller(createAdminContext());
    const now = new Date();
    const plano = await adminCaller.planosPlantio.create({
      receitaId: rv.receita.id,
      receitaNome: rv.receita.nome,
      variedadeId: rv.variedade.id,
      variedadeNome: rv.variedade.nome,
      quantidadePlantas: 20,
      dataInicioGerminacao: now,
      dataTransplantioMudas: new Date(now.getTime() + 7 * 86400000),
      dataTransplantioVeg: new Date(now.getTime() + 14 * 86400000),
      dataTransplantioMat: new Date(now.getTime() + 28 * 86400000),
      dataColheitaPrevista: new Date(now.getTime() + 42 * 86400000),
    });

    const result = await adminCaller.planosPlantio.update({
      id: plano.id,
      quantidadePlantas: 100,
    });
    expect(result.success).toBe(true);
  });

  it("admin can delete a plano", async () => {
    const rv = await getReceitaAndVariedade();
    if (!rv) return;

    const adminCaller = appRouter.createCaller(createAdminContext());
    const now = new Date();
    const plano = await adminCaller.planosPlantio.create({
      receitaId: rv.receita.id,
      receitaNome: rv.receita.nome,
      variedadeId: rv.variedade.id,
      variedadeNome: rv.variedade.nome,
      quantidadePlantas: 10,
      dataInicioGerminacao: now,
      dataTransplantioMudas: new Date(now.getTime() + 7 * 86400000),
      dataTransplantioVeg: new Date(now.getTime() + 14 * 86400000),
      dataTransplantioMat: new Date(now.getTime() + 28 * 86400000),
      dataColheitaPrevista: new Date(now.getTime() + 42 * 86400000),
    });

    const result = await adminCaller.planosPlantio.delete({ id: plano.id });
    expect(result.success).toBe(true);
  });

  it("operator cannot delete a plano", async () => {
    const operatorCaller = appRouter.createCaller(createOperatorContext());
    await expect(
      operatorCaller.planosPlantio.delete({ id: 99999 })
    ).rejects.toThrow();
  });
});
