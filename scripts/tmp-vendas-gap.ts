import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { classificarStatusPedido } from "../server/comercial/lib/pedido-status";
import { diaIsoAmericaSp } from "../shared/comercial/periodo-america-sp";

const prisma = getComercialPrisma();
const pedidos = await prisma.pedido.findMany({
  where: {
    origemPedido: "CONTA_AZUL",
    dataPedido: {
      gte: new Date("2026-08-28T00:00:00-03:00"),
      lte: new Date("2026-10-03T23:59:59.999-03:00"),
    },
  },
  select: {
    numeroVenda: true,
    statusPedido: true,
    dataPedido: true,
    valorLiquido: true,
  },
});

const borda = pedidos
  .map(p => {
    const sp = diaIsoAmericaSp(p.dataPedido);
    const utc = p.dataPedido.toISOString().slice(0, 10);
    return {
      n: p.numeroVenda,
      st: p.statusPedido,
      cls: classificarStatusPedido(p.statusPedido),
      sp,
      utc,
      v: Number(p.valorLiquido ?? 0),
      iso: p.dataPedido.toISOString(),
    };
  })
  .filter(p => p.sp !== p.utc || p.v === 104.5 || Math.abs(p.v - 104.5) < 0.02);

const porStatus = new Map<string, { n: number; v: number }>();
for (const p of pedidos) {
  if (diaIsoAmericaSp(p.dataPedido).slice(0, 7) !== "2026-09") continue;
  const k = `${classificarStatusPedido(p.statusPedido)}|${p.statusPedido}`;
  const a = porStatus.get(k) ?? { n: 0, v: 0 };
  a.n += 1;
  a.v += Number(p.valorLiquido ?? 0);
  porStatus.set(k, a);
}

console.log(
  JSON.stringify(
    {
      porStatus: [...porStatus.entries()].map(([k, a]) => ({
        k,
        n: a.n,
        v: Math.round(a.v * 100) / 100,
      })),
      borda: borda.slice(0, 40),
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
