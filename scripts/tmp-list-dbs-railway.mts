import "dotenv/config";
import mysql from "mysql2/promise";

const comercial = process.env.COMERCIAL_DATABASE_URL!;
const base = comercial.replace(/\/[^/?]+(\?|$)/, "/$1").replace(/\/\?/, "/mysql?");
// connect without db
const url = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const conn = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
});
const [dbs] = await conn.query<any[]>("SHOW DATABASES");
console.log(dbs.map((d) => Object.values(d)[0]));
await conn.end();
