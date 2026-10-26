import "dotenv/config";
import mysql from "mysql2/promise";

const comercial = process.env.COMERCIAL_DATABASE_URL!;
const u = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const c = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: "railway",
});

for (const id of [3, 4, 5]) {
  const [[torres]] = await c.query<any[]>(`SELECT COUNT(*) n FROM torres WHERE projetoId = ?`, [id]);
  const [[caixas]] = await c.query<any[]>(`SELECT COUNT(*) n FROM caixas_agua WHERE projetoId = ?`, [id]);
  const [[ciclos]] = await c.query<any[]>(`SELECT COUNT(*) n FROM ciclos WHERE projetoId = ?`, [id]);
  const [[perfis]] = await c.query<any[]>(
    `SELECT COUNT(*) n FROM perfis p JOIN andares a ON a.id = p.andarId JOIN torres t ON t.id = a.torreId WHERE t.projetoId = ?`,
    [id],
  ).catch(() => [[{ n: "?" }]]);
  const [[p]] = await c.query<any[]>(`SELECT nome, tipo, status FROM projetos WHERE id = ?`, [id]);
  console.log({ id, ...p, torres: torres.n, caixas: caixas.n, ciclos: ciclos.n, perfis: (perfis as any).n });
}

await c.end();
