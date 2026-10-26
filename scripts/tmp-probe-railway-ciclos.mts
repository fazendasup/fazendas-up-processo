import "dotenv/config";
import mysql from "mysql2/promise";

const comercial = process.env.COMERCIAL_DATABASE_URL!;
const u = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const conn = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: "railway",
});

const [colsCiclos] = await conn.query<any[]>(`SHOW COLUMNS FROM ciclos`);
console.log(
  "ciclos cols",
  colsCiclos.map((c) => c.Field),
);
const [colsExec] = await conn.query<any[]>(`SHOW COLUMNS FROM ciclo_caixa_execucoes`);
console.log(
  "exec cols",
  colsExec.map((c) => `${c.Field}:${c.Key}`),
);
const [idx] = await conn.query<any[]>(`SHOW INDEX FROM ciclo_caixa_execucoes`);
console.log(
  "exec indexes",
  idx.map((i) => `${i.Key_name}/${i.Column_name}`),
);

const [projetos] = await conn.query<any[]>(
  `SELECT id, nome, tipo, status FROM projetos WHERE nome NOT LIKE 'Projeto Teste%' ORDER BY id LIMIT 20`,
);
console.log("projetos", projetos);

const [ciclos] = await conn.query<any[]>(
  `SELECT id, projetoId, nome, produto, ativo, frequencia, intervaloDias,
          DATE_FORMAT(dataInicio,'%Y-%m-%d') inicio,
          DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima
   FROM ciclos
   WHERE projetoId IN (SELECT id FROM projetos WHERE nome NOT LIKE 'Projeto Teste%')
   ORDER BY projetoId, id`,
);
console.log("ciclos", ciclos);

await conn.end();
