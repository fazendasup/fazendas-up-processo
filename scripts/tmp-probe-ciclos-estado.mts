import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ausente");

const conn = await mysql.createConnection(url);

const [projetos] = await conn.query<any[]>(
  `SELECT id, nome, tipo FROM projetos ORDER BY id`,
);
console.log("PROJETOS", projetos);

for (const p of projetos) {
  console.log("\n======== PROJETO", p.id, p.nome, p.tipo, "========");
  const [caixas] = await conn.query<any[]>(
    `SELECT id, nome, fase FROM caixas_agua WHERE projetoId = ? ORDER BY id`,
    [p.id],
  );
  console.log(
    "CAIXAS",
    caixas.map((c) => ({ id: c.id, nome: c.nome, fase: c.fase })),
  );

  const [ciclos] = await conn.query<any[]>(
    `SELECT id, nome, produto, ativo, alvo, frequencia, intervaloDias, diasSemana, dataInicio, ultimaExecucao, fasesAplicaveis, caixaIds, dosagem
     FROM ciclos WHERE projetoId = ? ORDER BY id`,
    [p.id],
  );
  console.log("\nCICLOS:");
  for (const c of ciclos) {
    console.log({
      id: c.id,
      nome: c.nome,
      produto: c.produto,
      ativo: c.ativo,
      alvo: c.alvo,
      freq: c.frequencia,
      intervalo: c.intervaloDias,
      diasSemana: c.diasSemana,
      inicio: c.dataInicio,
      ultima: c.ultimaExecucao,
      fases: c.fasesAplicaveis,
      caixas: c.caixaIds,
      dosagem: c.dosagem,
    });
  }

  const [execs] = await conn.query<any[]>(
    `SELECT e.id, e.cicloId, e.caixaAguaId, e.ultimaExecucao, e.dataAgenda, c.nome AS cicloNome, x.nome AS caixaNome, x.fase
     FROM ciclo_caixa_execucoes e
     JOIN ciclos c ON c.id = e.cicloId AND c.projetoId = e.projetoId
     LEFT JOIN caixas_agua x ON x.id = e.caixaAguaId AND x.projetoId = e.projetoId
     WHERE e.projetoId = ?
     ORDER BY c.nome, x.fase, e.caixaAguaId`,
    [p.id],
  );
  console.log("\nEXECUÇÕES POR CAIXA:");
  for (const e of execs) {
    console.log({
      ciclo: e.cicloNome,
      cicloId: e.cicloId,
      caixa: e.caixaNome,
      fase: e.fase,
      ultima: e.ultimaExecucao,
      agenda: e.dataAgenda,
    });
  }
}

await conn.end();
