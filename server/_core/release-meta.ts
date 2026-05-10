import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let version = "0.0.0";
try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version?: string };
  version = typeof pkg.version === "string" ? pkg.version : version;
} catch {
  /* ignore */
}

/** Versão do `package.json` — útil para health checks e suporte. */
export const APP_VERSION = version;
