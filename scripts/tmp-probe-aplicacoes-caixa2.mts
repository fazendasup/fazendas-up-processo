import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

const [count] = await conn.query<any[]>(
  `SELECT COUNT(*) AS n FROM aplicacoes_caixa WHERE projetoId = 1`,
);
console.log("total aplicacoes projeto 1:", count);

const [byProduto] = await conn.query<any[]>(
  `SELECT produto, DATE(CONVERT_TZ(dataHora, '+00:00', 'America/Sao_Paulo')) AS dia, COUNT(*) AS n
   FROM aplicacoes_caixa
   WHERE projetoId = 1 AND dataHora >= '2026-09-01'
   GROUP BY produto, DATE(CONVERT_TZ(dataHora, '+00:00', 'America/Sao_Paulo'))
   ORDER BY dia DESC, produto
   LIMIT 80`,
);
console.log("\nPOR PRODUTO/DIA:", byProduto);

const [tarefasCols] = await conn.query<any[]>(`DESCRIBE tarefas`);
console.log(
  "\nTAREFAS cols:",
  tarefasCols.map((c) => c.Field),
);

const [tarefas] = await conn.query<any[]>(
  `SELECT id, titulo, status, dataVencimento, updatedAt
   FROM tarefas
   WHERE projetoId = 1
     AND (
       titulo LIKE '%Infinito%' OR titulo LIKE '%Thyper%' OR titulo LIKE '%Cercobin%'
       OR titulo LIKE '%Calda%' OR titulo LIKE '%Trich%' OR titulo LIKE '%ciclo%'
     )
   ORDER BY id DESC
   LIMIT 40`,
);
console.log("\nTAREFAS:", tarefas);

await conn.end();
