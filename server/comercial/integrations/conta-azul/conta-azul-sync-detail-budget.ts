export type ContaAzulSyncMode = "manual" | "cron";

/**
 * Quantos GET /v1/venda/{id} o sync pode fazer (composição frete/desconto).
 *
 * - Manual: padrão 120 detalhes por clique, para o sync terminar em poucos minutos.
 * - Cron: padrão 80. O restante das vendas entra nos próximos syncs.
 * - Defina CONTA_AZUL_SYNC_DETAIL_MAX=N para enriquecer até N vendas por execução.
 * - CONTA_AZUL_SYNC_DETAIL_UNLIMITED=1 = sem limite no orçamento (ainda há prazo de 4 min no sync).
 */
const DEFAULT_MANUAL_DETAIL_MAX = 120;
const DEFAULT_CRON_DETAIL_MAX = 80;

export function contaAzulSyncDetailBudget(mode: ContaAzulSyncMode): number {
  if (process.env.CONTA_AZUL_SYNC_SKIP_DETAIL === "1") return 0;
  if (process.env.CONTA_AZUL_SYNC_DETAIL_UNLIMITED === "1") {
    return Number.MAX_SAFE_INTEGER;
  }

  if (mode === "cron") {
    const cronMax = Number(process.env.CONTA_AZUL_CRON_DETAIL_MAX ?? DEFAULT_CRON_DETAIL_MAX);
    return Number.isFinite(cronMax) && cronMax >= 0 ? cronMax : 0;
  }

  const manualMax = Number(process.env.CONTA_AZUL_SYNC_DETAIL_MAX ?? DEFAULT_MANUAL_DETAIL_MAX);
  if (!Number.isFinite(manualMax) || manualMax < 0) return 0;
  return manualMax;
}
