/**
 * Analisa o que pesa no MySQL comercial (tamanhos + contagens).
 * Uso: tsx server/run-analise-peso-comercial.ts
 */
import "dotenv/config";
import { getComercialPrisma } from "./comercial/db.js";

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const raw = process.env.COMERCIAL_DATABASE_URL ?? "";
  let host = "?";
  let database = "?";
  try {
    const u = new URL(raw.replace(/^mysql:\/\//i, "http://"));
    host = u.hostname;
    database = decodeURIComponent(u.pathname.replace(/^\//, "").split("?")[0] ?? "");
  } catch {
    /* ignore */
  }

  const prisma = getComercialPrisma();

  const tables = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT table_name AS t,
            table_rows AS r,
            ROUND(data_length/1024/1024, 2) AS data_mb,
            ROUND(index_length/1024/1024, 2) AS idx_mb,
            ROUND((data_length+index_length)/1024/1024, 2) AS total_mb,
            ROUND(data_free/1024/1024, 2) AS free_mb,
            engine
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY (data_length+index_length) DESC`,
  );

  const pretty = tables.map((row) => ({
    tabela: String(row.t),
    linhas_aprox: num(row.r),
    data_mb: num(row.data_mb),
    idx_mb: num(row.idx_mb),
    total_mb: num(row.total_mb),
    livre_mb: num(row.free_mb),
    engine: String(row.engine ?? ""),
  }));

  const totalMb = pretty.reduce((s, t) => s + t.total_mb, 0);

  const counts = {
    pedidos_operacionais: await prisma.pedidoOperacional.count(),
    pedidos_operacionais_itens: await prisma.pedidoOperacionalItem.count(),
    pedidos_operacionais_auditoria: await prisma.pedidoOperacionalAuditoria.count(),
    pedidos_conciliacao_eventos: await prisma.pedidoConciliacaoEvento.count(),
    execucoes_api: await prisma.execucaoApi.count(),
    pedidos_conta_azul: await prisma.pedido.count(),
    itens_pedido_ca: await prisma.itemPedido.count(),
    clientes: await prisma.cliente.count(),
    produtos: await prisma.produtoComercial.count(),
  };

  const comSnapshot = await prisma.pedidoOperacional.count({
    where: { snapshotConciliacao: { not: null as unknown as undefined } },
  }).catch(async () => {
    const r = await prisma.$queryRawUnsafe<Array<{ c: unknown }>>(
      `SELECT COUNT(*) AS c FROM pedidos_operacionais WHERE snapshot_conciliacao IS NOT NULL`,
    );
    return num(r[0]?.c);
  });

  let schemaMb: number | null = null;
  try {
    const schema = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ROUND(SUM(data_length+index_length)/1024/1024, 2) AS total_mb,
              ROUND(SUM(data_free)/1024/1024, 2) AS free_mb
       FROM information_schema.tables
       WHERE table_schema = DATABASE()`,
    );
    schemaMb = num(schema[0]?.total_mb);
  } catch {
    /* ignore */
  }

  console.log(
    JSON.stringify(
      {
        conexao: { host, database },
        total_schema_mb: schemaMb ?? totalMb,
        contagens: { ...counts, pedidos_com_snapshot: comSnapshot },
        top_tabelas: pretty.slice(0, 25),
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
