import { describe, expect, it } from "vitest";
import { Decimal } from "../generated/prisma/runtime/library.js";
import {
  asNumber,
  composicaoFromVendaDetalhe,
  liquidoPedido,
  precisaDetalheComposicao,
} from "./composicao-valor.js";

describe("composicao-valor", () => {
  it("asNumber converte Prisma.Decimal", () => {
    expect(asNumber(new Decimal("1234.56"))).toBe(1234.56);
  });

  it("asNumber converte formato monetário pt-BR", () => {
    expect(asNumber("1.987,00")).toBe(1987);
  });

  it("liquidoPedido usa valorTotal quando valorLiquido é zero no banco", () => {
    expect(
      liquidoPedido({
        valorLiquido: new Decimal(0),
        valorTotal: new Decimal(500),
      }),
    ).toBe(500);
  });

  it("precisaDetalheComposicao é true quando busca só tem líquido sem frete/desconto", () => {
    expect(
      precisaDetalheComposicao(
        { valorBruto: 100, valorFrete: 0, valorDesconto: 0, valorLiquido: 100 },
        100,
      ),
    ).toBe(true);
  });

  it("precisaDetalheComposicao é false quando busca tem frete ou desconto", () => {
    expect(
      precisaDetalheComposicao(
        { valorBruto: 90, valorFrete: 10, valorDesconto: 0, valorLiquido: 100 },
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

  it("extrai composição do detalhe com campos alternativos", () => {
    expect(
      composicaoFromVendaDetalhe({
        valor_bruto: "52.797,35",
        valor_frete: { valor: "1.972,00" },
        desconto: { valor: "307,04" },
        valor_liquido: "54.462,31",
      }),
    ).toEqual({
      valorBruto: 52797.35,
      valorFrete: 1972,
      valorDesconto: 307.04,
      valorLiquido: 54462.31,
    });
  });
});
