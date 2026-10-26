import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
await conn.query(
  `UPDATE ciclos SET diasSemana = ?, dataInicio = TIMESTAMP('2026-10-09 15:00:00')
   WHERE nome = 'Calda A' AND projetoId = 1`,
  [JSON.stringify([5])],
);
await conn.query(
  `UPDATE ciclos SET diasSemana = ? WHERE nome = 'Calda B' AND projetoId = 1`,
  [JSON.stringify([1])],
);
const [rows] = await conn.query<any[]>(
  `SELECT id, nome, diasSemana, DATE_FORMAT(dataInicio,'%Y-%m-%d') inicio
   FROM ciclos WHERE nome LIKE 'Calda%' AND projetoId = 1`,
);
console.log(rows);
await conn.end();
