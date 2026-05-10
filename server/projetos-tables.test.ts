import { describe, it, expect, beforeAll } from "vitest";
import { projetos } from "../drizzle/schema";
import { getDb, ensureProjetosTables, ensureProjetoMembershipsBootstrap } from "./db";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("projetos — tabelas e bootstrap (integração)", () => {
  beforeAll(async () => {
    await ensureProjetosTables();
  });

  it("ensureProjetosTables permite SELECT em projetos", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    await db!.select({ id: projetos.id }).from(projetos).limit(1);
  });

  it("ensureProjetoMembershipsBootstrap retorna ok", async () => {
    const r = await ensureProjetoMembershipsBootstrap();
    expect(r.ok).toBe(true);
  });
});

describe("projetos — exports", () => {
  it("ensureProjetosTables está definido", () => {
    expect(typeof ensureProjetosTables).toBe("function");
  });
});
