import "dotenv/config";
import { desc } from "drizzle-orm";
import { ciclos } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const db = await getDb();
if (!db) throw new Error("no db");

const rows = await db
  .select({
    id: ciclos.id,
    projetoId: ciclos.projetoId,
    nome: ciclos.nome,
    produto: ciclos.produto,
    ativo: ciclos.ativo,
    frequencia: ciclos.frequencia,
    intervaloDias: ciclos.intervaloDias,
    ultimaExecucao: ciclos.ultimaExecucao,
  })
  .from(ciclos)
  .orderBy(ciclos.projetoId, ciclos.nome, desc(ciclos.ativo), ciclos.id);

console.log(
  "total",
  rows.length,
  "ativos",
  rows.filter(r => r.ativo).length,
  "inativos",
  rows.filter(r => !r.ativo).length,
);

const byProj = new Map<number, typeof rows>();
for (const r of rows) {
  const list = byProj.get(r.projetoId) ?? [];
  list.push(r);
  byProj.set(r.projetoId, list);
}

for (const [pid, list] of byProj) {
  console.log(
    `\n=== projeto ${pid} n=${list.length} ativos=${list.filter(r => r.ativo).length}`,
  );
  const counts = new Map<string, number>();
  for (const r of list) {
    const key = norm(r.nome);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [nome, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    if (n > 1) console.log(`  DUP ${n}x ${nome}`);
  }
  for (const r of list) {
    console.log(
      r.ativo ? "A" : "I",
      r.id,
      r.nome,
      "|",
      r.produto,
      "|",
      r.frequencia,
      r.intervaloDias ?? "",
      r.ultimaExecucao ? `ult=${String(r.ultimaExecucao).slice(0, 10)}` : "",
    );
  }
}

await closeDb();
