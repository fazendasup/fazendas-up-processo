import { PrismaClient } from "../server/comercial/generated/prisma/index.js";

const p = new PrismaClient();
const rows = await p.produtoComercial.findMany({
  where: { importadoOperacao: true },
  orderBy: { nome: "asc" },
  select: {
    nome: true,
    categoria: true,
    precoBase: true,
    ativo: true,
    visivelPortal: true,
    modoCompra: true,
    imagemUrl: true,
    ocultoListaCompra: true,
  },
});
console.log("count", rows.length);
for (const r of rows) {
  const preco = r.precoBase == null ? "-" : String(r.precoBase);
  console.log(
    [
      r.ativo ? "ATIVO" : "off",
      r.visivelPortal ? "LOJA" : "oculto",
      r.ocultoListaCompra ? "lista-off" : "lista",
      r.modoCompra,
      preco,
      r.categoria || "-",
      r.imagemUrl ? "foto" : "sem-foto",
      r.nome,
    ].join(" | "),
  );
}
await p.$disconnect();
