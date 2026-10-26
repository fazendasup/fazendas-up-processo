import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import { sincronizarCatalogoProdutosContaAzul } from "../server/comercial/integrations/conta-azul/produtos-sync.service.ts";
import { pesoDoProduto } from "../shared/produtoPeso.ts";

const prisma = getComercialPrisma();
const env = getComercialEnv();

const resultado = await sincronizarCatalogoProdutosContaAzul(prisma, env, {
  busca: "Americana",
});
console.log("resultado", resultado);

const locais = await prisma.produtoComercial.findMany({
  where: {
    OR: [
      { sku: "ALFAC16" },
      { sku: "ALFAC14" },
      { nome: { contains: "Americana" } },
    ],
  },
  select: {
    nome: true,
    sku: true,
    ativo: true,
    importadoOperacao: true,
    statusContaAzul: true,
    sincronizadoEm: true,
  },
  orderBy: { nome: "asc" },
});
console.log(
  "depois",
  locais
    .filter((r) => r.importadoOperacao || r.sku === "ALFAC16" || r.sku === "ALFAC14")
    .map((r) => ({
      nome: r.nome,
      sku: r.sku,
      peso: pesoDoProduto(r.nome),
      sync: r.sincronizadoEm,
    })),
);

await prisma.$disconnect();
