import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
if (!cliente) {
  console.log("sem cliente");
  process.exit(1);
}
const pedidos = await prisma.pedidoOperacional.findMany({
  where: { clienteId: cliente.id },
  orderBy: { criadoEm: "desc" },
  take: 8,
  include: { itens: true },
});
for (const p of pedidos) {
  const pag = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId: p.id } });
  console.log({
    id: p.id,
    status: p.status,
    criado: p.criadoEm,
    obs: (p.observacoes ?? "").slice(0, 100),
    itens: p.itens.map((i) => ({
      nome: i.produtoNome,
      q: Number(i.quantidade),
      preco: Number(i.precoUnit),
    })),
    pag: pag
      ? {
          status: pag.status,
          total: Number(pag.total),
          pixUrl: pag.pixUrl?.slice(0, 60) ?? null,
          cartaoUrl: pag.cartaoUrl?.slice(0, 60) ?? null,
          pixId: pag.pixCobrancaId,
          cartaoId: pag.cartaoCobrancaId,
          parcela: pag.parcelaId,
          receber: pag.contaAzulReceberId,
        }
      : null,
  });
}
await prisma.$disconnect();
