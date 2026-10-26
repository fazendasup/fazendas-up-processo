import { PrismaClient } from "../server/comercial/generated/prisma/index.js";
import { readFileSync } from "node:fs";

try {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
} catch {}

const p = new PrismaClient();
const tables = await p.$queryRawUnsafe(
  "SELECT TABLE_NAME AS t, TABLE_ROWS AS r FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '%pedido%' ORDER BY t",
);
const op = await p.$queryRawUnsafe("SELECT COUNT(*) AS c FROM pedidos_operacionais");
const ca = await p.$queryRawUnsafe("SELECT COUNT(*) AS c FROM pedidos");
const aud = await p.$queryRawUnsafe(
  "SELECT COUNT(*) AS c FROM pedidos_operacionais_auditoria",
);
const mig = await p.$queryRawUnsafe(
  "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10",
);
const cols = await p.$queryRawUnsafe(
  "SHOW COLUMNS FROM pedidos_operacionais LIKE 'status_envio%'",
);
console.log(
  JSON.stringify(
    { tables, op, ca, aud, mig, cols },
    (_, v) => (typeof v === "bigint" ? Number(v) : v),
    2,
  ),
);
await p.$disconnect();
