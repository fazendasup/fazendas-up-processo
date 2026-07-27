/**
 * Diagnóstico de espaço no MySQL comercial.
 * Uso: tsx server/run-diagnostico-espaco-comercial.ts
 */
import "dotenv/config";
import { getComercialPrisma } from "./comercial/db.js";

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const prisma = getComercialPrisma();
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT table_name AS t,
            table_rows AS r,
            ROUND(data_length/1024/1024,2) AS data_mb,
            ROUND(index_length/1024/1024,2) AS idx_mb,
            ROUND((data_length+index_length)/1024/1024,2) AS total_mb
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY (data_length+index_length) DESC
     LIMIT 20`,
  );
  const pretty = rows.map((row) => ({
    t: String(row.t),
    r: num(row.r),
    data_mb: num(row.data_mb),
    idx_mb: num(row.idx_mb),
    total_mb: num(row.total_mb),
  }));
  console.log(JSON.stringify(pretty, null, 2));
  console.log(
    JSON.stringify(
      {
        itens: await prisma.pedidoOperacionalItem.count(),
        pedidos: await prisma.pedidoOperacional.count(),
        eventos: await prisma.pedidoConciliacaoEvento.count(),
        auditoria: await prisma.pedidoOperacionalAuditoria.count(),
        itensPedidoCa: await prisma.itemPedido.count(),
        pedidosCa: await prisma.pedido.count(),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await getComercialPrisma().$disconnect();
  });
