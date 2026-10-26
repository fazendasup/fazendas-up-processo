import { PrismaClient } from "../server/comercial/generated/prisma/index.js";

const p = new PrismaClient();
const total = await p.pedidoOperacional.count();
const byStatus = await p.pedidoOperacional.groupBy({
  by: ["status"],
  _count: true,
});
const minMax = await p.pedidoOperacional.aggregate({
  _min: { dataEntrega: true, criadoEm: true },
  _max: { dataEntrega: true, atualizadoEm: true },
});
const recent = await p.pedidoOperacional.findMany({
  orderBy: { atualizadoEm: "desc" },
  take: 8,
  select: {
    id: true,
    status: true,
    dataEntrega: true,
    atualizadoEm: true,
    statusEnvioContaAzul: true,
    cliente: { select: { nome: true } },
  },
});
const ca = await p.pedido.count();
const caOrc = await p.pedido.count({
  where: { statusPedido: { contains: "ORCAMENTO" } },
});
const exec = await p.execucaoApi.findMany({
  orderBy: { dataExecucao: "desc" },
  take: 8,
  select: {
    acaoApi: true,
    statusExecucao: true,
    dataExecucao: true,
    mensagemErro: true,
    detalhesExecucao: true,
  },
});
console.log(
  JSON.stringify(
    { totalOp: total, byStatus, minMax, recent, totalCa: ca, caOrc, exec },
    null,
    2,
  ),
);
await p.$disconnect();
