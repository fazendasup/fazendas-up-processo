import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { fichaDoProduto } from "../server/portal/vitrineCopy";

const fotos = new Set([
  "/produtos/americana.jpg?v=1",
  "/produtos/alface-roxa.jpg?v=1",
  "/produtos/alface.jpg?v=1",
]);

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
  const foto = fichaDoProduto(produto.nome).foto;
  if (!fotos.has(foto)) continue;
  const origem = (produto.imagemUrl ?? "").startsWith("/api/portal/foto/") ? "portal" : "arquivo";
  if (produto.imagemUrl === foto) {
    console.log("ja", produto.nome);
    continue;
  }
  await prisma.produtoComercial.update({
    where: { id: produto.id },
    data: { imagemUrl: foto },
  });
  console.log("atualizado", origem, produto.nome);
}

await prisma.$disconnect();
