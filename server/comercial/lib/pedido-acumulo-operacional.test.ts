import { describe, expect, it } from "vitest";
import {
  deveOcultarItensFaturamentoAcumulado,
  isOrcamentoFaturamentoAcumulado,
  pedidoCriadoAPartirDoContaAzul,
  pedidoItensEspelhamContaAzul,
} from "./pedido-acumulo-operacional";

describe("pedido-acumulo-operacional", () => {
  it("detecta orçamento de faturamento acumulado", () => {
    expect(
      isOrcamentoFaturamentoAcumulado(
        { acumulaPedidos: true },
        "ORÇAMENTO APROVADO"
      )
    ).toBe(true);
    expect(
      isOrcamentoFaturamentoAcumulado({ acumulaPedidos: false }, "ORÇAMENTO")
    ).toBe(false);
    expect(
      isOrcamentoFaturamentoAcumulado({ acumulaPedidos: true }, "VENDA")
    ).toBe(false);
  });

  it("não oculta itens de orçamento de faturamento (sem bloqueio operacional)", () => {
    const pedido = {
      id: "p1",
      contaAzulCustomerId: "c1",
      diaSemana: 1,
      pedidoContaAzulId: "ca1",
      snapshotConciliacao: { operacional: null, contaAzul: {} },
      itens: [
        {
          id: "i1",
          produtoId: "prod1",
          produtoNome: "Alface",
          categoria: null,
          quantidade: 300,
          precoUnit: 5,
        },
      ],
    };
    const contaAzul = {
      id: "ca1",
      statusPedido: "ORÇAMENTO",
      itens: [{ produto: "Alface", sku: null, quantidade: 300 }],
    };

    expect(pedidoCriadoAPartirDoContaAzul(pedido)).toBe(true);
    expect(pedidoItensEspelhamContaAzul(pedido.itens, contaAzul.itens)).toBe(true);
    expect(
      deveOcultarItensFaturamentoAcumulado(
        { acumulaPedidos: true, diasAcumulo: 15 },
        pedido,
        contaAzul
      )
    ).toBe(false);
  });
});
