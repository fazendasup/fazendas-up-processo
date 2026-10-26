import mysql from "mysql2/promise";

async function probe(label, port, database) {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port,
    user: "fazendas",
    password: "fazendas_dev",
    database,
  });
  try {
    const [[db]] = await conn.query("SELECT DATABASE() AS d");
    let op = null;
    let ca = null;
    let cli = null;
    try {
      [[op]] = await conn.query("SELECT COUNT(*) AS c FROM pedidos_operacionais");
    } catch (e) {
      op = { c: `err: ${e.message}` };
    }
    try {
      [[ca]] = await conn.query("SELECT COUNT(*) AS c FROM pedidos");
    } catch (e) {
      ca = { c: `err: ${e.message}` };
    }
    try {
      [[cli]] = await conn.query("SELECT COUNT(*) AS c FROM clientes");
    } catch (e) {
      cli = { c: `err: ${e.message}` };
    }
    console.log(JSON.stringify({ label, port, database, db: db.d, op, ca, cli }, null, 2));
  } finally {
    await conn.end();
  }
}

const targets = [
  ["compose-3306-up", 3306, "fazendas_up"],
  ["compose-3306-comercial", 3306, "fazendas_comercial"],
  ["fazendas-up-mysql-3307-up", 3307, "fazendas_up"],
  ["fazendas-up-mysql-3307-comercial", 3307, "fazendas_comercial"],
];

for (const t of targets) {
  try {
    await probe(...t);
  } catch (e) {
    console.log(JSON.stringify({ label: t[0], error: e.message }, null, 2));
  }
}
