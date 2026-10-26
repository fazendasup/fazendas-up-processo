/**
 * Remove do banco ciclos inativos que só poluem a tela:
 * - Thyper S-50 duplicados (mantém o ativo)
 * - Peróxido / Bio / KOH legados inativos
 * - Controles de algas e suplementos antigos inativos
 */
import "dotenv/config";
import { inArray, sql } from "drizzle-orm";
import { cicloCaixaExecucoes, ciclos, tarefas } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const LIXO_INATIVO = [
  "bio",
  "peroxido",
  "koh",
  "controle de algas - sialex",
  "controle de algas - kasumin + sialex",
  "suplementacao nutricional - caixas",
  "suplemento nutricional - torres",
];

const db = await getDb();
if (!db) throw new Error("no db");

const rows = await db
  .select({
    id: ciclos.id,
    projetoId: ciclos.projetoId,
    nome: ciclos.nome,
    ativo: ciclos.ativo,
  })
  .from(ciclos);

const apagar = new Set<number>();

// 1) Thyper inativos duplicados (mantém ativos)
for (const r of rows) {
  if (r.ativo) continue;
  if (norm(r.nome).includes("thyper")) apagar.add(r.id);
}

// 2) Lixo legado inativo
for (const r of rows) {
  if (r.ativo) continue;
  const n = norm(r.nome);
  if (LIXO_INATIVO.some(x => n === x || n.includes(x))) apagar.add(r.id);
}

const ids = [...apagar];
console.log("a apagar", ids.length, ids);

if (ids.length === 0) {
  await closeDb();
  process.exit(0);
}

// Filhos / referências
await db
  .delete(cicloCaixaExecucoes)
  .where(inArray(cicloCaixaExecucoes.cicloId, ids));
await db
  .update(tarefas)
  .set({ cicloId: null })
  .where(inArray(tarefas.cicloId, ids));

await db.delete(ciclos).where(inArray(ciclos.id, ids));

const restantes = await db
  .select({
    id: ciclos.id,
    projetoId: ciclos.projetoId,
    nome: ciclos.nome,
    ativo: ciclos.ativo,
  })
  .from(ciclos)
  .orderBy(ciclos.projetoId, ciclos.nome);

console.log(
  "restantes",
  restantes.length,
  "ativos",
  restantes.filter(r => r.ativo).length,
  "inativos",
  restantes.filter(r => !r.ativo).length,
);
for (const r of restantes) {
  console.log(r.ativo ? "A" : "I", r.projetoId, r.id, r.nome);
}

await closeDb();
