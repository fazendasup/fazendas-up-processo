import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  port: 3307,
  user: "fazendas",
  password: "fazendas_dev",
  database: "fazendas_comercial",
});

const [[tot]] = await conn.query("SELECT COUNT(*) AS c FROM pedidos_operacionais");
const [byStatus] = await conn.query(
  "SELECT status, COUNT(*) AS c FROM pedidos_operacionais GROUP BY status",
);
const [[range]] = await conn.query(
  "SELECT MIN(data_entrega) AS minD, MAX(data_entrega) AS maxD, MAX(atualizado_em) AS maxUpd FROM pedidos_operacionais",
);
const [recent] = await conn.query(
  `SELECT p.id, p.status, p.data_entrega, p.atualizado_em, c.nome
   FROM pedidos_operacionais p
   LEFT JOIN clientes c ON c.id = p.cliente_id
   ORDER BY p.atualizado_em DESC LIMIT 10`,
);
const [cols] = await conn.query(
  "SHOW COLUMNS FROM pedidos_operacionais LIKE 'status_envio%'",
);
const [migs] = await conn.query(
  "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5",
);

console.log(
  JSON.stringify(
    { tot, byStatus, range, recent, cols, migs },
    (_, v) => (typeof v === "bigint" ? Number(v) : v),
    2,
  ),
);
await conn.end();
