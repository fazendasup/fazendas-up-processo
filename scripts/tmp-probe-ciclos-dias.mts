import "dotenv/config";
import { eq } from "drizzle-orm";
import { ciclos } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("no db");
for (const projetoId of [1, 6]) {
  const rows = await db.select().from(ciclos).where(eq(ciclos.projetoId, projetoId));
  console.log("\n=== projeto", projetoId, "===");
  for (const r of rows) {
    console.log(
      r.id,
      r.nome,
      "dias",
      JSON.stringify(r.diasSemana),
      "ativo",
      r.ativo,
      "alvo",
      r.alvo,
      "caixas",
      Array.isArray(r.caixaIds) ? r.caixaIds.length : r.caixaIds,
      "ult",
      r.ultimaExecucao ? String(r.ultimaExecucao).slice(0, 10) : "-",
    );
  }
}
await closeDb();
