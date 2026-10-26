import "dotenv/config";
import mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";

function diaSemanaYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, (m || 1) - 1, d || 1, 12, 0, 0).getDay();
}

async function probe(conn: Connection, label: string) {
  console.log("\n===", label, "===");
  console.log("23/10 diaSemana=", diaSemanaYmd("2026-10-23"), "(5=sexta)");
  console.log("24/10 diaSemana=", diaSemanaYmd("2026-10-24"), "(6=sabado)");

  const [ciclos] = await conn.query<any[]>(
    `SELECT id, projetoId, nome, ativo, frequencia, diasSemana, alvo,
            DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima
     FROM ciclos
     WHERE nome LIKE '%Calda%A%' OR nome = 'Calda A' OR produto LIKE '%Calda A%'
     ORDER BY projetoId, id`,
  );

  for (const c of ciclos as any[]) {
    const [ex] = await conn.query<any[]>(
      `SELECT COUNT(*) n,
              DATE_FORMAT(MIN(ultimaExecucao),'%Y-%m-%d') uMin,
              DATE_FORMAT(MAX(ultimaExecucao),'%Y-%m-%d') uMax,
              DATE_FORMAT(MIN(dataAgenda),'%Y-%m-%d') aMin,
              DATE_FORMAT(MAX(dataAgenda),'%Y-%m-%d') aMax
       FROM ciclo_caixa_execucoes WHERE cicloId = ?`,
      [c.id],
    );
    console.log({
      id: c.id,
      projeto: c.projetoId,
      nome: c.nome,
      ativo: c.ativo,
      freq: c.frequencia,
      dias: c.diasSemana,
      alvo: c.alvo,
      ultima: c.ultima,
      exec: ex[0],
    });
  }
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
    await probe(t.conn, t.label);
  } finally {
    await t.conn.end();
  }
}
