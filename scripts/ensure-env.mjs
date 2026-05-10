import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const defaultsPath = path.join(root, "env.defaults");
const target = path.join(root, ".env");

if (!fs.existsSync(defaultsPath)) {
  console.error("Arquivo env.defaults não encontrado.");
  process.exit(1);
}

if (fs.existsSync(target)) {
  console.log(".env já existe — nada alterado.");
  process.exit(0);
}

fs.copyFileSync(defaultsPath, target);
console.log("Criado .env a partir de env.defaults (MySQL do docker-compose).");
