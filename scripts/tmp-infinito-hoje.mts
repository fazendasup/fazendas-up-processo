import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { cicloCaixaExecucoes, ciclos, andares, torres, caixasAgua } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";
import { hojeYmdSaoPaulo, instanteMeioDia } from "../shared/cicloSequencia";

const PROJETO = 1;
const INFINITO_ID = 14;

const db = await getDb();
if (!db) throw new Error("no db");

const hoje = hojeYmdSaoPaulo();
const meio = instanteMeioDia(hoje);
console.log("hoje SP", hoje);

const inf = (
  await db
    .select()
    .from(ciclos)
    .where(and(eq(ciclos.projetoId, PROJETO), eq(ciclos.id, INFINITO_ID)))
)[0];
if (!inf) throw new Error("Infinito não encontrado");

const caixaIds = Array.isArray(inf.caixaIds) ? inf.caixaIds.map(Number) : [];
console.log("Infinito caixas", caixaIds.length, caixaIds);

const execs = await db
  .select()
  .from(cicloCaixaExecucoes)
  .where(eq(cicloCaixaExecucoes.cicloId, INFINITO_ID));

let upd = 0;
let ins = 0;
for (const caixaId of caixaIds) {
  const row = execs.find((e) => e.caixaAguaId === caixaId);
  if (row) {
    await db
      .update(cicloCaixaExecucoes)
      .set({ dataAgenda: meio })
      .where(eq(cicloCaixaExecucoes.id, row.id));
    upd += 1;
  } else {
    await db.insert(cicloCaixaExecucoes).values({
      projetoId: PROJETO,
      cicloId: INFINITO_ID,
      caixaAguaId: caixaId,
      dataAgenda: meio,
      ultimaExecucao: null,
    });
    ins += 1;
  }
}

console.log("agenda hoje: update", upd, "insert", ins);

// Amostra: andares por caixa com dataEntrada (transplantios escalonados)
const cx = await db.select().from(caixasAgua).where(eq(caixasAgua.projetoId, PROJETO));
const ts = await db.select().from(torres).where(eq(torres.projetoId, PROJETO));
const ads = await db.select().from(andares);

console.log("\n=== Entradas por caixa (veg/mat) — amostra ===");
for (const caixa of cx.filter((c) => c.fase !== "mudas").slice(0, 8)) {
  const torresCx = ts.filter((t) => t.caixaAguaId === caixa.id);
  const entradas: string[] = [];
  for (const t of torresCx) {
    for (const a of ads.filter((x) => x.torreId === t.id && x.dataEntrada)) {
      entradas.push(String(a.dataEntrada).slice(0, 10));
    }
  }
  const unicas = [...new Set(entradas)].sort();
  console.log(
    caixa.nome,
    caixa.fase,
    "torres",
    torresCx.length,
    "entradas distintas",
    unicas.length,
    unicas.slice(0, 6).join(", "),
    unicas.length > 6 ? "…" : "",
  );
}

await closeDb();
