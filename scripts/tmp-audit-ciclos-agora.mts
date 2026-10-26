import "dotenv/config";
import { ciclos, projetos, cicloCaixaExecucoes } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";
import { eq, desc } from "drizzle-orm";

const db = await getDb();
if (!db) throw new Error("no db");

const fazendas = await db.select({ id: projetos.id, nome: projetos.nome, status: projetos.status, tipo: projetos.tipo }).from(projetos);
const rows = await db.select().from(ciclos).orderBy(ciclos.projetoId, ciclos.nome, ciclos.id);

console.log("=== FAZENDAS ===");
for (const f of fazendas) console.log(f.id, f.status, f.tipo, f.nome);

console.log("\n=== CICLOS", rows.length, "ativos", rows.filter(r=>r.ativo).length, "===");
for (const r of rows) {
  console.log(
    r.ativo ? "A" : "I",
    "p"+r.projetoId,
    "id"+r.id,
    r.nome,
    "|",
    r.produto,
    "|",
    r.frequencia,
    r.intervaloDias ?? "",
    "| inicio",
    r.dataInicio ? String(r.dataInicio).slice(0,10) : "-",
    "| ult",
    r.ultimaExecucao ? String(r.ultimaExecucao).slice(0,16) : "-",
    "| caixas",
    Array.isArray(r.caixaIds) ? r.caixaIds.length : r.caixaIds,
  );
}

const execs = await db.select().from(cicloCaixaExecucoes).orderBy(desc(cicloCaixaExecucoes.ultimaExecucao)).limit(40);
console.log("\n=== ULTIMAS EXEC CAIXA (sample) ===");
for (const e of execs) {
  console.log("ciclo", e.cicloId, "caixa", e.caixaAguaId, "ult", e.ultimaExecucao ? String(e.ultimaExecucao).slice(0,16) : "-", "agenda", e.dataAgenda);
}

await closeDb();
