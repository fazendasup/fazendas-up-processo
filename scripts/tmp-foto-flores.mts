import "dotenv/config";
import { ensureComercialDatabaseUrlEnv } from "../server/comercial/env";
import { getComercialPrisma } from "../server/comercial/db";

const url = new URL(ensureComercialDatabaseUrlEnv());
const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
if (local) {
  console.log("banco local");
  process.exit(2);
}

const prisma = getComercialPrisma();
const ALVO = "cmq113x7h00gyod08mju3ft83";

try {
  const marcados = await prisma.produtoComercial.findMany({
    where: { imagemUrl: "/produtos/flores.jpg?v=4" },
    select: {
      id: true,
      nome: true,
      visivelPortal: true,
      importadoOperacao: true,
      portalFoto: { select: { produtoId: true } },
    },
  });
  console.log("marcados", marcados.length);
  for (const item of marcados) {
    if (item.portalFoto || item.visivelPortal) {
      console.log(
        item.visivelPortal ? "vitrine" : "oculto",
        item.portalFoto ? "tem-foto" : "sem-foto",
        item.nome,
      );
    }
  }

  const alvo = await prisma.produtoComercial.findUnique({
    where: { id: ALVO },
    select: { id: true, nome: true, imagemUrl: true, visivelPortal: true },
  });
  console.log("alvo", alvo?.nome ?? "ausente", alvo?.visivelPortal ? "vitrine" : "oculto", alvo?.imagemUrl?.startsWith("/api/portal/foto/") ? "portal" : alvo?.imagemUrl ?? "vazio");

  for (const item of marcados) {
    if (!item.portalFoto || item.id === ALVO) continue;
    await prisma.produtoComercial.update({
      where: { id: item.id },
      data: { imagemUrl: `/api/portal/foto/${item.id}` },
    });
    console.log("restaurado", item.nome);
  }

  if (alvo) {
    await prisma.produtoComercial.update({
      where: { id: ALVO },
      data: { imagemUrl: "/produtos/flores.jpg?v=4" },
    });
    console.log("loja", alvo.nome);
  }
} catch {
  console.error("falhou");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
