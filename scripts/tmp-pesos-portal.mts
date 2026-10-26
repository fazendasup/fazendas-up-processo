import { PrismaClient } from "../server/comercial/generated/prisma/index.js";

const prisma = new PrismaClient();
const rows = await prisma.produtoComercial.findMany({
  where: { ativo: true, visivelPortal: true },
  select: { nome: true, modoCompra: true, fatorCompraUnidade: true, rendimentoPorKg: true },
  orderBy: { nome: "asc" },
});
for (const row of rows) {
  console.log(
    `${row.modoCompra}\t${row.fatorCompraUnidade ?? "-"}\t${row.rendimentoPorKg ?? "-"}\t${row.nome}`,
  );
}
await prisma.$disconnect();
