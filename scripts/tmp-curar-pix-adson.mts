/**
 * Regenera Pix do pedido de teste com valor correto (sem taxa de cartão).
 */
import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { alterarFormaPagamentoPedido, formaPagamentoDoRegistro } from "../server/portal/portalPagamento.ts";

const pedidoId = "cmvfrr51t05d7nu0874hw0l7i";
const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});

const antes = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
console.log("antes", {
  total: antes && Number(antes.total),
  forma: antes && formaPagamentoDoRegistro(antes),
});

// Força regeneração Pix (mesmo se já for Pix — total inconsistente dispara recreate).
const r = await alterarFormaPagamentoPedido({
  prisma,
  pedidoId,
  clienteId: cliente!.id,
  contaAzulCustomerId: cliente!.externalId!,
  formaPagamento: "pix",
});
console.log("depois", r);

await prisma.$disconnect();
