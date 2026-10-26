import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
await conn.query(`UPDATE ciclos SET ativo = 0 WHERE id = 68 AND nome LIKE 'Thyper%'`);
const [rows] = await conn.query<any[]>(
  `SELECT id, nome, ativo FROM ciclos WHERE nome LIKE 'Thyper%' ORDER BY id`,
);
console.log(rows);
await conn.end();
