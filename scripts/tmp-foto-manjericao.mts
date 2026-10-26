import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { fichaDoProduto } from "../server/portal/vitrineCopy";

const fotoNova = "/produtos/manjericao.jpg?v=1";
const url = process.env.COMERCIAL_DATABASE_URL || process.env.DATABASE_URL || "";
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  host = "";
}
console.log(host === "127.0.0.1" || host === "localhost" ? "banco local" : "banco remoto");

const prisma = getComercialPrisma();
const produtos = await prisma.produtoComercial.findMany({
  where: { visivelPortal: true },
  select: { id: true, nome: true, imagemUrl: true },
});

for (const produto of produtos) {
  if (fichaDoProduto(produto.nome).foto !== fotoNova) continue;
  if (produto.imagemUrl === fotoNova) {
    console.log("ja", produto.nome);
    continue;
  }
  const origem = (produto.imagemUrl ?? "").startsWith("/api/portal/foto/") ? "portal" : "arquivo";
  await prisma.produtoComercial.update({
    where: { id: produto.id },
    data: { imagemUrl: fotoNova },
  });
  console.log("atualizado", origem, produto.nome);
}

await prisma.$disconnect();
