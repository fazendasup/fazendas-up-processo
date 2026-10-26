const { PrismaClient } = require("./server/comercial/generated/prisma");
const p = new PrismaClient();
(async () => {
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
      contaAzulCustomerId: true,
      atualizadoEm: true,
      statusEnvioContaAzul: true,
      cliente: { select: { nome: true } },
    },
  });
  const ca = await p.pedido.count();
  const exec = await p.execucaoApi.findMany({
    orderBy: { dataExecucao: "desc" },
    take: 5,
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
      { totalOp: total, byStatus, minMax, recent, totalCa: ca, exec },
      null,
      2,
    ),
  );
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
