import cron from "node-cron";
import type { PrismaClient } from "../generated/prisma/index.js";
import type { Env } from "../env";
import { resolveComercialDatabaseUrl } from "../env";
import { logger } from "../lib/logger";
import { runContaAzulSync } from "../integrations/conta-azul/sync.service";

/** Liga sync periódico Conta Azul (padrão: sim, se `COMERCIAL_DATABASE_URL` estiver definida). */
export function isComercialIntegrationCronEnabled(): boolean {
  const raw =
    process.env.ENABLE_COMERCIAL_INTEGRATION_CRON ??
    process.env.ENABLE_INTEGRATION_CRON;
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  try {
    resolveComercialDatabaseUrl();
    return true;
  } catch {
    return false;
  }
}

async function runScheduledSync(prisma: PrismaClient, env: Env, label: string) {
  try {
    const result = await runContaAzulSync(prisma, env);
    logger.info(
      { label, pedidosGravados: result.pedidosGravados, clientes: result.clientesProcessados },
      "Conta Azul: sync automático OK"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("sem token") || msg.includes("credencial")) {
      logger.debug({ label }, "Conta Azul: sync automático ignorado (OAuth pendente)");
      return;
    }
    logger.warn({ label, err: msg }, "Conta Azul: sync automático falhou");
  }
}

export function startComercialIntegrationJobs(prisma: PrismaClient, env: Env) {
  if (env.NODE_ENV === "test") return;
  if (!isComercialIntegrationCronEnabled()) return;

  const schedule = process.env.COMERCIAL_CONTA_AZUL_CRON?.trim() || "*/10 * * * *";
  if (!cron.validate(schedule)) {
    logger.error({ schedule }, "COMERCIAL_CONTA_AZUL_CRON inválido — cron não iniciado");
    return;
  }

  cron.schedule(schedule, () => {
    void runScheduledSync(prisma, env, "cron");
  });

  const startupDelayMs = Number(process.env.COMERCIAL_CONTA_AZUL_STARTUP_SYNC_MS ?? 60_000);
  if (Number.isFinite(startupDelayMs) && startupDelayMs > 0) {
    setTimeout(() => {
      void runScheduledSync(prisma, env, "startup");
    }, startupDelayMs);
  }

  logger.info({ schedule, startupDelayMs }, "Conta Azul: sync automático agendado");
}
