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
const [caixas] = await conn.query<any[]>(
  `SELECT id FROM caixas_agua WHERE projetoId = ? ORDER BY id`,
  [PROJETO_ID],
);
const ids = (caixas as any[]).map((c) => Number(c.id));

const [thyper] = await conn.query<any[]>(
  `SELECT id FROM ciclos WHERE projetoId = ? AND nome LIKE 'Thyper%' AND ativo = 1 LIMIT 1`,
  [PROJETO_ID],
);
const thyperId = Number((thyper as any[])[0].id);

await conn.query(`UPDATE ciclos SET caixaIds = ?, fasesAplicaveis = ? WHERE id = ?`, [
  JSON.stringify(ids),
  JSON.stringify(["mudas", "vegetativa", "maturacao"]),
  thyperId,
]);

for (const caixaId of ids) {
  await conn.query(
    `INSERT INTO ciclo_caixa_execucoes
       (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda)
     VALUES (?, ?, ?, TIMESTAMP('2026-10-20 15:00:00'), TIMESTAMP('2026-10-23 15:00:00'))
     ON DUPLICATE KEY UPDATE
       ultimaExecucao = VALUES(ultimaExecucao),
       dataAgenda = VALUES(dataAgenda)`,
    [PROJETO_ID, thyperId, caixaId],
  );
}

const [row] = await conn.query<any[]>(`SELECT id, caixaIds FROM ciclos WHERE id = ?`, [thyperId]);
const [n] = await conn.query<any[]>(
  `SELECT COUNT(*) AS n FROM ciclo_caixa_execucoes WHERE cicloId = ?`,
  [thyperId],
);
console.log("thyper", row, "execs", n);
await conn.end();
