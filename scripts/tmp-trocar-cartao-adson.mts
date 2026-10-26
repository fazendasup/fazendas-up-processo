import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { alterarFormaPagamentoPedido } from "../server/portal/portalPagamento.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
const pedidoId = "cmvfrr51t05d7nu0874hw0l7i";
try {
  const r = await alterarFormaPagamentoPedido({
    prisma,
    pedidoId,
    clienteId: cliente!.id,
    contaAzulCustomerId: cliente!.externalId!,
    formaPagamento: "cartao",
  });
  console.log("ok", r);
} catch (e) {
  console.error("falha", e);
}
const pag = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
console.log("depois", {
  total: pag && Number(pag.total),
  pix: pag?.pixCobrancaId,
  cartao: pag?.cartaoCobrancaId,
  pixUrl: !!pag?.pixUrl,
  cartaoUrl: !!pag?.cartaoUrl,
});
await prisma.$disconnect();
