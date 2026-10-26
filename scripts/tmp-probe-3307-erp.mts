import mysql from "mysql2/promise";

// compose antigo em 3307 — será o ERP “real” que a UI usa?
const urls = [
  "mysql://fazendas:fazendas_dev@127.0.0.1:3307/fazendas_up",
  "mysql://root:root_local_only@127.0.0.1:3307/fazendas_up",
  "mysql://fazendas:fazendas_dev@127.0.0.1:3306/fazendas_up",
];

for (const url of urls) {
  try {
    const conn = await mysql.createConnection(url);
    const [p] = await conn.query<any[]>(
      `SELECT COUNT(*) n FROM ciclos WHERE ativo=1`,
    );
    const [t] = await conn.query<any[]>(
      `SELECT id, nome FROM ciclos WHERE nome LIKE '%Thyper%'`,
    );
    console.log("OK", url.replace(/\/\/[^@]+@/, "//***@"), "ativos", p[0], "thyper", t);
    await conn.end();
  } catch (e: any) {
    console.log("FAIL", url.replace(/\/\/[^@]+@/, "//***@"), e.code || e.message);
  }
}
