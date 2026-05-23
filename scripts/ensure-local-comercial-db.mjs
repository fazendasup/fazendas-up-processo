import "dotenv/config";
import mysql from "mysql2/promise";

const port = Number(process.env.LOCAL_COMERCIAL_DB_PORT || 3307);

const connection = await mysql.createConnection({
  host: "127.0.0.1",
  port,
  user: "root",
  password: process.env.LOCAL_MYSQL_ROOT_PASSWORD || "root_local_only",
  multipleStatements: true,
});

try {
  await connection.query(`
    CREATE DATABASE IF NOT EXISTS fazendas_comercial
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
    GRANT ALL PRIVILEGES ON fazendas_comercial.* TO 'fazendas'@'%';
    FLUSH PRIVILEGES;
  `);
  console.log(`[local-db] fazendas_comercial pronta em 127.0.0.1:${port}`);
} finally {
  await connection.end();
}
