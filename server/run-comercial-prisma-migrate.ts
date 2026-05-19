import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ensureComercialDatabaseUrlEnv, resolveComercialDatabaseUrl } from "./comercial/env";

function prismaCliPath(): string {
  const candidate = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(
    "CLI Prisma não encontrada em node_modules/prisma — inclua `prisma` nas dependências de produção.",
  );
}

/**
 * Aplica migrações do módulo comercial (`prisma-comercial/`) no arranque do servidor.
 * Espelha `runDrizzleMigrateFromEnv` — necessário no Railway onde `comercial:migrate` não corre manualmente.
 */
export async function runComercialPrismaMigrateFromEnv(): Promise<void> {
  if (process.env.SKIP_COMERCIAL_MIGRATE === "1") {
    console.log("[Server] SKIP_COMERCIAL_MIGRATE=1 — migrações Prisma comercial ignoradas.");
    return;
  }

  try {
    resolveComercialDatabaseUrl();
  } catch {
    console.warn("[Server] URL do banco comercial ausente — migrações Prisma comercial ignoradas.");
    return;
  }

  const schemaPath = path.resolve(process.cwd(), "prisma-comercial", "schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    console.warn(
      `[Server] ${schemaPath} não encontrado — copie prisma-comercial/ na imagem ou corra pnpm comercial:migrate localmente.`,
    );
    return;
  }

  const databaseUrl = ensureComercialDatabaseUrlEnv();
  const cli = prismaCliPath();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [cli, "migrate", "deploy", "--schema", schemaPath],
      {
        cwd: process.cwd(),
        env: { ...process.env, COMERCIAL_DATABASE_URL: databaseUrl },
        stdio: "inherit",
      },
    );
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `prisma migrate deploy (comercial) falhou (code=${code ?? "null"}, signal=${signal ?? "none"})`,
          ),
        );
      }
    });
  });

  console.log("[Server] Migrações Prisma (Central Comercial) concluídas.");
}
