import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

const [cols] = await conn.query<any[]>(`DESCRIBE aplicacoes_caixa`);
console.log("COLS aplicacoes_caixa", cols.map((c) => c.Field));

const [recent] = await conn.query<any[]>(
  `SELECT a.*, x.nome AS caixaNome, x.fase
   FROM aplicacoes_caixa a
   LEFT JOIN caixas_agua x ON x.id = a.caixaAguaId
   WHERE a.projetoId = 1
     AND a.createdAt >= '2026-10-01'
   ORDER BY a.createdAt DESC
   LIMIT 80`,
).catch(async (e) => {
  console.log("query1 fail", e.message);
  const [r] = await conn.query<any[]>(
    `SELECT * FROM aplicacoes_caixa WHERE projetoId = 1 ORDER BY id DESC LIMIT 30`,
  );
  return [r];
});
console.log("RECENT aplicacoes_caixa (sample):");
for (const r of recent.slice(0, 40)) {
  console.log(r);
}

const [byProduto] = await conn.query<any[]>(
  `SELECT produto, DATE(dataAplicacao) AS dia, COUNT(*) AS n
   FROM aplicacoes_caixa
   WHERE projetoId = 1 AND dataAplicacao >= '2026-10-01'
   GROUP BY produto, DATE(dataAplicacao)
   ORDER BY dia DESC, produto`,
).catch(async (e) => {
  console.log("byProduto fail", e.message);
  const [cols2] = await conn.query<any[]>(`SHOW COLUMNS FROM aplicacoes_caixa`);
  console.log(cols2);
  return [[] as any[]];
});
console.log("\nPOR PRODUTO/DIA out/2026:", byProduto);

await conn.end();
