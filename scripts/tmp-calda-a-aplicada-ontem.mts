/**
 * Marca Calda A como aplicada na sexta 2026-10-23 (alvo andar = ultimaExecucao no ciclo).
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";

const APLICADO_YMD = "2026-10-23";
const aplicadoTs = `${APLICADO_YMD} 15:00:00`;

async function marcar(conn: Connection, label: string) {
  console.log(`\n=== ${label} ===`);
  const [ciclos] = await conn.query<any[]>(
    `SELECT id, projetoId, nome, ativo, diasSemana,
            DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima
     FROM ciclos
     WHERE ativo = 1 AND (nome = 'Calda A' OR nome LIKE 'Calda A %')
     ORDER BY projetoId, id`,
  );

  for (const c of ciclos as any[]) {
    await conn.query(
      `UPDATE ciclos SET
         frequencia = 'semanal',
         diasSemana = ?,
         alvo = 'andar',
         ultimaExecucao = TIMESTAMP(?),
         ultimoExecutorNome = 'Registro pós-aplicação (sexta)'
       WHERE id = ?`,
      [JSON.stringify([5]), aplicadoTs, c.id],
    );
    console.log({
      id: c.id,
      projeto: c.projetoId,
      nome: c.nome,
      antes: c.ultima,
      depois: APLICADO_YMD,
    });
  }
  if (!(ciclos as any[]).length) console.log("nenhuma Calda A ativa");
}

const targets: Array<{ label: string; conn: Connection }> = [];
if (process.env.DATABASE_URL) {
  targets.push({
    label: "DATABASE_URL",
    conn: await mysql.createConnection(process.env.DATABASE_URL),
  });
}
if (process.env.COMERCIAL_DATABASE_URL) {
  const u = new URL(
    process.env.COMERCIAL_DATABASE_URL.replace(/^mysql:\/\//, "http://"),
  );
  targets.push({
    label: "railway",
    conn: await mysql.createConnection({
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: "railway",
    }),
  });
}

for (const t of targets) {
  try {
    await marcar(t.conn, t.label);
  } finally {
    await t.conn.end();
  }
}

console.log(`\nOK — Calda A marcada em ${APLICADO_YMD}; próxima sexta 30/10`);
