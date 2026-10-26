/**
 * Auditoria completa do cliente Adson: pedidos, pagamentos locais, títulos CA.
 */
import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { extratoReceberClienteCa } from "../server/comercial/lib/cliente-inadimplencia-ca.ts";
import { formaPagamentoDoRegistro } from "../server/portal/portalPagamento.ts";
import { todayYmd, addCalendarDays } from "../server/portal/portalCalendario.ts";

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
  include: { portalAcesso: true, portalConta: true },
});
if (!cliente?.externalId) {
  console.error("cliente não encontrado");
  process.exit(1);
}

console.log("=== CLIENTE ===");
console.log({
  id: cliente.id,
  nome: cliente.nome,
  externalId: cliente.externalId,
  cpf: cliente.cnpjCpf,
  email: cliente.portalAcesso?.email,
  telefone: cliente.telefoneWhatsapp,
  perfil: cliente.portalAcesso?.perfil,
  endereco: cliente.portalConta
    ? `${cliente.portalConta.logradouro}, ${cliente.portalConta.numero} - ${cliente.portalConta.bairro}`
    : null,
});

const pedidos = await prisma.pedidoOperacional.findMany({
  where: { clienteId: cliente.id },
  orderBy: { criadoEm: "desc" },
  take: 30,
  include: { itens: true },
});
const pags = await prisma.portalPedidoPagamento.findMany({
  where: { pedidoId: { in: pedidos.map((p) => p.id) } },
});
const pagMap = new Map(pags.map((p) => [p.pedidoId, p]));

console.log("\n=== PEDIDOS LOCAIS ===");
for (const p of pedidos) {
  const pag = pagMap.get(p.id);
  console.log({
    id: p.id.slice(-8),
    status: p.status,
    entrega: p.dataEntrega,
    obs: (p.observacoes ?? "").includes("Cancelado") ? "cancelado-obs" : (p.observacoes ?? "").slice(0, 40),
    itens: p.itens.map((i) => `${i.quantidade}x ${Number(i.precoUnit)}`).join(", "),
    pag: pag
      ? {
          status: pag.status,
          total: Number(pag.total),
          forma: formaPagamentoDoRegistro(pag),
          parcela: pag.parcelaId,
        }
      : null,
  });
}

const hoje = todayYmd();
const extrato = await extratoReceberClienteCa({
  contaAzulCustomerId: cliente.externalId,
  dataInicio: addCalendarDays(hoje, -180),
  dataFim: addCalendarDays(hoje, 90),
});

const parcelasAtivasPortal = new Set(
  pags
    .filter((p) => p.status === "AGUARDANDO" || p.status === "PAGO")
    .map((p) => p.parcelaId)
    .filter(Boolean) as string[],
);
const parcelasQualquerPortal = new Set(pags.map((p) => p.parcelaId).filter(Boolean) as string[]);

console.log("\n=== TITULOS CONTA AZUL (em aberto) ===");
const abertos = extrato.titulos.filter((t) => t.valorAberto > 0.009 && !/PERDIDO|CANCELADO|QUITADO/i.test(t.status));
for (const t of abertos) {
  const noPortalAtivo = parcelasAtivasPortal.has(t.id);
  const noPortalQualquer = parcelasQualquerPortal.has(t.id);
  const pagRel = pags.find((p) => p.parcelaId === t.id);
  console.log({
    id: t.id.slice(0, 8),
    valor: t.valorAberto,
    status: t.status,
    venc: t.dataVencimento,
    desc: t.descricao,
    noPortalAtivo,
    noPortalQualquer,
    pagLocalStatus: pagRel?.status ?? "sem-registro",
    orfao: !noPortalAtivo,
  });
}

console.log("\n=== RESUMO ===");
console.log({
  pedidosAtivos: pedidos.filter((p) => p.status !== "CANCELADO").length,
  pagamentosAguardando: pags.filter((p) => p.status === "AGUARDANDO").length,
  titulosAbertosCA: abertos.length,
  orfaosAbertos: abertos.filter((t) => !parcelasAtivasPortal.has(t.id)).length,
  totaisExtrato: extrato.totais,
});

await prisma.$disconnect();
