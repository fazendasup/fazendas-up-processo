import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

const [match] = await conn.query<any[]>(
  `SELECT id, nome, produto, ativo, frequencia, intervaloDias, dataInicio, ultimaExecucao, fasesAplicaveis, caixaIds
   FROM ciclos
   WHERE projetoId = 1
     AND (
       nome LIKE '%Thyper%' OR produto LIKE '%Thyper%' OR nome LIKE '%S-50%'
       OR nome LIKE '%Trich%' OR produto LIKE '%Trich%' OR nome LIKE '%Preven%'
     )`,
);
console.log("MATCH Thyper/Trichoderma:", match);

const [tables] = await conn.query<any[]>(`SHOW TABLES`);
const nomes = tables.map((t) => Object.values(t)[0]);
console.log(
  "TABLES relevantes:",
  nomes.filter(
    (n) =>
      String(n).includes("aplic") ||
      String(n).includes("histor") ||
      String(n).includes("ciclo") ||
      String(n).includes("tarefa"),
  ),
);

const [tarefas] = await conn.query<any[]>(
  `SELECT id, titulo, status, dataVencimento, concluidaEm, createdAt
   FROM tarefas
   WHERE projetoId = 1
     AND (
       titulo LIKE '%Infinito%' OR titulo LIKE '%Thyper%' OR titulo LIKE '%Cercobin%'
       OR titulo LIKE '%Calda%' OR titulo LIKE '%Trich%'
     )
   ORDER BY id DESC
   LIMIT 40`,
).catch((e) => {
  console.log("tarefas erro", e.message);
  return [[] as any[]];
});
console.log("TAREFAS relacionadas:", tarefas);

await conn.end();
