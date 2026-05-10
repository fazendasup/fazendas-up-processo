import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "production";

const pkgRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const entry = path.join(pkgRoot, "dist", "index.js");

/** Mesmo pipeline que Docker/Railway: migrações antes do Node (idempotente). */
if (process.env.SKIP_DRIZZLE_MIGRATE !== "1" && process.env.DATABASE_URL?.trim()) {
  const drizzleBin = path.join(pkgRoot, "node_modules", "drizzle-kit", "bin.cjs");
  if (!fs.existsSync(drizzleBin)) {
    console.error(
      "[start] DATABASE_URL definido mas drizzle-kit não está em node_modules. Rode `pnpm install` (prod) ou use a imagem Docker.",
    );
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [drizzleBin, "migrate"], {
    cwd: pkgRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const child = spawn(process.execPath, [entry], {
  cwd: pkgRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
