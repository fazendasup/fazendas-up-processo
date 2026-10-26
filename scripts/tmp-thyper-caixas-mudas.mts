import "dotenv/config";
import mysql from "mysql2/promise";
import { instanteMeioDia } from "../shared/cicloSequencia.ts";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const peroxCaixas = [
  95, 104, 105, 106, 96, 97, 98, 99, 100, 101, 102, 103, 91, 107, 108, 109, 110, 92, 93, 94,
];
const ultima = instanteMeioDia("2026-10-20");

await conn.query(
  `UPDATE ciclos
   SET caixaIds = ?, fasesAplicaveis = ?, dosagem = ?
   WHERE id = 66 AND projetoId = 1`,
  [
    JSON.stringify(peroxCaixas),
    JSON.stringify(["mudas", "vegetativa", "maturacao"]),
    "Substitui o peróxido. A cada 2 dias. Conforme SOP.",
  ],
);

for (const caixaId of [91, 107, 108, 109, 110]) {
  const [ex] = await conn.query<any[]>(
    `SELECT id FROM ciclo_caixa_execucoes WHERE cicloId = 66 AND caixaAguaId = ?`,
    [caixaId],
  );
  if (ex[0]) {
    await conn.query(
      `UPDATE ciclo_caixa_execucoes SET ultimaExecucao = ?, dataAgenda = NULL WHERE id = ?`,
      [ultima, ex[0].id],
    );
  } else {
    await conn.query(
      `INSERT INTO ciclo_caixa_execucoes
        (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda, executorNome)
       VALUES (1, 66, ?, ?, NULL, 'Correção agenda')`,
      [caixaId, ultima],
    );
  }
}

const [c] = await conn.query<any[]>(
  `SELECT id, nome, ativo, frequencia, intervaloDias, fasesAplicaveis, caixaIds, dosagem
   FROM ciclos WHERE id = 66`,
);
const [n] = await conn.query<any[]>(
  `SELECT COUNT(*) AS n FROM ciclo_caixa_execucoes WHERE cicloId = 66`,
);
console.log(c[0]);
console.log("execs", n[0]);
await conn.end();
