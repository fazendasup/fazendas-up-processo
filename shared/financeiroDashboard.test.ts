import { describe, expect, it } from "vitest";
import {
  classificarRubricaDashboard,
  montarMapaAcaoDesembolso,
  montarSerieDashboard3Meses,
} from "./financeiroDashboard";

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
    expect(out[2]?.aberto).toBe(true);
    expect(out[2]?.vendasProjetado).toBe(78_000);
  });
});

describe("classificarRubricaDashboard / montarMapaAcaoDesembolso", () => {
  it("marca custo fixo em aberto como pagar", () => {
    const r = classificarRubricaDashboard({
      rubrica: "Energia elétrica",
      projetado: 5_000,
      pago: 1_000,
      naoPago: 4_000,
      pagoAMais: 0,
      status: "faltando",
    });
    expect(r?.comportamentoCusto).toBe("fixo");
    expect(r?.essencial).toBe(true);
    expect(r?.acao).toBe("pagar");
    expect(r?.valorAcao).toBe(4_000);
  });

  it("marca custo variável em aberto como negociar", () => {
    const r = classificarRubricaDashboard({
      rubrica: "Publicidade e marketing",
      projetado: 8_000,
      pago: 0,
      naoPago: 8_000,
      pagoAMais: 0,
      status: "faltando",
    });
    expect(r?.comportamentoCusto).toBe("variavel");
    expect(r?.essencial).toBe(false);
    expect(r?.acao).toBe("negociar");
    expect(r?.valorAcao).toBe(8_000);
  });

  it("respeita override de comportamento no mapa", () => {
    const comportamentoMap = new Map([["publicidade", "fixo" as const]]);
    const r = classificarRubricaDashboard({
      rubrica: "Publicidade",
      projetado: 3_000,
      pago: 0,
      naoPago: 3_000,
      pagoAMais: 0,
      status: "faltando",
      comportamentoMap,
    });
    expect(r?.comportamentoCusto).toBe("fixo");
    expect(r?.acao).toBe("pagar");
  });

  it("separa painéis fixo × variável", () => {
    const rows = [
      classificarRubricaDashboard({
        rubrica: "Folha de pagamento",
        projetado: 50_000,
        pago: 10_000,
        naoPago: 40_000,
        pagoAMais: 0,
        status: "faltando",
      })!,
      classificarRubricaDashboard({
        rubrica: "Publicidade",
        projetado: 3_000,
        pago: 5_000,
        naoPago: 0,
        pagoAMais: 2_000,
        status: "pago_a_mais",
      })!,
    ];
    const mapa = montarMapaAcaoDesembolso(rows, 6);
    expect(mapa.proteger.map(r => r.rubrica)).toEqual(["Folha de pagamento"]);
    expect(mapa.reduzir.map(r => r.rubrica)).toEqual(["Publicidade"]);
    expect(mapa.totalProteger).toBe(40_000);
    expect(mapa.totalReduzir).toBe(2_000);
  });
});
