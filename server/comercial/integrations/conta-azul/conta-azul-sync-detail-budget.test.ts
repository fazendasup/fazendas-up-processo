import { afterEach, describe, expect, it } from "vitest";
import { contaAzulSyncDetailBudget } from "./conta-azul-sync-detail-budget";

describe("contaAzulSyncDetailBudget", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("manual: padrão 5.000 = busca detalhes para alinhar frete/desconto", () => {
    delete process.env.CONTA_AZUL_SYNC_DETAIL_MAX;
    delete process.env.CONTA_AZUL_SYNC_DETAIL_UNLIMITED;
    expect(contaAzulSyncDetailBudget("manual")).toBe(5_000);
  });

  it("manual: respeita CONTA_AZUL_SYNC_DETAIL_MAX positivo", () => {
    process.env.CONTA_AZUL_SYNC_DETAIL_MAX = "80";
    expect(contaAzulSyncDetailBudget("manual")).toBe(80);
  });

  it("cron: padrão 1.000 = mantém composição atualizada sem sync ilimitado", () => {
    delete process.env.CONTA_AZUL_CRON_DETAIL_MAX;
    expect(contaAzulSyncDetailBudget("cron")).toBe(1_000);
  });

  it("manual: UNLIMITED habilita detalhes ilimitados", () => {
    process.env.CONTA_AZUL_SYNC_DETAIL_UNLIMITED = "1";
    expect(contaAzulSyncDetailBudget("manual")).toBe(Number.MAX_SAFE_INTEGER);
  });
});
