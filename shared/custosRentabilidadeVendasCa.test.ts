import { describe, expect, it } from "vitest";
import { alocarReceitaLiquidaPorLinhas } from "./custosRentabilidadeVendasCa";

describe("alocarReceitaLiquidaPorLinhas", () => {
  it("inclui frete no rateio quando há uma linha", () => {
    expect(alocarReceitaLiquidaPorLinhas(115, [100])).toEqual([115]);
  });

  it("rateia valor líquido com desconto entre linhas", () => {
    const receitas = alocarReceitaLiquidaPorLinhas(90, [75.9, 75.9]);
    expect(receitas.reduce((a, b) => a + b, 0)).toBeCloseTo(90, 2);
    expect(receitas[0]).toBe(45);
    expect(receitas[1]).toBe(45);
  });

  it("rateia frete proporcionalmente", () => {
    const receitas = alocarReceitaLiquidaPorLinhas(115, [100, 50]);
    expect(receitas.reduce((a, b) => a + b, 0)).toBeCloseTo(115, 2);
    expect(receitas[0]).toBeCloseTo(76.67, 2);
    expect(receitas[1]).toBeCloseTo(38.33, 2);
  });
});
