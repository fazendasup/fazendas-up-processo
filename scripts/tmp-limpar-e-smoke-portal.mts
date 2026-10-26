/**
 * 1) Limpa órfãs Conta Azul do Adson + alinha pedido cancelado.
 * 2) Smoke das regras financeiras PF (totais).
 */
import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { extratoReceberClienteCa } from "../server/comercial/lib/cliente-inadimplencia-ca.ts";
import { addCalendarDays, todayYmd } from "../server/portal/portalCalendario.ts";
import {
  alinharPagamentoPedidoCancelado,
  encerrarParcelasOrfasCa,
  idsParcelasPortalAtivas,
  totalCobrancaPessoa,
  resolverBaseCobrancaPessoa,
} from "../server/portal/portalPagamento.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
if (!cliente?.externalId) throw new Error("cliente");

const cancelados = await prisma.pedidoOperacional.findMany({
  where: { clienteId: cliente.id, status: "CANCELADO" },
  select: { id: true },
});
for (const p of cancelados) {
  await alinharPagamentoPedidoCancelado(prisma, p.id);
  console.log("alinhado cancelado", p.id.slice(-8));
}

const hoje = todayYmd();
const extrato = await extratoReceberClienteCa({
  contaAzulCustomerId: cliente.externalId,
  dataInicio: addCalendarDays(hoje, -180),
  dataFim: addCalendarDays(hoje, 90),
});
const ativas = await idsParcelasPortalAtivas(prisma, cliente.id, cliente.externalId);
const orfas = extrato.titulos
  .filter((t) => t.valorAberto > 0.009 && !/PERDIDO|CANCELADO|QUITADO/i.test(t.status))
  .filter((t) => !ativas.has(t.id))
  .map((t) => t.id);
console.log("órfãs a encerrar", orfas.length, [...ativas]);
const n = await encerrarParcelasOrfasCa(prisma, orfas);
console.log("perda OK", n);

const extrato2 = await extratoReceberClienteCa({
  contaAzulCustomerId: cliente.externalId,
  dataInicio: addCalendarDays(hoje, -180),
  dataFim: addCalendarDays(hoje, 90),
});
const abertosVisiveis = extrato2.titulos.filter(
  (t) => t.valorAberto > 0.009 && !/PERDIDO|CANCELADO/i.test(t.status) && ativas.has(t.id),
);
console.log(
  "abertos visíveis PF",
  abertosVisiveis.map((t) => ({ id: t.id.slice(0, 8), valor: t.valorAberto })),
);

// Smoke regras de taxa
const base = resolverBaseCobrancaPessoa({
  itens: [
    { precoUnit: 7.59, quantidade: 1 },
    { precoUnit: 5.2, quantidade: 1 },
  ],
  totalCobradoAtual: 13.43,
  formaAnterior: "cartao",
});
console.assert(base === 12.79, "base");
console.assert(totalCobrancaPessoa(base, "pix") === 12.79, "pix");
console.assert(totalCobrancaPessoa(base, "cartao") === 13.43, "cartao");
console.log("SMOKE TAXA OK");

await prisma.$disconnect();
