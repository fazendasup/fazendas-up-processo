import mysql from "mysql2/promise";
import {
  assertSafeMysqlDatabaseName,
  getMysqlDatabaseNameFromUrl,
  swapMysqlDatabaseInUrl,
} from "./comercial/mysql-url";

/**
 * Cria a base do comercial no mesmo MySQL do ERP (Opção B), se ainda não existir.
 * Evita passos manuais no Railway — basta `DATABASE_URL` na app.
 */
export async function ensureComercialDatabaseExists(databaseUrl: string): Promise<void> {
  if (process.env.SKIP_COMERCIAL_DATABASE_CREATE === "1") {
    console.log("[Server] SKIP_COMERCIAL_DATABASE_CREATE=1 — CREATE DATABASE ignorado.");
    return;
  }

  const dbName = getMysqlDatabaseNameFromUrl(databaseUrl);
  if (!dbName) {
    console.warn("[Server] URL comercial sem nome de base — CREATE DATABASE ignorado.");
    return;
  }

  assertSafeMysqlDatabaseName(dbName);

  const adminUrl = swapMysqlDatabaseInUrl(databaseUrl, "");
  const connection = await mysql.createConnection(adminUrl);

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`[Server] Base comercial pronta: ${dbName}`);
  } finally {
    await connection.end();
  }
}
