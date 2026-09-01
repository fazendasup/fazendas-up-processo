import { describe, expect, it } from "vitest";
import {
  alocarReceitaLiquidaPorLinhas,
  reconciliarBrutoItensComPedido,
} from "./custosRentabilidadeVendasCa";

describe("reconciliarBrutoItensComPedido", () => {
  it("mantém valores quando já batem", () => {
    expect(reconciliarBrutoItensComPedido(100, [60, 40])).toEqual([60, 40]);
  });

  it("escala linhas para o bruto do pedido", () => {
    const receitas = reconciliarBrutoItensComPedido(100, [75, 75]);
    expect(receitas.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
    expect(receitas[0]).toBe(50);
    expect(receitas[1]).toBe(50);
  });
});

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
