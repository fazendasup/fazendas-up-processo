import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import {
  andares,
  caixasAgua,
  furos,
  perfis,
  torres,
  transplantios,
} from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("no db");

const PROJETO = 1;
const cx = await db.select().from(caixasAgua).where(eq(caixasAgua.projetoId, PROJETO));
const ts = await db.select().from(torres).where(eq(torres.projetoId, PROJETO));
const ads = await db.select().from(andares);
const pfs = await db.select().from(perfis);
const trs = await db.select().from(transplantios).where(eq(transplantios.projetoId, PROJETO));

console.log("transplantios total", trs.length);
console.log(
  "andares com dataEntrada",
  ads.filter((a) => a.dataEntrada).length,
  "/",
  ads.length,
);
console.log(
  "perfis com dataEntrada",
  pfs.filter((p) => p.dataEntrada).length,
  "/",
  pfs.length,
);

// Por torre: datas distintas de entrada (andar + perfil)
console.log("\n=== Torres: datas de entrada distintas ===");
for (const t of ts.slice(0, 25)) {
  const ands = ads.filter((a) => a.torreId === t.id);
  const datas = new Set<string>();
  for (const a of ands) {
    if (a.dataEntrada) datas.add(String(a.dataEntrada).slice(0, 10));
    for (const p of pfs.filter((x) => x.andarId === a.id)) {
      if (p.dataEntrada) datas.add(String(p.dataEntrada).slice(0, 10));
    }
  }
  const caixa = cx.find((c) => c.id === t.caixaAguaId);
  if (datas.size === 0 && ands.every((a) => !a.dataEntrada)) continue;
  console.log(
    t.nome,
    "fase",
    t.fase,
    "caixa",
    caixa?.nome ?? "-",
    "datas",
    [...datas].sort().join(", ") || "(sem data)",
    "andares",
    ands.length,
  );
}

// Contagem de torres com >1 data
let multi = 0;
let comData = 0;
for (const t of ts) {
  const ands = ads.filter((a) => a.torreId === t.id);
  const datas = new Set<string>();
  for (const a of ands) {
    if (a.dataEntrada) datas.add(String(a.dataEntrada).slice(0, 10));
    for (const p of pfs.filter((x) => x.andarId === a.id)) {
      if (p.dataEntrada) datas.add(String(p.dataEntrada).slice(0, 10));
    }
  }
  if (datas.size > 0) comData += 1;
  if (datas.size > 1) multi += 1;
}
console.log("\ntorres com data", comData, "com múltiplas datas", multi);

// últimos transplantios
console.log("\n=== Últimos transplantios ===");
for (const t of trs.slice(-15)) {
  console.log(
    String(t.dataHora ?? t.createdAt).slice(0, 16),
    "de",
    t.torreOrigemId,
    "→",
    t.torreDestinoId,
    (t.observacoes ?? "").slice(0, 40),
  );
}

await closeDb();
