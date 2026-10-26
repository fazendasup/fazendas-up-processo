/**
 * Calda A = sexta (5); Calda B = segunda (1).
 * Produção tinha Calda A em segunda + dataInicio futura (16/11), o que a escondia.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { cicloPendenteNoProtocolo } from "../client/src/lib/utils-farm";
import type { CicloAplicacao } from "../client/src/lib/types";

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

await conn.query(
  `UPDATE ciclos SET
     frequencia = 'semanal',
     diasSemana = ?,
     dataInicio = TIMESTAMP('2026-10-09 15:00:00'),
     alvo = 'andar',
     ativo = 1
   WHERE projetoId = ? AND nome = 'Calda A'`,
  [JSON.stringify([5]), PROJETO_ID],
);

await conn.query(
  `UPDATE ciclos SET
     frequencia = 'semanal',
     diasSemana = ?,
     alvo = 'andar',
     ativo = 1
   WHERE projetoId = ? AND nome = 'Calda B'`,
  [JSON.stringify([1]), PROJETO_ID],
);

// Desativa Thyper duplicado se o principal já tem execução
const [thyper] = await conn.query<any[]>(
  `SELECT id, DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima
   FROM ciclos WHERE projetoId = ? AND nome LIKE 'Thyper%' AND ativo = 1
   ORDER BY id`,
  [PROJETO_ID],
);
console.log("thyper antes", thyper);
if ((thyper as any[]).length > 1) {
  const principal = (thyper as any[])[0];
  for (const extra of (thyper as any[]).slice(1)) {
    await conn.query(`UPDATE ciclos SET ativo = 0 WHERE id = ?`, [extra.id]);
    console.log("desativado thyper dup", extra.id);
  }
  // Se o principal ainda não foi feito hoje e o dup tinha inicio hoje, ok
  void principal;
}

const [caldas] = await conn.query<any[]>(
  `SELECT id, nome, diasSemana,
          DATE_FORMAT(dataInicio,'%Y-%m-%d') inicio,
          DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima, ativo
   FROM ciclos WHERE projetoId = ? AND nome LIKE 'Calda%'`,
  [PROJETO_ID],
);
console.log("caldas depois", caldas);

const hoje = new Date();
for (const c of caldas as any[]) {
  const ciclo: CicloAplicacao = {
    id: `c-${c.id}`,
    nome: c.nome,
    frequencia: "semanal",
    diasSemana: typeof c.diasSemana === "string" ? JSON.parse(c.diasSemana) : c.diasSemana,
    produto: c.nome,
    tipo: "Foliar",
    fasesAplicaveis: ["mudas", "vegetativa", "maturacao"],
    alvo: "andar",
    dataInicio: c.inicio ?? undefined,
    ultimaExecucao: c.ultima ?? undefined,
    ativo: Boolean(c.ativo),
  };
  console.log(c.nome, "pendente hoje?", cicloPendenteNoProtocolo(ciclo, [ciclo], hoje));
}

await conn.end();
