import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const [rows] = await conn.query<any[]>(
  `SELECT id, nome, ativo FROM ciclos
   WHERE projetoId = 1 AND (LOWER(nome) = 'bio' OR LOWER(produto) = 'bio')`,
);
console.log("antes", rows);

for (const r of rows) {
  await conn.query(`UPDATE ciclos SET ativo = 0 WHERE id = ? AND projetoId = 1`, [r.id]);
  await conn.query(
    `UPDATE ciclo_caixa_execucoes SET dataAgenda = NULL WHERE cicloId = ? AND projetoId = 1`,
    [r.id],
  );
}

const [depois] = await conn.query<any[]>(
  `SELECT id, nome, ativo FROM ciclos
   WHERE projetoId = 1 AND (LOWER(nome) = 'bio' OR LOWER(produto) = 'bio')`,
);
console.log("depois", depois);
await conn.end();
