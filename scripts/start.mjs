import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "production";

const pkgRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const entry = path.join(pkgRoot, "dist", "index.js");

if (!fs.existsSync(entry)) {
  console.error(`[start] Entrada em falta: ${entry}. Rode pnpm build na imagem.`);
  process.exit(1);
}

/**
 * Migrações Drizzle correm **dentro** do servidor (`runDrizzleMigrateFromEnv`), depois de HTTP + estático,
 * para o healthcheck e o site não ficarem bloqueados em `drizzle-kit migrate` / locks MySQL.
 */
const child = spawn(process.execPath, [entry], {
  cwd: pkgRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
