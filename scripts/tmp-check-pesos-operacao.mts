import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { pesoDoProduto } from "../shared/produtoPeso.ts";

const prisma = getComercialPrisma();
const rows = await prisma.produtoComercial.findMany({
  where: {
    contaAzulProdutoId: { not: null },
    OR: [{ importadoOperacao: true }, { ativo: true }],
  },
  select: { nome: true, sku: true, modoCompra: true },
  orderBy: { nome: "asc" },
});
const com = rows.filter((p) => pesoDoProduto(p.nome, p.modoCompra));
const sem = rows.filter((p) => !pesoDoProduto(p.nome, p.modoCompra));
console.log(`operacao ${rows.length} | com peso ${com.length} | sem peso ${sem.length}`);
for (const p of sem) {
  console.log(`SEM | ${p.sku} | ${p.nome}`);
}
await prisma.$disconnect();
