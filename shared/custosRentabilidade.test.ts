import { describe, expect, it } from "vitest";
import { calcularRentabilidade, agregarRentabilidadeDeLinhas, somarCustoOperacionalSugerido } from "./custosRentabilidade";

describe("calcularRentabilidade", () => {
  it("calcula lucro e prejuízo por SKU com rateio operacional", () => {
    const r = calcularRentabilidade({
      custoOperacionalTotal: 1000,
      linhas: [
        {
          fichaId: 1,
          nomeProduto: "Tomate",
          quantidade: 10,
          receitaTotal: 2000,
          custoUnitarioManual: null,
          custoUnitarioFicha: 120,
        },
        {
          fichaId: 2,
          nomeProduto: "Mix",
          quantidade: 5,
          receitaTotal: 500,
          custoUnitarioManual: 80,
          custoUnitarioFicha: 60,
        },
      ],
    });

    expect(r.totais.receita).toBe(2500);
    expect(r.totais.cmv).toBe(1600);
    expect(r.totais.lucroBruto).toBe(900);
    expect(r.totais.resultado).toBe(-100);
    expect(r.linhas[0]?.status).toBe("lucro");
    expect(r.linhas[1]?.status).toBe("prejuizo");
    expect(r.linhas[0]?.custoUnitarioFonte).toBe("ficha");
    expect(r.linhas[1]?.custoUnitarioFonte).toBe("manual");
  });

  it("ignora custo manual zero e usa ficha", () => {
    const r = calcularRentabilidade({
      custoOperacionalTotal: 0,
      linhas: [
        {
          fichaId: 1,
          nomeProduto: "Alface",
          quantidade: 1,
          receitaTotal: 10,
          custoUnitarioManual: 0,
          custoUnitarioFicha: 4,
        },
      ],
    });
    expect(r.linhas[0]?.custoUnitario).toBe(4);
    expect(r.linhas[0]?.custoUnitarioFonte).toBe("ficha");
  });
});

describe("somarCustoOperacionalSugerido", () => {
  it("soma valor mensal de rubricas ativas exceto rateio projeto", () => {
    const total = somarCustoOperacionalSugerido([
      { ativo: true, modo: "mensal_rateio", valorMensal: "1500" },
      { ativo: true, modo: "rateio_projeto", valorMensal: "900" },
      { ativo: false, modo: "mensal_rateio", valorMensal: "200" },
    ]);
    expect(total).toBe(1500);
  });
});

describe("agregarRentabilidadeDeLinhas", () => {
  it("reagrega KPI só das linhas filtradas", () => {
    const full = calcularRentabilidade({
      custoOperacionalTotal: 1000,
      linhas: [
        {
          fichaId: 1,
          nomeProduto: "A",
          quantidade: 10,
          receitaTotal: 2000,
          custoUnitarioManual: null,
          custoUnitarioFicha: 100,
        },
        {
          fichaId: 2,
          nomeProduto: "B",
          quantidade: 5,
          receitaTotal: 500,
          custoUnitarioManual: null,
          custoUnitarioFicha: 50,
        },
      ],
    });
    const onlyA = agregarRentabilidadeDeLinhas([full.linhas[0]!], 1000);
    expect(onlyA.totais.receita).toBe(2000);
    expect(onlyA.totais.cmv).toBe(1000);
    expect(onlyA.totais.lucroBruto).toBe(1000);
    expect(onlyA.totais.custoOperacional).toBe(full.linhas[0]!.rateioOperacional);
    expect(onlyA.totais.resultado).toBe(full.linhas[0]!.contribuicao);
    expect(
      onlyA.totais.linhasLucro +
        onlyA.totais.linhasPrejuizo +
        onlyA.totais.linhasIncompletas,
    ).toBe(1);
    expect(onlyA.viabilidade.quantidadeVendida).toBe(10);
  });
});
