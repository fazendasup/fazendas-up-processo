import "dotenv/config";
import mysql from "mysql2/promise";

const comercial = process.env.COMERCIAL_DATABASE_URL!;
const u = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const conn = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: "railway",
});

const PROJETO_ID = 2;
const [mudas] = await conn.query<any[]>(
  `SELECT id FROM caixas_agua WHERE projetoId = ? AND fase = 'mudas' ORDER BY id`,
  [PROJETO_ID],
);
const ids = (mudas as any[]).map((c) => Number(c.id));
const [tri] = await conn.query<any[]>(
  `SELECT id FROM ciclos WHERE projetoId = ? AND nome LIKE '%Trichoderma%' AND ativo = 1 LIMIT 1`,
  [PROJETO_ID],
);
if (!(tri as any[])[0]) {
  console.log("sem trichoderma ativo");
  await conn.end();
  process.exit(0);
}
const id = Number((tri as any[])[0].id);
await conn.query(`UPDATE ciclos SET caixaIds = ?, fasesAplicaveis = ? WHERE id = ?`, [
  JSON.stringify(ids),
  JSON.stringify(["mudas"]),
  id,
]);
console.log("trichoderma caixas", ids);
await conn.end();
