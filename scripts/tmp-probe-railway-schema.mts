import "dotenv/config";
import mysql from "mysql2/promise";

const comercial = process.env.COMERCIAL_DATABASE_URL;
if (!comercial) throw new Error("sem COMERCIAL_DATABASE_URL");

const u = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const conn = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: "railway",
});
const [tables] = await conn.query<any[]>("SHOW TABLES");
const names = tables.map((r) => Object.values(r)[0] as string);
console.log("count", names.length);
console.log(
  "ops",
  names.filter((n) => /ciclo|projeto|caixa|aplic|torre|andar/i.test(n)),
);
await conn.end();
