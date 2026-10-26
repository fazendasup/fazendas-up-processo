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
const [p] = await c.query<any[]>(
  `SELECT id, nome, tipo, status FROM projetos ORDER BY id`,
);
console.log(p);
const [modsOff] = await c.query<any[]>(
  `SELECT p.nome, pm.modulo, pm.habilitado
   FROM projeto_modulos pm JOIN projetos p ON p.id = pm.projetoId
   WHERE pm.habilitado = 0 ORDER BY p.id, pm.modulo`,
);
console.log("desligados", modsOff);
await c.end();
