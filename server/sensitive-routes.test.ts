import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { useMockProjetoResolve, withProjetoBase } from "./test-projeto-trpc";

useMockProjetoResolve();

function createPublicContext(): TrpcContext {
  return {
    user: null,
    projetoId: null,
    projetoTipo: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext["res"],
  };
}

function createOperatorContext(): TrpcContext {
  return withProjetoBase({
    user: {
      id: 2,
      openId: "test-operator-sensitive",
      email: "operator-sensitive@test.com",
      name: "Operator Sensitive",
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

function createAdminContext(): TrpcContext {
  return withProjetoBase({
    user: {
      id: 1,
      openId: "test-admin-sensitive",
      email: "admin-sensitive@test.com",
      name: "Admin Sensitive",
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

async function getReceitaAndVariedade() {
  const adminCaller = appRouter.createCaller(createAdminContext());
  const data = await adminCaller.fazenda.loadAll();
  if (!data.variedades?.length) return null;
  const variedade = data.variedades[0];
  const receitas = await adminCaller.receitas.list();
  let receita: { id: number; nome: string };
  if (receitas.length > 0) {
    receita = receitas[0] as { id: number; nome: string };
  } else {
    const created = await adminCaller.receitas.create({
      nome: "Receita Sensitive Test",
      variedadeId: variedade.id,
    });
    receita = { id: created.id, nome: "Receita Sensitive Test" };
  }
  return { receita, variedade };
}

describe("Rotas sensíveis — plantio / inteligência / colheita", () => {
  it("operador registra contagem de germinação em plano", async () => {
    const rv = await getReceitaAndVariedade();
    if (!rv) return;

    const adminCaller = appRouter.createCaller(createAdminContext());
    const operatorCaller = appRouter.createCaller(createOperatorContext());
    const now = new Date();

    const created = await adminCaller.planosPlantio.create({
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
      torreDestinoId: null,
    });

    const planoId = created.id;
    expect(planoId).toBeDefined();

    await operatorCaller.planosPlantio.registrarContagemGerminacao({
      id: planoId,
      germinadas: 12,
      naoGerminadas: 38,
    });

    const list = await adminCaller.planosPlantio.list();
    const plano = list.find((p: { id: number }) => Number(p.id) === planoId);
    expect(plano).toBeDefined();
    expect(plano?.germinadas).toBe(12);
    expect(plano?.naoGerminadas).toBe(38);

    await adminCaller.planosPlantio.delete({ id: planoId });
  });

  it("admin cria série com recorrência personalizada (intervalo em dias)", async () => {
    const rv = await getReceitaAndVariedade();
    if (!rv) return;

    const adminCaller = appRouter.createCaller(createAdminContext());
    const now = new Date();

    const result = await adminCaller.planosPlantio.create({
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
      torreDestinoId: null,
      recorrencia: "personalizado",
      intervaloDiasPersonalizado: 11,
      repeticoes: 3,
    });

    expect(result.count).toBe(3);
    expect(result.ids?.length).toBe(3);

    for (const id of result.ids ?? []) {
      await adminCaller.planosPlantio.delete({ id });
    }
  });

  it(
    "inteligencia.recalcular retorna métricas (operador)",
    async () => {
      const operatorCaller = appRouter.createCaller(createOperatorContext());
      const out = await operatorCaller.inteligencia.recalcular();
      expect(out.success).toBe(true);
      expect(typeof out.criados).toBe("number");
      expect(typeof out.atualizados).toBe("number");
      expect(typeof out.resolvidos).toBe("number");
      expect(typeof out.totalCandidatos).toBe("number");
    },
    15_000,
  );

  it("operador cria registro de colheita e listagem inclui o registro", async () => {
    const listCaller = appRouter.createCaller(createOperatorContext());
    const operatorCaller = appRouter.createCaller(createOperatorContext());
    const data = await listCaller.fazenda.loadAll();
    const torre = data.torres?.[0];
    const andar = data.andares?.find((a: { torreId: number }) => a.torreId === torre?.id);
    if (!torre || !andar) return;

    const before = await listCaller.registrosColheita.list();
    const created = await operatorCaller.registrosColheita.create({
      torreId: torre.id,
      andarId: andar.id,
      dataColheita: new Date(),
      quantidadePlantas: 3,
      variedadeNome: "E2E Colheita Test",
    });

    expect(created.id).toBeDefined();
    const after = await listCaller.registrosColheita.list();
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    const found = after.find((r: { id: unknown }) => Number(r.id) === Number(created.id));
    expect(found).toBeDefined();

    const adminCaller = appRouter.createCaller(createAdminContext());
    await adminCaller.registrosColheita.delete({ id: Number(created.id) });
  });
});
