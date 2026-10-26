import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

const [projetos] = await conn.query<any[]>(
  `SELECT p.id, p.nome, p.tipo, p.status,
    (SELECT COUNT(*) FROM torres t WHERE t.projetoId = p.id) AS torres,
    (SELECT COUNT(*) FROM caixas_agua c WHERE c.projetoId = p.id) AS caixas,
    (SELECT COUNT(*) FROM ciclos c WHERE c.projetoId = p.id AND c.ativo = 1) AS ciclosAtivos,
    (SELECT COUNT(*) FROM ciclo_caixa_execucoes e WHERE e.projetoId = p.id) AS execs
   FROM projetos p
   WHERE p.tipo = 'fazenda_vertical' AND p.status = 'ativo'
   ORDER BY p.id`,
);
console.log("PROJETOS FV ATIVOS:");
for (const p of projetos) console.log(p);

for (const p of projetos.filter((x) => x.ciclosAtivos > 0)) {
  console.log(`\n==== Projeto ${p.id} ${p.nome} ====`);
  const [ciclos] = await conn.query<any[]>(
    `SELECT id, nome, ativo, frequencia, intervaloDias, ultimaExecucao, dataInicio, caixaIds
     FROM ciclos WHERE projetoId = ? AND ativo = 1 ORDER BY nome`,
    [p.id],
  );
  for (const c of ciclos) {
    const [ex] = await conn.query<any[]>(
      `SELECT COUNT(*) n,
        MIN(ultimaExecucao) uMin, MAX(ultimaExecucao) uMax,
        MIN(dataAgenda) aMin, MAX(dataAgenda) aMax
       FROM ciclo_caixa_execucoes WHERE cicloId = ?`,
      [c.id],
    );
    console.log({
      id: c.id,
      nome: c.nome,
      freq: c.frequencia,
      int: c.intervaloDias,
      ultima: c.ultimaExecucao,
      inicio: c.dataInicio,
      caixas: typeof c.caixaIds === "string" ? c.caixaIds.slice(0, 80) : c.caixaIds,
      exec: ex[0],
    });
  }
}

// cookie / users recent project?
const [users] = await conn.query<any[]>(
  `SHOW COLUMNS FROM users LIKE '%projeto%'`,
).catch(() => [[]]);
console.log("\nuser projeto cols", users);

await conn.end();
