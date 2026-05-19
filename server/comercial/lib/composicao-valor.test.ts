import { describe, expect, it } from "vitest";
import { Decimal } from "../generated/prisma/runtime/library.js";
import { asNumber, liquidoPedido, precisaDetalheComposicao } from "./composicao-valor.js";

describe("composicao-valor", () => {
  it("asNumber converte Prisma.Decimal", () => {
    expect(asNumber(new Decimal("1234.56"))).toBe(1234.56);
  });

  it("liquidoPedido usa valorTotal quando valorLiquido é zero no banco", () => {
    expect(
      liquidoPedido({
        valorLiquido: new Decimal(0),
        valorTotal: new Decimal(500),
      }),
    ).toBe(500);
  });

  it("precisaDetalheComposicao é false quando busca já tem líquido", () => {
    expect(
      precisaDetalheComposicao(
        { valorBruto: 100, valorFrete: 0, valorDesconto: 0, valorLiquido: 100 },
        100,
      ),
    ).toBe(false);
  });

  it("liquidoPedido prioriza valorLiquido positivo", () => {
    expect(
      liquidoPedido({
        valorLiquido: new Decimal(480),
        valorTotal: new Decimal(500),
      }),
    ).toBe(480);
  });
});
