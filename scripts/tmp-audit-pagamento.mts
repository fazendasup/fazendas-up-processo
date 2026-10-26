import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import {
  alterarFormaPagamentoPedido,
  formaPagamentoDoRegistro,
  totalCobrancaPessoa,
} from "../server/portal/portalPagamento.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
const pedidoId = "cmvfrr51t05d7nu0874hw0l7i";

function dump(label: string, pag: Awaited<ReturnType<typeof prisma.portalPedidoPagamento.findUnique>>) {
  if (!pag) {
    console.log(label, null);
    return;
  }
  console.log(label, {
    status: pag.status,
    total: Number(pag.total),
    forma: formaPagamentoDoRegistro(pag),
    pixId: pag.pixCobrancaId,
    cartaoId: pag.cartaoCobrancaId,
    pixUrl: Boolean(pag.pixUrl),
    cartaoUrl: Boolean(pag.cartaoUrl),
    esperadoPix: totalCobrancaPessoa(12.79, "pix"),
    esperadoCartao: totalCobrancaPessoa(12.79, "cartao"),
  });
}

let pag = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
dump("ANTES", pag);

const itens = await prisma.pedidoItemOperacional.findMany({ where: { pedidoId } });
const base =
  Math.round(itens.reduce((s, i) => s + Number(i.precoUnit) * Number(i.quantidade), 0) * 100) / 100;
console.log("base itens", base, itens.map((i) => ({ q: Number(i.quantidade), p: Number(i.precoUnit) })));

const atual = pag ? formaPagamentoDoRegistro(pag) : null;
console.log("forma atual", atual);

if (atual === "cartao") {
  console.log("--- trocar para PIX ---");
  try {
    const r = await alterarFormaPagamentoPedido({
      prisma,
      pedidoId,
      clienteId: cliente!.id,
      contaAzulCustomerId: cliente!.externalId!,
      formaPagamento: "pix",
    });
    console.log("resposta API", r);
  } catch (e) {
    console.error("erro pix", e);
  }
  pag = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
  dump("DEPOIS PIX", pag);
} else if (atual === "pix") {
  console.log("--- trocar para CARTAO ---");
  try {
    const r = await alterarFormaPagamentoPedido({
      prisma,
      pedidoId,
      clienteId: cliente!.id,
      contaAzulCustomerId: cliente!.externalId!,
      formaPagamento: "cartao",
    });
    console.log("resposta API", r);
  } catch (e) {
    console.error("erro cartao", e);
  }
  pag = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
  dump("DEPOIS CARTAO", pag);

  console.log("--- trocar de volta para PIX ---");
  try {
    const r = await alterarFormaPagamentoPedido({
      prisma,
      pedidoId,
      clienteId: cliente!.id,
      contaAzulCustomerId: cliente!.externalId!,
      formaPagamento: "pix",
    });
    console.log("resposta API", r);
  } catch (e) {
    console.error("erro pix2", e);
  }
  pag = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
  dump("DEPOIS PIX2", pag);
}

await prisma.$disconnect();
