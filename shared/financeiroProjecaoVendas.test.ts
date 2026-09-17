import { describe, expect, it } from "vitest";
import {
  agregarVendasPorCompetencia,
  agregarVendasPorCompetenciaDetalhe,
  agregarVendasPorDiaCompetencia,
  mesCompetenciaVendaOrcamento,
  montarProjecaoVendasRestanteMes,
  somarVendasAteDia,
  somarVendasUltimosNDias,
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

  it("orçamento após dia 15 não entra", () => {
    expect(mesCompetenciaVendaOrcamento("2026-09-16", "orcamento")).toBeNull();
    expect(mesCompetenciaVendaOrcamento("2026-12-31", "orcamento")).toBeNull();
  });
});

describe("agregarVendasPorCompetencia", () => {
  it("soma vendas e orçamentos ≤15 (ignora orçamento após dia 15 e spill)", () => {
    const map = agregarVendasPorCompetencia([
      { dataPedidoIso: "2026-09-10", status: "venda", valorLiquido: 1_000 },
      { dataPedidoIso: "2026-09-14", status: "orcamento", valorLiquido: 500 },
      { dataPedidoIso: "2026-09-20", status: "orcamento", valorLiquido: 300 },
      { dataPedidoIso: "2026-08-20", status: "orcamento", valorLiquido: 200 },
    ]);
    expect(map.get("2026-09")).toBe(1_500); // 1000 + 500
    expect(map.get("2026-10")).toBeUndefined();
  });
});

describe("agregarVendasPorCompetenciaDetalhe", () => {
  it("separa vendas faturadas de orçamentos ≤15", () => {
    const map = agregarVendasPorCompetenciaDetalhe([
      { dataPedidoIso: "2026-09-10", status: "venda", valorLiquido: 1_000 },
      { dataPedidoIso: "2026-09-14", status: "orcamento", valorLiquido: 500 },
      { dataPedidoIso: "2026-08-20", status: "orcamento", valorLiquido: 200 },
    ]);
    expect(map.get("2026-09")).toEqual({
      vendas: 1_000,
      orcamentos: 500,
      total: 1_500,
    });
  });
});

describe("somarVendasAteDia / somarVendasUltimosNDias", () => {
  it("corta o mês em até o dia e últimos N dias", () => {
    const porDia = agregarVendasPorDiaCompetencia([
      { dataPedidoIso: "2026-08-05", status: "venda", valorLiquido: 100 },
      { dataPedidoIso: "2026-08-17", status: "venda", valorLiquido: 200 },
      { dataPedidoIso: "2026-08-20", status: "venda", valorLiquido: 300 },
      { dataPedidoIso: "2026-08-31", status: "venda", valorLiquido: 400 },
    ]).get("2026-08")!;

    expect(somarVendasAteDia(porDia, 17)).toBe(300); // 100+200
    // últimos 13 dias de ago (31d): dias 19–31 → 300+400
    expect(somarVendasUltimosNDias(porDia, 31, 13)).toBe(700);
  });
});

describe("montarProjecaoVendasRestanteMes", () => {
  it("projeta o restante pela média dos últimos N dias dos 2 meses anteriores", () => {
    const out = montarProjecaoVendasRestanteMes({
      mesYm: "2026-09",
      hojeYm: "2026-09",
      diaHoje: 17,
      vendasMesAtual: 1_700,
      vendasAteDiaMesAnterior1: 2_000,
      vendasAteDiaMesAnterior2: 1_800,
      vendasRestanteMesAnterior1: 1_400,
      vendasRestanteMesAnterior2: 1_200,
      mesAnterior1Ym: "2026-08",
      mesAnterior2Ym: "2026-07",
    });
    expect(out.diasRestantes).toBe(13);
    expect(out.mediaAteMesmoDia2m).toBe(1_900);
    expect(out.mediaRestante2m).toBe(1_300);
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
      vendasAteDiaMesAnterior1: 4_000,
      vendasAteDiaMesAnterior2: 4_000,
      vendasRestanteMesAnterior1: 1_000,
      vendasRestanteMesAnterior2: 1_000,
      mesAnterior1Ym: "2026-07",
      mesAnterior2Ym: "2026-06",
    });
    expect(out.diasRestantes).toBe(0);
    expect(out.aindaEntraProjetado).toBe(0);
    expect(out.projecaoMesTotal).toBe(5_000);
  });
});
