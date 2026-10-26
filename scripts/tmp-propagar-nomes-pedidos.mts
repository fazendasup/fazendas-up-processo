import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";

const prisma = getComercialPrisma();

const produtos = await prisma.produtoComercial.findMany({
  where: { contaAzulProdutoId: { not: null } },
  select: { id: true, nome: true, sku: true },
});

let total = 0;
for (const p of produtos) {
  const r = await prisma.pedidoOperacionalItem.updateMany({
    where: {
      produtoId: p.id,
      produtoNome: { not: p.nome },
      pedido: { status: { in: ["PENDENTE", "PRONTO"] } },
    },
    data: { produtoNome: p.nome },
  });
  if (r.count > 0) {
    total += r.count;
    console.log(`${p.sku ?? "-"} | ${r.count} → ${p.nome}`);
  }
}
console.log(`total atualizados ${total}`);
await prisma.$disconnect();
