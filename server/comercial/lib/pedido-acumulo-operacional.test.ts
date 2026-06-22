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

  it("oculta itens quando pedido foi criado a partir do Conta Azul", () => {
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

    expect(
      deveOcultarItensFaturamentoAcumulado(
        { acumulaPedidos: true, diasAcumulo: 15 },
        pedido,
        contaAzul
      )
    ).toBe(true);
    expect(pedidoCriadoAPartirDoContaAzul(pedido)).toBe(true);
  });

  it("oculta itens quando espelham o orçamento acumulado", () => {
    const pedido = {
      id: "p1",
      contaAzulCustomerId: "c1",
      diaSemana: 1,
      pedidoContaAzulId: "ca1",
      snapshotConciliacao: null,
      itens: [
        {
          id: "i1",
          produtoId: "prod1",
          produtoNome: "Mix Rúcula",
          categoria: null,
          quantidade: 1355,
          precoUnit: 4.09,
        },
      ],
    };
    const contaAzul = {
      id: "ca1",
      statusPedido: "ORÇAMENTO",
      itens: [{ produto: "Mix Rúcula", sku: null, quantidade: 1355 }],
    };

    expect(pedidoItensEspelhamContaAzul(pedido.itens, contaAzul.itens)).toBe(
      true
    );
    expect(
      deveOcultarItensFaturamentoAcumulado(
        { acumulaPedidos: true },
        pedido,
        contaAzul
      )
    ).toBe(true);
  });

  it("mantém itens operacionais editados manualmente", () => {
    const pedido = {
      id: "p1",
      contaAzulCustomerId: "c1",
      diaSemana: 1,
      pedidoContaAzulId: "ca1",
      snapshotConciliacao: null,
      itens: [
        {
          id: "i1",
          produtoId: "prod1",
          produtoNome: "Alface",
          categoria: null,
          quantidade: 30,
          precoUnit: 7.59,
        },
      ],
    };
    const contaAzul = {
      id: "ca1",
      statusPedido: "ORÇAMENTO",
      itens: [{ produto: "Alface", sku: null, quantidade: 300 }],
    };

    expect(
      deveOcultarItensFaturamentoAcumulado(
        { acumulaPedidos: true },
        pedido,
        contaAzul
      )
    ).toBe(false);
  });
});
