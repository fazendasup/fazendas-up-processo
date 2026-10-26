import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";

const p = getComercialPrisma();
const rows = await p.produtoComercial.findMany({
  where: {
    OR: [
      { nome: { contains: "Americana" } },
      { nome: { contains: "100g" } },
      { nome: { contains: "120g" } },
      { nome: { contains: "120 g" } },
      { nome: { contains: "120GR" } },
    ],
  },
  select: { id: true, nome: true, sku: true },
  orderBy: { nome: "asc" },
});
for (const r of rows) {
  console.log(`${r.sku ?? "-"} | ${r.nome} | ${r.id}`);
}
await p.$disconnect();
