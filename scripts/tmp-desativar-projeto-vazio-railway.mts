import "dotenv/config";
import mysql from "mysql2/promise";

/** Desativa projeto piloto hidroponia vazio (sem torres/caixas/ciclos). */
const comercial = process.env.COMERCIAL_DATABASE_URL!;
const u = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const c = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: "railway",
});

const ID = 5;
const [[row]] = await c.query<any[]>(
  `SELECT id, nome, status,
    (SELECT COUNT(*) FROM torres WHERE projetoId = ?) torres,
    (SELECT COUNT(*) FROM caixas_agua WHERE projetoId = ?) caixas,
    (SELECT COUNT(*) FROM ciclos WHERE projetoId = ?) ciclos
   FROM projetos WHERE id = ?`,
  [ID, ID, ID, ID],
);
console.log("antes", row);
if (!row || row.torres > 0 || row.caixas > 0 || row.ciclos > 0) {
  console.log("abort: projeto não está vazio");
  await c.end();
  process.exit(1);
}
await c.query(`UPDATE projetos SET status = 'inativo' WHERE id = ?`, [ID]);
const [[depois]] = await c.query<any[]>(`SELECT id, nome, status FROM projetos WHERE id = ?`, [ID]);
console.log("depois", depois);
await c.end();
