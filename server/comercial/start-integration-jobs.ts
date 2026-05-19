import { getComercialEnv } from "./env";
import { getComercialPrisma } from "./db";
import { startComercialIntegrationJobs } from "./jobs/cron";

/** Inicia cron de sync Conta Azul (chamado na subida do supervisório). */
export function tryStartComercialIntegrationJobs(): void {
  try {
    const env = getComercialEnv();
    startComercialIntegrationJobs(getComercialPrisma(), env);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Server] Módulo comercial / cron Conta Azul: ${msg}`);
  }
}
