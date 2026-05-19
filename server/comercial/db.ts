import { createRequire } from "node:module";
import { join } from "node:path";
import type { PrismaClient } from "./generated/prisma/index.js";

const require = createRequire(import.meta.url);

/** Caminho do client Prisma gerado (fora do bundle ESM em `dist/`). */
function prismaClientModulePath(): string {
  return join(process.cwd(), "server/comercial/generated/prisma/index.js");
}

const globalForPrisma = globalThis as unknown as { comercialPrisma?: PrismaClient };

/** Singleton do Prisma comercial — carregado em runtime, não no bundle esbuild. */
export function getComercialPrisma(): PrismaClient {
  if (globalForPrisma.comercialPrisma) return globalForPrisma.comercialPrisma;

  const { PrismaClient } = require(prismaClientModulePath()) as typeof import("./generated/prisma/index.js");
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.comercialPrisma = client;
  }

  return client;
}
