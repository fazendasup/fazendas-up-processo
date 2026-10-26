import { getComercialPrisma } from "../server/comercial/db.ts";
import { criarCobrancasPessoa } from "../server/portal/portalPagamento.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
console.log("cliente", cliente ? { id: cliente.id, externalId: cliente.externalId, nome: cliente.nome } : null);
if (!cliente?.externalId) {
  process.exit(1);
}

try {
  const r = await criarCobrancasPessoa({
    prisma,
    pedidoId: `probe-${Date.now()}`,
    contaAzulCustomerId: cliente.externalId,
    total: 12.79,
    descricao: "Probe checkout PF",
    vencimentoYmd: "2026-10-22",
  });
  console.log("ok", r);
} catch (error) {
  console.error("erro", error instanceof Error ? error.message : error);
  if (error && typeof error === "object" && "stack" in error) console.error((error as Error).stack);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
