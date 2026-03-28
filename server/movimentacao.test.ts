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

/** Helper: find N andares of the same phase */
async function findAndaresOfSamePhase(
  caller: ReturnType<typeof appRouter.createCaller>,
  count: number,
  startOffset = 0
) {
  const data = await caller.fazenda.loadAll();
  const torres = data.torres as any[];
  const andares = data.andares as any[];

  for (const fase of ["mudas", "vegetativa", "maturacao"]) {
    const torresFase = torres.filter((t: any) => t.fase === fase);
    const andarIds: number[] = [];
    for (const t of torresFase) {
      const tAndares = andares.filter((a: any) => a.torreId === t.id);
      for (const a of tAndares) {
        andarIds.push(a.id);
      }
    }
    if (andarIds.length >= startOffset + count) {
      return andarIds.slice(startOffset, startOffset + count);
    }
  }
  return null;
}

/** Helper: find andares from different phases */
async function findCrossPhaseAndares(
  caller: ReturnType<typeof appRouter.createCaller>
) {
  const data = await caller.fazenda.loadAll();
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

  if (mudasAndarId && vegAndarId) return { mudasAndarId, vegAndarId };
  return null;
}

describe("Movimentação de Perfis/Andares", () => {
  const operatorCaller = appRouter.createCaller(createOperatorContext());

  it("moverAndar — moves all perfis between andares of same phase", async () => {
    // Use first 2 andares
    const ids = await findAndaresOfSamePhase(operatorCaller, 2, 0);
    if (!ids) {
      console.warn("No suitable andares found for moverAndar test, skipping");
      return;
    }

    const result = await operatorCaller.andares.moverAndar({
      origemAndarId: ids[0],
      destinoAndarId: ids[1],
    });

    expect(result).toEqual({ success: true });
  });

  it("moverPerfil — moves a single perfil between andares of same phase", async () => {
    // Use andares at offset 4 to avoid conflict with moverAndar test
    const ids = await findAndaresOfSamePhase(operatorCaller, 2, 4);
    if (!ids) {
      console.warn("No suitable andares found for moverPerfil test, skipping");
      return;
    }

    const result = await operatorCaller.andares.moverPerfil({
      origemAndarId: ids[0],
      perfilIndex: 0,
      destinoAndarId: ids[1],
      destinoPerfilIndex: 0,
    });

    expect(result).toEqual({ success: true });
  });

  it("moverAndar — rejects cross-phase movement", async () => {
    const cross = await findCrossPhaseAndares(operatorCaller);
    if (!cross) {
      console.warn("No suitable cross-phase andares found, skipping");
      return;
    }

    await expect(
      operatorCaller.andares.moverAndar({
        origemAndarId: cross.mudasAndarId,
        destinoAndarId: cross.vegAndarId,
      })
    ).rejects.toThrow(/mesma fase/);
  });

  it("moverPerfil — rejects cross-phase movement", async () => {
    const cross = await findCrossPhaseAndares(operatorCaller);
    if (!cross) {
      console.warn("No suitable cross-phase andares found, skipping");
      return;
    }

    await expect(
      operatorCaller.andares.moverPerfil({
        origemAndarId: cross.mudasAndarId,
        perfilIndex: 0,
        destinoAndarId: cross.vegAndarId,
        destinoPerfilIndex: 0,
      })
    ).rejects.toThrow(/mesma fase/);
  });
});
