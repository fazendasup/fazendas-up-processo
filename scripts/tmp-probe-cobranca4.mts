import { getComercialPrisma } from "../server/comercial/db.ts";
import { criarCobrancasPessoa } from "../server/portal/portalPagamento.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
if (!cliente?.externalId) throw new Error("sem cliente");

try {
  const r = await criarCobrancasPessoa({
    prisma,
    pedidoId: `probe-${Date.now()}`,
    contaAzulCustomerId: cliente.externalId,
    total: 12.79,
    descricao: "Probe checkout PF fix",
    vencimentoYmd: "2026-10-22",
    formaPagamento: "pix",
  });
  console.log("ok", r);
} catch (error) {
  console.error("erro", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
