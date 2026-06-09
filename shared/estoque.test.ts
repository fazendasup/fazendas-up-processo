import { describe, expect, it } from "vitest";
import { aplicarConsumoDiarioEstoque, projetarEstoque } from "./estoque";

describe("estoque", () => {
  it("desconta consumo diario desde a data de cadastro", () => {
    const result = aplicarConsumoDiarioEstoque(
      {
        quantidadeTotal: 100,
        usoPorEvento: 14,
        frequenciaDias: 7,
        createdAt: new Date("2026-06-01T12:00:00Z"),
        consumoAplicadoAte: null,
      },
      new Date("2026-06-08T09:00:00Z"),
    );

    expect(result.diasAplicados).toBe(7);
    expect(result.consumoAplicado).toBe(14);
    expect(result.quantidadeAtualizada).toBe(86);
  });

  it("usa consumoAplicadoAte para evitar baixa duplicada", () => {
    const result = aplicarConsumoDiarioEstoque(
      {
        quantidadeTotal: 86,
        usoPorEvento: 14,
        frequenciaDias: 7,
        createdAt: new Date("2026-06-01T12:00:00Z"),
        consumoAplicadoAte: new Date(2026, 5, 8),
      },
      new Date(2026, 5, 8, 9),
    );

    expect(result.diasAplicados).toBe(0);
    expect(result.consumoAplicado).toBe(0);
    expect(result.quantidadeAtualizada).toBe(86);
  });

  it("sugere compra para manter prazo de entrega, margem e 30 dias de operacao", () => {
    const result = projetarEstoque({
      quantidadeTotal: 20,
      usoPorEvento: 14,
      frequenciaDias: 7,
      prazoEntregaDias: 7,
      diasMargemCompra: 7,
      nivelMinimo: 10,
    });

    expect(result.consumoMedioDiario).toBe(2);
    expect(result.estoqueAlvoQuantidade).toBe(88);
    expect(result.sugestaoCompraQuantidade).toBe(68);
  });
});
