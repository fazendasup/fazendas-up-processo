import { describe, expect, it } from "vitest";
import {
  agregarVendasPorCompetencia,
  mesCompetenciaVendaOrcamento,
  montarProjecaoVendasRestanteMes,
} from "./financeiroProjecaoVendas";

describe("mesCompetenciaVendaOrcamento", () => {
  it("venda fica no mês do pedido", () => {
    expect(mesCompetenciaVendaOrcamento("2026-09-20", "venda")).toBe("2026-09");
  });

  it("orçamento até dia 15 fica no mês", () => {
    expect(mesCompetenciaVendaOrcamento("2026-09-01", "orcamento")).toBe(
      "2026-09",
    );
    expect(mesCompetenciaVendaOrcamento("2026-09-15", "orcamento")).toBe(
      "2026-09",
    );
  });

  it("orçamento após dia 15 vai para o mês seguinte", () => {
    expect(mesCompetenciaVendaOrcamento("2026-09-16", "orcamento")).toBe(
      "2026-10",
    );
    expect(mesCompetenciaVendaOrcamento("2026-12-31", "orcamento")).toBe(
      "2027-01",
    );
  });
});

describe("agregarVendasPorCompetencia", () => {
  it("soma vendas e orçamentos com regra do dia 15", () => {
    const map = agregarVendasPorCompetencia([
      { dataPedidoIso: "2026-09-10", status: "venda", valorLiquido: 1_000 },
      { dataPedidoIso: "2026-09-14", status: "orcamento", valorLiquido: 500 },
      { dataPedidoIso: "2026-09-20", status: "orcamento", valorLiquido: 300 },
      { dataPedidoIso: "2026-08-20", status: "orcamento", valorLiquido: 200 },
    ]);
    expect(map.get("2026-09")).toBe(1_700); // 1000 + 500 + 200 (ago spill)
    expect(map.get("2026-10")).toBe(300);
  });
});

describe("montarProjecaoVendasRestanteMes", () => {
  it("projeta o restante do mês pela média diária × dias restantes", () => {
    // ago 31d × 3100 = 100/dia; jul 31d × 3100 = 100/dia → média 100/dia
    const out = montarProjecaoVendasRestanteMes({
      mesYm: "2026-09",
      hojeYm: "2026-09",
      diaHoje: 17, // restam 13 dias (30-17)
      vendasMesAtual: 1_700,
      vendasMesAnterior1: 3_100,
      vendasMesAnterior2: 3_100,
      mesAnterior1Ym: "2026-08",
      mesAnterior2Ym: "2026-07",
    });
    expect(out.mediaDiaria2m).toBe(100);
    expect(out.diasRestantes).toBe(13);
    expect(out.aindaEntraProjetado).toBe(1_300);
    expect(out.vendasJaNoMes).toBe(1_700);
    expect(out.projecaoMesTotal).toBe(3_000);
  });

  it("mês passado não projeta restante", () => {
    const out = montarProjecaoVendasRestanteMes({
      mesYm: "2026-08",
      hojeYm: "2026-09",
      diaHoje: 17,
      vendasMesAtual: 5_000,
      vendasMesAnterior1: 4_000,
      vendasMesAnterior2: 4_000,
      mesAnterior1Ym: "2026-07",
      mesAnterior2Ym: "2026-06",
    });
    expect(out.diasRestantes).toBe(0);
    expect(out.aindaEntraProjetado).toBe(0);
    expect(out.projecaoMesTotal).toBe(5_000);
  });
});
