import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";

const p = getComercialPrisma();
const rows = await p.produtoComercial.findMany({
  where: { OR: [{ importadoOperacao: true }, { ativo: true }] },
  select: { nome: true, categoria: true },
  orderBy: { nome: "asc" },
});
const byCat = new Map<string, number>();
for (const r of rows) {
  const c = (r.categoria || "Sem categoria").trim();
  byCat.set(c, (byCat.get(c) || 0) + 1);
}
console.log(
  "categorias",
  Object.fromEntries([...byCat.entries()].sort((a, b) => b[1] - a[1])),
);
for (const r of rows.filter((x) => !x.categoria).slice(0, 40)) {
  console.log("sem:", r.nome);
}
await p.$disconnect();
