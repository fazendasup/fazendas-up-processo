import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { alterarFormaPagamentoPedido, cancelarPedidoCliente } from "../server/portal/portalPagamento.ts";

const prisma = getComercialPrisma();
const pedidoId = "cmvfpg1ec0001qw081mc0c8ya";
const clienteId = "cmpcsesaw0009l108f00ze1fc";
const ca = "70f632a6-d009-4cbf-85af-837c330d9760";

try {
  console.log("cancelar...");
  const r = await cancelarPedidoCliente({ prisma, pedidoId, clienteId, contaAzulCustomerId: ca });
  console.log("cancel ok", r);
} catch (error) {
  console.error("cancel erro", error instanceof Error ? error.message : error);
}

await prisma.$disconnect();
