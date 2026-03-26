import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Create a minimal public context (no auth needed for public procedures)
function createPublicContext(): TrpcContext {
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

describe("fazenda.loadAll", () => {
  it("returns the full fazenda data structure", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const data = await caller.fazenda.loadAll();

    expect(data).toBeDefined();
    expect(data).toHaveProperty("torres");
    expect(data).toHaveProperty("andares");
    expect(data).toHaveProperty("caixasAgua");
    expect(data).toHaveProperty("variedades");
    expect(data).toHaveProperty("fasesConfig");
    expect(data).toHaveProperty("germinacao");
    expect(data).toHaveProperty("transplantios");
    expect(data).toHaveProperty("manutencoes");
    expect(data).toHaveProperty("ciclos");
    expect(data).toHaveProperty("medicoesCaixa");
    expect(data).toHaveProperty("aplicacoesCaixa");
    expect(data).toHaveProperty("aplicacoesAndar");
    expect(data).toHaveProperty("perfis");
    expect(data).toHaveProperty("furos");

    // Arrays
    expect(Array.isArray(data.torres)).toBe(true);
    expect(Array.isArray(data.andares)).toBe(true);
    expect(Array.isArray(data.variedades)).toBe(true);
  });
});

describe("variedades CRUD", () => {
  let createdId: number;

  it("creates a new variedade", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.variedades.create({
      nome: "Alface Teste Vitest",
      diasMudas: 10,
      diasVegetativa: 15,
      diasMaturacao: 20,
    });

    expect(result).toBeDefined();
    // db.createVariedade returns { id: insertId }
    expect(result.id).toBeDefined();
    createdId = result.id;
    expect(createdId).toBeGreaterThan(0);
  });

  it("lists variedades including the new one", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const list = await caller.variedades.list();
    expect(Array.isArray(list)).toBe(true);
    const found = list.find((v: any) => v.id === createdId);
    expect(found).toBeDefined();
    expect(found!.nome).toBe("Alface Teste Vitest");
  });

  it("updates a variedade", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.variedades.update({
      id: createdId,
      nome: "Alface Teste Atualizada",
      diasMudas: 12,
    });

    const list = await caller.variedades.list();
    const found = list.find((v: any) => v.id === createdId);
    expect(found).toBeDefined();
    expect(found!.nome).toBe("Alface Teste Atualizada");
    expect(found!.diasMudas).toBe(12);
  });

  it("deletes a variedade", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.variedades.delete({ id: createdId });

    const list = await caller.variedades.list();
    const found = list.find((v: any) => v.id === createdId);
    expect(found).toBeUndefined();
  });
});

describe("manutencoes CRUD", () => {
  let torreId: number;
  let manutencaoId: number;

  beforeAll(async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const data = await caller.fazenda.loadAll();
    if (data.torres.length > 0) {
      torreId = data.torres[0].id;
    }
  });

  it("creates a new manutencao", async () => {
    if (!torreId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.manutencoes.create({
      torreId,
      tipo: "vazamento_injetor",
      descricao: "Teste de manutenção Vitest",
      dataAbertura: new Date(),
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    manutencaoId = result.id;
    expect(manutencaoId).toBeGreaterThan(0);
  });

  it("updates manutencao status", async () => {
    if (!manutencaoId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.manutencoes.update({
      id: manutencaoId,
      status: "em_andamento",
    });

    const data = await caller.fazenda.loadAll();
    const found = data.manutencoes.find((m: any) => m.id === manutencaoId);
    expect(found).toBeDefined();
    expect(found!.status).toBe("em_andamento");
  });

  it("concludes a manutencao", async () => {
    if (!manutencaoId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.manutencoes.update({
      id: manutencaoId,
      status: "concluida",
      dataConclusao: new Date(),
      solucao: "Resolvido via teste",
    });

    const data = await caller.fazenda.loadAll();
    const found = data.manutencoes.find((m: any) => m.id === manutencaoId);
    expect(found).toBeDefined();
    expect(found!.status).toBe("concluida");
    expect(found!.solucao).toBe("Resolvido via teste");
  });

  it("deletes a manutencao", async () => {
    if (!manutencaoId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.manutencoes.delete({ id: manutencaoId });

    const data = await caller.fazenda.loadAll();
    const found = data.manutencoes.find((m: any) => m.id === manutencaoId);
    expect(found).toBeUndefined();
  });
});

describe("ciclos CRUD", () => {
  let cicloId: number;

  it("creates a new ciclo", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ciclos.create({
      nome: "Ciclo Teste Vitest",
      frequencia: "diaria",
      produto: "Produto Teste",
      tipo: "sanitizacao",
      fasesAplicaveis: ["mudas", "vegetativa"],
      alvo: "ambos",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    cicloId = result.id;
    expect(cicloId).toBeGreaterThan(0);
  });

  it("updates a ciclo", async () => {
    if (!cicloId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.ciclos.update({
      id: cicloId,
      ativo: false,
    });

    const data = await caller.fazenda.loadAll();
    const found = data.ciclos.find((c: any) => c.id === cicloId);
    expect(found).toBeDefined();
    expect(found!.ativo).toBe(false);
  });

  it("marks ciclo as executed", async () => {
    if (!cicloId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const execDate = new Date();
    await caller.ciclos.update({
      id: cicloId,
      ultimaExecucao: execDate,
    });

    const data = await caller.fazenda.loadAll();
    const found = data.ciclos.find((c: any) => c.id === cicloId);
    expect(found).toBeDefined();
    expect(found!.ultimaExecucao).toBeDefined();
  });

  it("deletes a ciclo", async () => {
    if (!cicloId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.ciclos.delete({ id: cicloId });

    const data = await caller.fazenda.loadAll();
    const found = data.ciclos.find((c: any) => c.id === cicloId);
    expect(found).toBeUndefined();
  });
});

describe("germinacao CRUD", () => {
  let germinacaoId: number;
  let variedadeId: number;

  beforeAll(async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const data = await caller.fazenda.loadAll();
    if (data.variedades.length > 0) {
      variedadeId = data.variedades[0].id;
    }
  });

  it("creates a new germinacao lote", async () => {
    if (!variedadeId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.germinacao.create({
      variedadeId,
      variedadeNome: "Teste",
      quantidade: 72,
      dataPlantio: new Date(),
      dataHora: new Date(),
      diasParaTransplantio: 5,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    germinacaoId = result.id;
    expect(germinacaoId).toBeGreaterThan(0);
  });

  it("updates germinacao status to pronto", async () => {
    if (!germinacaoId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.germinacao.update({
      id: germinacaoId,
      status: "pronto",
      germinadas: 60,
      naoGerminadas: 12,
    });

    const data = await caller.fazenda.loadAll();
    const found = data.germinacao.find((g: any) => g.id === germinacaoId);
    expect(found).toBeDefined();
    expect(found!.status).toBe("pronto");
    expect(found!.germinadas).toBe(60);
  });

  it("deletes a germinacao lote", async () => {
    if (!germinacaoId) return;

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.germinacao.delete({ id: germinacaoId });

    const data = await caller.fazenda.loadAll();
    const found = data.germinacao.find((g: any) => g.id === germinacaoId);
    expect(found).toBeUndefined();
  });
});
