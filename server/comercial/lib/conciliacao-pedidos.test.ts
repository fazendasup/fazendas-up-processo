import { describe, expect, it } from "vitest";
import {
  calcularDivergencias,
  consolidarDivergenciasEspelhadas,
  opcoesCalcularDivergenciasParaPar,
} from "./conciliacao-pedidos";

describe("consolidarDivergenciasEspelhadas", () => {
  it("remove par espelhado de nomes diferentes com mesma quantidade", () => {
    const out = consolidarDivergenciasEspelhadas([
      {
        campo: "item:Mix de Folhas - Salada Leve",
        operacional: 10,
        contaAzul: 0,
      },
      {
        campo: "item:Mix Crocante - Base para Salada",
        operacional: 0,
        contaAzul: 10,
      },
    ]);
    expect(out).toHaveLength(0);
  });

  it("mantém divergência real de quantidade", () => {
    const out = consolidarDivergenciasEspelhadas([
      {
        campo: "item:Alface Americana Regional",
        operacional: 15,
        contaAzul: 12,
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.operacional).toBe(15);
    expect(out[0]?.contaAzul).toBe(12);
  });
});

describe("calcularDivergencias", () => {
  it("não cobra taxa de entrega quando o pedido tem frete cortesia", () => {
    const operacional = {
      dataEntrega: new Date("2026-06-15T12:00:00Z"),
      freteCortesia: true,
      snapshotConciliacao: null,
      itens: [{ produtoNome: "Alface", quantidade: 1, precoUnit: 10 }],
    };
    const contaAzul = {
      dataPedido: new Date("2026-06-15T12:00:00Z"),
      valorFrete: 0,
      valorLiquido: 10,
      valorTotal: 10,
      cliente: {
        regraComercial: {
          cobraTaxaEntrega: true,
          valorTaxaEntrega: 12,
        },
      },
      itens: [{ produto: "Alface", sku: null, quantidade: 1 }],
    };

    expect(
      calcularDivergencias(operacional as any, contaAzul as any, undefined, {
        compararData: true,
        compararItens: true,
        compararValorEstimado: true,
      }),
    ).toHaveLength(0);
  });

  it("ignora diferença de itens e valor para cliente com faturamento acumulado", () => {
    const operacional = {
      dataEntrega: new Date("2026-06-16T12:00:00Z"),
      freteCortesia: false,
      snapshotConciliacao: null,
      itens: [
        { produtoId: "p1", produtoNome: "Rúcula", quantidade: 10, precoUnit: 5 },
        {
          produtoId: "p2",
          produtoNome: "Manjericão Folha Fina 60g",
          quantidade: 5,
          precoUnit: 8,
        },
      ],
    };
    const contaAzul = {
      dataPedido: new Date("2026-06-16T12:00:00Z"),
      valorFrete: 0,
      valorLiquido: 483.22,
      valorTotal: 483.22,
      cliente: {
        regraComercial: {
          acumulaPedidos: true,
          cobraTaxaEntrega: false,
          valorTaxaEntrega: null,
        },
      },
      itens: [
        { produto: "Rúcula", sku: null, quantidade: 50, precoUnit: 5 },
        {
          produto: "Manjericão Folha Fina 60g",
          sku: null,
          quantidade: 25,
          precoUnit: 8,
        },
      ],
    };

    expect(
      calcularDivergencias(
        operacional as any,
        contaAzul as any,
        undefined,
        opcoesCalcularDivergenciasParaPar(operacional as any, contaAzul as any),
      ),
    ).toHaveLength(0);
  });
});
