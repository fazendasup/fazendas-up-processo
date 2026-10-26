import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

for (const table of ["aplicacoes_andar", "aplicacoes_bancada"]) {
  const [cols] = await conn.query<any[]>(`DESCRIBE ${table}`);
  console.log("\n", table, cols.map((c) => c.Field));
  const [n] = await conn.query<any[]>(`SELECT COUNT(*) AS n FROM ${table} WHERE projetoId = 1`);
  console.log("count", n);
  const [rows] = await conn.query<any[]>(
    `SELECT * FROM ${table} WHERE projetoId = 1 AND dataHora >= '2026-10-01' ORDER BY dataHora DESC LIMIT 40`,
  ).catch(async () => {
    const [r] = await conn.query<any[]>(
      `SELECT * FROM ${table} WHERE projetoId = 1 ORDER BY id DESC LIMIT 20`,
    );
    return [r];
  });
  console.log(rows);
}

await conn.end();
