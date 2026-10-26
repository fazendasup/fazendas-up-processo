import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
import { getComercialPrisma } from "../server/comercial/db.ts";

const prisma = getComercialPrisma();

const MAPA: Array<{ match: RegExp; foto: string }> = [
  { match: /repolho\s*roxo/i, foto: "/produtos/repolho-roxo.jpg?v=4" },
  { match: /repolho/i, foto: "/produtos/repolho.jpg?v=4" },
  { match: /cebola\s*roxa/i, foto: "/produtos/cebola-roxa.jpg?v=4" },
  { match: /cebola/i, foto: "/produtos/cebola.jpg?v=4" },
  { match: /\balho\b/i, foto: "/produtos/alho.jpg?v=4" },
  { match: /batata\s*portuguesa/i, foto: "/produtos/batata.jpg?v=4" },
  { match: /batata\s*bolinha/i, foto: "/produtos/batata-bolinha.jpg?v=2" },
  { match: /cenoura/i, foto: "/produtos/cenoura.jpg?v=4" },
  { match: /beterraba/i, foto: "/produtos/beterraba.jpg?v=4" },
  { match: /tomate/i, foto: "/produtos/tomate.jpg?v=2" },
];

async function main() {
  const produtos = await prisma.produtoComercial.findMany({
    where: {
      contaAzulProdutoId: { not: null },
      OR: [
        { nome: { contains: "Cebola" } },
        { nome: { contains: "Alho" } },
        { nome: { contains: "Batata" } },
        { nome: { contains: "Cenoura" } },
        { nome: { contains: "Beterraba" } },
        { nome: { contains: "Repolho" } },
        { nome: { contains: "Tomate" } },
      ],
    },
    select: { id: true, nome: true, imagemUrl: true, visivelPortal: true },
  });

  let atualizados = 0;
  for (const p of produtos) {
    if (/broto|microverde|substrato|sc19|cx19|cx20|cx10|pakan/i.test(p.nome)) continue;
    const regra = MAPA.find((m) => m.match.test(p.nome));
    if (!regra) continue;
    if (p.imagemUrl === regra.foto) continue;
    await prisma.produtoComercial.update({
      where: { id: p.id },
      data: { imagemUrl: regra.foto },
    });
    atualizados += 1;
    console.log(p.nome, "→", regra.foto, "| antes:", p.imagemUrl);
  }
  console.log("Atualizados:", atualizados);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
