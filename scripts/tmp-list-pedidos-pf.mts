import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
  include: { portalAcesso: true },
});
console.log("cliente", cliente && {
  id: cliente.id,
  externalId: cliente.externalId,
  acessoId: cliente.portalAcesso?.id,
  perfil: cliente.portalAcesso?.perfil,
});

const pedidos = await prisma.pedidoOperacional.findMany({
  where: {
    OR: [
      { clienteId: cliente?.id },
      ...(cliente?.externalId ? [{ contaAzulCustomerId: cliente.externalId }] : []),
    ],
  },
  orderBy: { criadoEm: "desc" },
  take: 10,
  include: { itens: true },
});
const pags = await prisma.portalPedidoPagamento.findMany({
  where: { pedidoId: { in: pedidos.map((p) => p.id) } },
});
const porId = new Map(pags.map((p) => [p.pedidoId, p]));
for (const p of pedidos) {
  const pag = porId.get(p.id);
  console.log({
    id: p.id,
    status: p.status,
    clienteId: p.clienteId,
    ca: p.contaAzulCustomerId,
    obs: (p.observacoes ?? "").slice(0, 120),
    pag: pag && { status: pag.status, pix: Boolean(pag.pixUrl), cartao: Boolean(pag.cartaoUrl), pixId: pag.pixCobrancaId, cartaoId: pag.cartaoCobrancaId },
  });
}
await prisma.$disconnect();
