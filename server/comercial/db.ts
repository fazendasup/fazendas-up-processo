import { PrismaClient } from "./generated/prisma/index";

const globalForPrisma = globalThis as unknown as { comercialPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.comercialPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.comercialPrisma = prisma;
}
