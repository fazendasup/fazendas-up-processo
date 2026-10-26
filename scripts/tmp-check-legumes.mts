import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
import { getComercialPrisma } from "../server/comercial/db.ts";
import { fichaDoProduto, grupoEfetivo } from "../server/portal/vitrineCopy.ts";

const prisma = getComercialPrisma();
const produtos = await prisma.produtoComercial.findMany({
  where: { importadoOperacao: true, contaAzulProdutoId: { not: null } },
  select: {
    id: true,
    nome: true,
    ativo: true,
    visivelPortal: true,
    exclusivoPortal: true,
    precoBase: true,
    ocultoListaCompra: true,
    grupoLoja: true,
    statusContaAzul: true,
  },
  orderBy: { nome: "asc" },
});

const legumes = produtos.filter((p) => {
  const g = grupoEfetivo(p.nome, p.grupoLoja);
  return g === "Legumes" || /batata|cenoura|tomate|cebola|beterraba|repolho|nabo|rabanete/i.test(p.nome);
});

const resumo = legumes.map((p) => ({
  nome: p.nome,
  grupo: grupoEfetivo(p.nome, p.grupoLoja),
  ficha: fichaDoProduto(p.nome).grupo,
  ativo: p.ativo,
  naLoja: p.visivelPortal,
  exclusivo: p.exclusivoPortal,
  preco: p.precoBase == null ? null : Number(p.precoBase),
  oculto: p.ocultoListaCompra,
  statusCA: p.statusContaAzul,
  motivo: !p.ativo
    ? "inativo"
    : !p.visivelPortal
      ? "fora da loja (visivelPortal=false)"
      : p.precoBase == null || Number(p.precoBase) <= 0
        ? "sem preço"
        : p.ocultoListaCompra
          ? "oculto lista compra"
          : "ok na vitrine",
}));

const foraLoja = resumo.filter((i) => i.motivo !== "ok na vitrine");
const naLojaLegumes = resumo.filter((i) => i.grupo === "Legumes" && i.motivo === "ok na vitrine");
console.log(
  JSON.stringify(
    {
      totalCatalogo: produtos.length,
      legumesRelacionados: resumo.length,
      legumesNaVitrine: naLojaLegumes.map((i) => i.nome),
      foraDaLoja: foraLoja.map((i) => ({ nome: i.nome, grupo: i.grupo, motivo: i.motivo, preco: i.preco })),
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
