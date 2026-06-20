import { describe, expect, it } from "vitest";
import { calcularRentabilidade, somarCustoOperacionalSugerido } from "./custosRentabilidade";

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
