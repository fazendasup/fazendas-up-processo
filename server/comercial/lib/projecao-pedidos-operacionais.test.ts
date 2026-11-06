import { describe, expect, it } from "vitest";
import {
  agregarProjecaoPedidos,
  resolverPrecoProjecao,
  resumoFaixa,
} from "./projecao-pedidos-operacionais";

describe("resolverPrecoProjecao", () => {
  it("prioriza preço do item", () => {
    const r = resolverPrecoProjecao({
      precoUnit: 10,
      precoEspecialCliente: 8,
      precoBaseCatalogo: 12,
    });
    expect(r).toEqual({ preco: 10, fonte: "item" });
  });

  it("usa tabela do cliente quando item vazio", () => {
    const r = resolverPrecoProjecao({
      precoUnit: null,
      precoEspecialCliente: 8.5,
      precoBaseCatalogo: 12,
    });
    expect(r).toEqual({ preco: 8.5, fonte: "tabela_cliente" });
  });
});

describe("agregarProjecaoPedidos", () => {
  it("soma dia e semana com frete da regra", () => {
    const { porDia, clientesPorDia } = agregarProjecaoPedidos([
      {
        id: "1",
        dataEntrega: new Date("2026-11-06T12:00:00-03:00"),
        status: "PENDENTE",
        freteCortesia: false,
        contaAzulCustomerId: "c1",
        itens: [
          {
            produtoId: "p1",
            quantidade: 2,
            precoUnit: 10,
            produto: { precoBase: 9 },
          },
        ],
        regra: { cobraTaxaEntrega: true, valorTaxaEntrega: 5 },
      },
      {
        id: "2",
        dataEntrega: new Date("2026-11-06T12:00:00-03:00"),
        status: "CANCELADO",
        contaAzulCustomerId: "c2",
        itens: [{ quantidade: 99, precoUnit: 99 }],
        regra: null,
      },
    ]);

    const dia = porDia.get("2026-11-06");
    expect(dia?.pedidos).toBe(1);
    expect(dia?.valorItens).toBe(20);
    expect(dia?.valorFrete).toBe(5);
    expect(dia?.valor).toBe(25);

    const semana = resumoFaixa(porDia, clientesPorDia, ["2026-11-06"]);
    expect(semana.clientes).toBe(1);
    expect(semana.valor).toBe(25);
  });
});
