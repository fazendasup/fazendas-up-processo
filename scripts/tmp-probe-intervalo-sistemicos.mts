import "dotenv/config";
import { eq } from "drizzle-orm";
import { ciclos } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("no db");
const rows = await db.select().from(ciclos).where(eq(ciclos.projetoId, 1));
for (const r of rows) {
  if (!/infinito|cercobin|thyper/i.test(`${r.nome} ${r.produto}`)) continue;
  console.log({
    id: r.id,
    nome: r.nome,
    frequencia: r.frequencia,
    intervaloDias: r.intervaloDias,
    ultima: r.ultimaExecucao ? String(r.ultimaExecucao).slice(0, 10) : null,
  });
}
await closeDb();
