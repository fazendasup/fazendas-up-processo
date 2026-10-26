import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { fichaDoProduto } from "../server/portal/vitrineCopy";

const prisma = getComercialPrisma();
const produtos = await prisma.produtoComercial.findMany({
  select: { nome: true, visivelPortal: true, imagemUrl: true },
});

for (const produto of produtos) {
  const nome = produto.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!nome.includes("manjer")) continue;
  const origem = (produto.imagemUrl ?? "").startsWith("/api/portal/foto/")
    ? "portal"
    : produto.imagemUrl
      ? "arquivo"
      : "vazio";
  console.log(produto.visivelPortal ? "vitrine" : "oculto", origem, produto.nome, "->", fichaDoProduto(produto.nome).foto);
}

await prisma.$disconnect();
