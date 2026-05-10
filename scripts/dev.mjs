import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "development";

const pkgRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);

let tsxCli;
try {
  tsxCli = require.resolve("tsx/cli", { paths: [pkgRoot] });
} catch {
  console.error("Dependências ausentes. Rode: pnpm install");
  process.exit(1);
}

const child = spawn(process.execPath, [tsxCli, "watch", "server/_core/index.ts"], {
  cwd: pkgRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
