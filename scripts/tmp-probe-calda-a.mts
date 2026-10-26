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

const hoje = new Date();
console.log("agora local", hoje.toString());
console.log("getDay", hoje.getDay(), "(0=dom … 5=sex)");

const [rows] = await conn.query<any[]>(
  `SELECT id, nome, ativo, frequencia, diasSemana, intervaloDias, alvo,
          DATE_FORMAT(dataInicio,'%Y-%m-%d') inicio,
          DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima,
          caixaIds
   FROM ciclos
   WHERE projetoId = 2 AND (nome LIKE 'Calda%' OR nome LIKE 'Thyper%')
   ORDER BY nome`,
);
console.log("ciclos", rows);

for (const c of rows as any[]) {
  const ciclo: CicloAplicacao = {
    id: `c-${c.id}`,
    nome: c.nome,
    frequencia: c.frequencia,
    diasSemana: typeof c.diasSemana === "string" ? JSON.parse(c.diasSemana) : c.diasSemana,
    intervaloDias: c.intervaloDias ?? undefined,
    produto: c.nome,
    tipo: "Foliar",
    fasesAplicaveis: ["mudas", "vegetativa", "maturacao"],
    alvo: c.alvo || "andar",
    caixaIds: [],
    dataInicio: c.inicio ?? undefined,
    ultimaExecucao: c.ultima ?? undefined,
    ativo: Boolean(c.ativo),
  };
  console.log(c.nome, {
    diasSemana: ciclo.diasSemana,
    inicio: ciclo.dataInicio,
    ultima: ciclo.ultimaExecucao,
    pendente: cicloPendenteNoProtocolo(ciclo, [ciclo], hoje),
  });
}

await conn.end();
