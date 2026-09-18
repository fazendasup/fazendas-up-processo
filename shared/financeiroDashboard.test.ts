import { describe, expect, it } from "vitest";
import { montarSerieDashboard3Meses } from "./financeiroDashboard";

describe("montarSerieDashboard3Meses", () => {
  it("monta mes−2, mes−1 e mês com desvios de vendas e desembolso", () => {
    const out = montarSerieDashboard3Meses({
      mesYm: "2026-09",
      meses: [
        {
          mesYm: "2026-07",
          vendasFaturadas: 40_000,
          orcamentos: 5_000,
          vendasReal: 45_000,
          desembolsoProjetado: 50_000,
          desembolsoPago: 48_000,
          previsto: 40_000,
          recebido: 38_000,
          aReceber: 2_000,
        },
        {
          mesYm: "2026-08",
          vendasFaturadas: 42_000,
          orcamentos: 3_000,
          vendasReal: 45_000,
          desembolsoProjetado: 52_000,
          desembolsoPago: 55_000,
          previsto: 44_000,
          recebido: 40_000,
          aReceber: 4_000,
        },
        {
          mesYm: "2026-09",
          vendasFaturadas: 30_000,
          orcamentos: 5_000,
          vendasReal: 35_000,
          vendasProjetado: 78_000,
          desembolsoProjetado: 60_000,
          desembolsoPago: 20_000,
          previsto: 66_000,
          recebido: 40_000,
          aReceber: 26_000,
        },
      ],
    });

    expect(out).toHaveLength(3);
    expect(out.map(m => m.mesYm)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(out[0].aberto).toBe(false);
    expect(out[0].vendasProjetado).toBe(45_000);
    expect(out[0].desvioVendas).toBe(0);
    expect(out[0].desvioDesembolso).toBe(-2_000);
    expect(out[0].saldoCaixa).toBe(38_000 - 48_000);

    expect(out[2].aberto).toBe(true);
    expect(out[2].vendasProjetado).toBe(78_000);
    expect(out[2].desvioVendas).toBe(35_000 - 78_000);
    expect(out[2].desvioDesembolso).toBe(20_000 - 60_000);
    expect(out[2].saldoCaixa).toBe(20_000);
  });
});
