import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { alterarFormaPagamentoPedido } from "../server/portal/portalPagamento.ts";

const pedidoId = "cmvfrr51t05d7nu0874hw0l7i";
const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});

async function trocar(forma: "pix" | "cartao") {
  const r = await alterarFormaPagamentoPedido({
    prisma,
    pedidoId,
    clienteId: cliente!.id,
    contaAzulCustomerId: cliente!.externalId!,
    formaPagamento: forma,
  });
  console.log(forma, { total: r.total, pix: !!r.pixUrl, cartao: !!r.cartaoUrl, forma: r.formaPagamento });
  if (forma === "pix" && r.total !== 12.79) throw new Error(`Pix deveria ser 12.79, veio ${r.total}`);
  if (forma === "cartao" && r.total !== 13.43) throw new Error(`Cartão deveria ser 13.43, veio ${r.total}`);
  if (forma === "pix" && (r.cartaoUrl || !r.pixUrl && !r.linkPendente)) {
    /* linkPendente ok */
  }
  if (forma === "cartao" && r.pixUrl) throw new Error("Cartão não pode ter pixUrl");
  if (forma === "pix" && r.cartaoUrl) throw new Error("Pix não pode ter cartaoUrl");
}

await trocar("cartao");
await trocar("pix");
await trocar("cartao");
await trocar("pix");
console.log("CICLO OK");
await prisma.$disconnect();
