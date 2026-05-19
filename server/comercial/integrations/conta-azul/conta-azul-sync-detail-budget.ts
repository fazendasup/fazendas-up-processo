export type ContaAzulSyncMode = "manual" | "cron";

/**
 * Quantos GET /v1/venda/{id} o sync pode fazer (composição frete/desconto).
 *
 * - Manual: padrão 0 = sync rápido (só /v1/venda/busca).
 * - Defina CONTA_AZUL_SYNC_DETAIL_MAX=N para enriquecer até N vendas por execução.
 * - CONTA_AZUL_SYNC_DETAIL_UNLIMITED=1 = sem limite (lento; use só se necessário).
 */
export function contaAzulSyncDetailBudget(mode: ContaAzulSyncMode): number {
  if (process.env.CONTA_AZUL_SYNC_SKIP_DETAIL === "1") return 0;
  if (process.env.CONTA_AZUL_SYNC_DETAIL_UNLIMITED === "1") {
    return Number.MAX_SAFE_INTEGER;
  }

  if (mode === "cron") {
    const cronMax = Number(process.env.CONTA_AZUL_CRON_DETAIL_MAX ?? 0);
    return Number.isFinite(cronMax) && cronMax >= 0 ? cronMax : 0;
  }

  const manualMax = Number(process.env.CONTA_AZUL_SYNC_DETAIL_MAX ?? 0);
  if (!Number.isFinite(manualMax) || manualMax < 0) return 0;
  return manualMax;
}
