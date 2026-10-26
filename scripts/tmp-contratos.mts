import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { garantirContratosDosClientesAtivos } from "../server/portal/contratoRecorrencia";

const prisma = getComercialPrisma();
try {
  const preparados = await garantirContratosDosClientesAtivos(prisma);
  const total = await prisma.portalContrato.count();
  const aceitos = await prisma.portalContrato.count({ where: { status: "ACEITO" } });
  console.log("preparados", preparados);
  console.log("contratos", total);
  console.log("aceitos", aceitos);
} catch {
  console.error("falhou");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
