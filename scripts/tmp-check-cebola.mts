import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
import { getComercialPrisma } from "../server/comercial/db.ts";
import { grupoEfetivo } from "../server/portal/vitrineCopy.ts";

const prisma = getComercialPrisma();

const cebolas = await prisma.produtoComercial.findMany({
  where: { nome: { contains: "Cebola" } },
  select: {
    id: true,
    nome: true,
    ativo: true,
    visivelPortal: true,
    exclusivoPortal: true,
    precoBase: true,
    ocultoListaCompra: true,
    importadoOperacao: true,
    contaAzulProdutoId: true,
    statusContaAzul: true,
    grupoLoja: true,
    modoCompra: true,
  },
  orderBy: { nome: "asc" },
});

console.log(
  JSON.stringify(
    {
      totalCebolas: cebolas.length,
      itens: cebolas.map((p) => ({
        nome: p.nome,
        grupo: grupoEfetivo(p.nome, p.grupoLoja),
        ativo: p.ativo,
        naLoja: p.visivelPortal,
        exclusivo: p.exclusivoPortal,
        importado: p.importadoOperacao,
        temCaId: Boolean(p.contaAzulProdutoId),
        statusCA: p.statusContaAzul,
        preco: p.precoBase == null ? null : Number(p.precoBase),
        oculto: p.ocultoListaCompra,
        modo: p.modoCompra,
        elegivelEquipe: p.importadoOperacao && Boolean(p.contaAzulProdutoId),
        elegivelVitrine:
          p.ativo &&
          p.visivelPortal &&
          p.importadoOperacao &&
          Boolean(p.contaAzulProdutoId) &&
          p.precoBase != null &&
          Number(p.precoBase) > 0 &&
          !p.exclusivoPortal,
      })),
    },
    null,
    2,
  ),
);

const kgBranca = await prisma.produtoComercial.findMany({
  where: {
    OR: [
      { nome: { contains: "Cebola Branca Kg" } },
      { nome: { contains: "Cebola Branca" } },
      { nome: { contains: "cebola branca" } },
    ],
  },
  select: { nome: true, importadoOperacao: true, visivelPortal: true, ativo: true },
});
console.log("--- busca Cebola Branca ---");
console.log(JSON.stringify(kgBranca, null, 2));

await prisma.$disconnect();
