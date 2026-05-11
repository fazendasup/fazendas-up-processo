import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

function mysqlUrlWithUtf8mb4(url: string): string {
  let out = url.trim();
  if (!/[?&]charset=utf8/i.test(out)) {
    out = out.includes("?") ? `${out}&charset=utf8mb4` : `${out}?charset=utf8mb4`;
  }
  if (!/[?&]connectTimeout=/i.test(out)) {
    out += "&connectTimeout=10000";
  }
  return out;
}

/**
 * Corre migrações **depois** de HTTP estar à escuta (Railway healthcheck + site estático).
 * `scripts/start.mjs` já não bloqueia aqui — evita deploy preso em metadata lock / migrate longo.
 */
export async function runDrizzleMigrateFromEnv(): Promise<void> {
  if (process.env.SKIP_DRIZZLE_MIGRATE === "1") {
    console.log("[Server] SKIP_DRIZZLE_MIGRATE=1 — migrações Drizzle não corridas neste arranque.");
    return;
  }
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    console.warn("[Server] DATABASE_URL ausente — migrações Drizzle ignoradas.");
    return;
  }

  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  const pool = mysql.createPool(mysqlUrlWithUtf8mb4(raw));
  const db = drizzle(pool);
  try {
    console.log("[Server] A aplicar migrações Drizzle…");
    await migrate(db, { migrationsFolder });
    console.log("[Server] Migrações Drizzle concluídas.");
  } finally {
    await pool.end().catch(() => undefined);
  }
}
