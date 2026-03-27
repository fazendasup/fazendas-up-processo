import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Context helpers ----

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

describe("Movimentação de Perfis/Andares", () => {
  const operatorCaller = appRouter.createCaller(createOperatorContext());
  const adminCaller = appRouter.createCaller(createAdminContext());

  it("moverAndar — moves all perfis between andares of same phase", async () => {
    // Load data to find two andares of the same phase
    const data = await operatorCaller.fazenda.loadAll();
    const torres = data.torres as any[];
    const andares = data.andares as any[];

    // Find a phase with at least 2 andares across its towers
    let origemAndarId: number | null = null;
    let destinoAndarId: number | null = null;

    for (const fase of ["mudas", "vegetativa", "maturacao"]) {
      const torresFase = torres.filter((t: any) => t.fase === fase);
      const andarIds: number[] = [];
      for (const t of torresFase) {
        const tAndares = andares.filter((a: any) => a.torreId === t.id);
        for (const a of tAndares) {
          andarIds.push(a.id);
        }
      }
      if (andarIds.length >= 2) {
        origemAndarId = andarIds[0];
        destinoAndarId = andarIds[1];
        break;
      }
    }

    if (!origemAndarId || !destinoAndarId) {
      // Skip test if no suitable andares found
      console.warn("No suitable andares found for moverAndar test, skipping");
      return;
    }

    const result = await operatorCaller.andares.moverAndar({
      origemAndarId,
      destinoAndarId,
    });

    expect(result).toEqual({ success: true });
  });

  it("moverPerfil — moves a single perfil between andares of same phase", async () => {
    const data = await operatorCaller.fazenda.loadAll();
    const torres = data.torres as any[];
    const andares = data.andares as any[];

    let origemAndarId: number | null = null;
    let destinoAndarId: number | null = null;

    for (const fase of ["mudas", "vegetativa", "maturacao"]) {
      const torresFase = torres.filter((t: any) => t.fase === fase);
      const andarIds: number[] = [];
      for (const t of torresFase) {
        const tAndares = andares.filter((a: any) => a.torreId === t.id);
        for (const a of tAndares) {
          andarIds.push(a.id);
        }
      }
      if (andarIds.length >= 2) {
        origemAndarId = andarIds[0];
        destinoAndarId = andarIds[1];
        break;
      }
    }

    if (!origemAndarId || !destinoAndarId) {
      console.warn("No suitable andares found for moverPerfil test, skipping");
      return;
    }

    const result = await operatorCaller.andares.moverPerfil({
      origemAndarId,
      perfilIndex: 0,
      destinoAndarId,
      destinoPerfilIndex: 0,
    });

    expect(result).toEqual({ success: true });
  });

  it("moverAndar — rejects cross-phase movement", async () => {
    const data = await operatorCaller.fazenda.loadAll();
    const torres = data.torres as any[];
    const andares = data.andares as any[];

    // Find andares from different phases
    let mudasAndarId: number | null = null;
    let vegAndarId: number | null = null;

    for (const t of torres) {
      const tAndares = andares.filter((a: any) => a.torreId === t.id);
      if (tAndares.length > 0) {
        if (t.fase === "mudas" && !mudasAndarId) mudasAndarId = tAndares[0].id;
        if (t.fase === "vegetativa" && !vegAndarId) vegAndarId = tAndares[0].id;
      }
    }

    if (!mudasAndarId || !vegAndarId) {
      console.warn("No suitable cross-phase andares found, skipping");
      return;
    }

    await expect(
      operatorCaller.andares.moverAndar({
        origemAndarId: mudasAndarId,
        destinoAndarId: vegAndarId,
      })
    ).rejects.toThrow(/mesma fase/);
  });

  it("moverPerfil — rejects cross-phase movement", async () => {
    const data = await operatorCaller.fazenda.loadAll();
    const torres = data.torres as any[];
    const andares = data.andares as any[];

    let mudasAndarId: number | null = null;
    let vegAndarId: number | null = null;

    for (const t of torres) {
      const tAndares = andares.filter((a: any) => a.torreId === t.id);
      if (tAndares.length > 0) {
        if (t.fase === "mudas" && !mudasAndarId) mudasAndarId = tAndares[0].id;
        if (t.fase === "vegetativa" && !vegAndarId) vegAndarId = tAndares[0].id;
      }
    }

    if (!mudasAndarId || !vegAndarId) {
      console.warn("No suitable cross-phase andares found, skipping");
      return;
    }

    await expect(
      operatorCaller.andares.moverPerfil({
        origemAndarId: mudasAndarId,
        perfilIndex: 0,
        destinoAndarId: vegAndarId,
        destinoPerfilIndex: 0,
      })
    ).rejects.toThrow(/mesma fase/);
  });
});
