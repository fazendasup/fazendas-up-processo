import { describe, expect, it } from "vitest";
import {
  classificarClienteSemanal,
  classificarClienteNaoAcumuladorPorDatas,
  avaliarClienteNaoAcumuladorPorDatas,
  documentoEntraTotalConciliacaoSemanal,
  pedidosOperacionaisEfetivos,
  pedidosOperacionaisSemanaEfetivos,
  totaisOperacionaisAcumuladorSemanaFaturada,
  totaisOperacionaisClienteSemanal,
} from "./conciliacao-semanal.js";
import { pedidoCriadoAPartirDoContaAzul } from "./conciliacao-pedidos.js";

function op(
  id: string,
  opts: {
    pedidoContaAzulId?: string | null;
    espelho?: boolean;
    unidades?: number;
    valorItem?: number;
    freteCortesia?: boolean;
    status?: string;
    dataEntrega?: Date;
  } = {},
) {
  const un = opts.unidades ?? 10;
  const pu = opts.valorItem ?? 1;
  return {
    id,
    dataEntrega: opts.dataEntrega ?? new Date("2026-06-16"),
    status: opts.status ?? "ENTREGUE",
    freteCortesia: opts.freteCortesia ?? false,
    pedidoContaAzulId: opts.pedidoContaAzulId ?? null,
    pedidoContaAzul: null,
    contaAzulCustomerId: "cli-1",
    cliente: null,
    snapshotConciliacao: opts.espelho ? { operacional: null, contaAzul: {} } : {},
    itens: [{ quantidade: un, precoUnit: pu }],
  };
}

describe("totaisOperacionaisClienteSemanal", () => {
  it("acumulador: espelho CA não entra no total — só entregas manuais", () => {
    const totais = totaisOperacionaisClienteSemanal(
      [
        op("m1", { unidades: 31 }),
        op("m2", { unidades: 31 }),
        op("esp", { espelho: true, unidades: 62, pedidoContaAzulId: "ca-1" }),
      ],
      true,
      { cobraTaxaEntrega: false, valorTaxaEntrega: null, acumulaPedidos: true },
      undefined,
    );
    expect(totais.unidades).toBe(62);
    expect(totais.valorEstimado).toBe(62);
  });

  it("acumulador: frete uma vez no total da semana", () => {
    const totais = totaisOperacionaisClienteSemanal(
      [op("m1", { unidades: 30, valorItem: 10 }), op("m2", { unidades: 32, valorItem: 10 })],
      true,
      { cobraTaxaEntrega: true, valorTaxaEntrega: 15, acumulaPedidos: true },
      undefined,
    );
    expect(totais.unidades).toBe(62);
    expect(totais.valorEstimado).toBeCloseTo(635);
  });

  it("vínculo múltiplo sem CA: soma itens do grupo e frete único", () => {
    const totais = totaisOperacionaisClienteSemanal(
      [
        op("m1", { pedidoContaAzulId: "ca-1", unidades: 40 }),
        op("m2", { pedidoContaAzulId: "ca-1", unidades: 22 }),
      ],
      true,
      { cobraTaxaEntrega: true, valorTaxaEntrega: 10, acumulaPedidos: true },
      undefined,
    );
    expect(totais.unidades).toBe(62);
    expect(totais.valorEstimado).toBeCloseTo(72);
  });

  it("vínculo múltiplo: usa líquido CA quando disponível", () => {
    const withCa = (id: string, unidades: number) => ({
      ...op(id, { pedidoContaAzulId: "ca-1", unidades }),
      pedidoContaAzul: { valorLiquido: 99.9, valorTotal: 99.9 },
    });
    const totais = totaisOperacionaisClienteSemanal(
      [withCa("m1", 40), withCa("m2", 22)],
      false,
      { cobraTaxaEntrega: true, valorTaxaEntrega: 10, acumulaPedidos: false },
      undefined,
    );
    expect(totais.unidades).toBe(62);
    expect(totais.valorEstimado).toBeCloseTo(99.9);
  });
});

describe("pedidosOperacionaisSemanaEfetivos", () => {
  it("exclui espelhos CA quando acumula", () => {
    const pedidos = [
      op("m1"),
      op("esp", { espelho: true, pedidoContaAzulId: "ca-1" }),
    ];
    expect(pedidosOperacionaisSemanaEfetivos(pedidos, true).length).toBe(1);
    expect(pedidosOperacionaisSemanaEfetivos(pedidos, false).length).toBe(2);
  });
});

describe("pedidosOperacionaisEfetivos", () => {
  it("conta vínculos únicos CA + pedidos sem vínculo", () => {
    expect(
      pedidosOperacionaisEfetivos([
        { pedidoContaAzulId: "ca-1" },
        { pedidoContaAzulId: "ca-1" },
        { pedidoContaAzulId: "ca-2" },
        { pedidoContaAzulId: null },
      ]),
    ).toBe(3);
  });
});

describe("documentoEntraTotalConciliacaoSemanal", () => {
  it("inclui vendas faturadas", () => {
    expect(documentoEntraTotalConciliacaoSemanal("VENDA")).toBe(true);
    expect(documentoEntraTotalConciliacaoSemanal("Venda faturada")).toBe(true);
  });

  it("exclui orçamentos mesmo em clientes acumuladores (3 orçamentos + venda total)", () => {
    expect(documentoEntraTotalConciliacaoSemanal("ORÇAMENTO")).toBe(false);
    expect(documentoEntraTotalConciliacaoSemanal("Orcamento")).toBe(false);
  });
});

describe("totaisOperacionaisAcumuladorSemanaFaturada", () => {
  it("soma todas as entregas manuais mesmo vinculadas a orçamentos diários distintos", () => {
    const totais = totaisOperacionaisAcumuladorSemanaFaturada(
      [
        op("d1", { pedidoContaAzulId: "venda-consolidada", unidades: 120, valorItem: 10 }),
        op("d2", { pedidoContaAzulId: "orcamento-16", unidades: 40, valorItem: 10 }),
        op("d3", { pedidoContaAzulId: "orcamento-19", unidades: 30, valorItem: 10 }),
      ],
      { cobraTaxaEntrega: true, valorTaxaEntrega: 15, acumulaPedidos: true },
      undefined,
    );
    expect(totais.unidades).toBe(190);
    expect(totais.valorEstimado).toBeCloseTo(1915);
  });
});

describe("classificarClienteSemanal", () => {
  it("ok quando unidades e valor batem apesar de mais entregas que vendas", () => {
    expect(classificarClienteSemanal(2, 1, 0, 0)).toBe("ok");
  });

  it("ok quando unidades batem mesmo com diferença de valor (frete/desconto)", () => {
    expect(classificarClienteSemanal(1, 1, 0, 42.5)).toBe("ok");
  });

  it("não marca aguardando venda quando já há faturamento CA", () => {
    expect(classificarClienteSemanal(2, 1, 10, 0)).toBe("divergente");
  });

  it("aguardando venda só sem documento CA na semana", () => {
    expect(classificarClienteSemanal(2, 0, 15, 100)).toBe("aguardando_venda");
  });

  it("venda sem pedido quando só há CA", () => {
    expect(classificarClienteSemanal(0, 1, -5, -10)).toBe("venda_sem_pedido");
  });
});

describe("classificarClienteNaoAcumuladorPorDatas", () => {
  it("não mistura venda de outro dia com pedido conciliado do dia", () => {
    const status = classificarClienteNaoAcumuladorPorDatas({
      operacionais: [
        {
          dataEntrega: new Date("2026-07-09T12:00:00Z"),
          status: "ENTREGUE",
          pedidoContaAzulId: "4549",
          itens: [{ quantidade: 8 }],
        },
      ],
      vendas: [
        { dataPedido: new Date("2026-07-09T12:00:00Z"), unidades: 8 },
        { dataPedido: new Date("2026-07-07T12:00:00Z"), unidades: 41 },
      ],
    });
    expect(status).toBe("venda_sem_pedido");
  });

  it("marca divergente só quando o mesmo dia tem quantidade diferente", () => {
    const status = classificarClienteNaoAcumuladorPorDatas({
      operacionais: [
        {
          dataEntrega: new Date("2026-07-09T12:00:00Z"),
          status: "ENTREGUE",
          pedidoContaAzulId: "4549",
          itens: [{ quantidade: 8 }],
        },
      ],
      vendas: [{ dataPedido: new Date("2026-07-09T12:00:00Z"), unidades: 10 }],
    });
    expect(status).toBe("divergente");
  });

  it("ok quando cada dia bate individualmente", () => {
    const status = classificarClienteNaoAcumuladorPorDatas({
      operacionais: [
        {
          dataEntrega: new Date("2026-07-07T12:00:00Z"),
          status: "ENTREGUE",
          pedidoContaAzulId: "4510",
          itens: [{ quantidade: 41 }],
        },
        {
          dataEntrega: new Date("2026-07-09T12:00:00Z"),
          status: "ENTREGUE",
          pedidoContaAzulId: "4549",
          itens: [{ quantidade: 8 }],
        },
      ],
      vendas: [
        { dataPedido: new Date("2026-07-07T12:00:00Z"), unidades: 41 },
        { dataPedido: new Date("2026-07-09T12:00:00Z"), unidades: 8 },
      ],
    });
    expect(status).toBe("ok");
  });
});

describe("avaliarClienteNaoAcumuladorPorDatas", () => {
  it("Villa Amazonia: métricas só do dia com problema (não mistura 07 ok com 10)", () => {
    const avaliacao = avaliarClienteNaoAcumuladorPorDatas({
      operacionais: [
        {
          dataEntrega: new Date("2026-07-07T12:00:00Z"),
          status: "ENTREGUE",
          pedidoContaAzulId: "4525",
          itens: [{ quantidade: 10, precoUnit: 9.09 }],
        },
      ],
      vendas: [
        {
          dataPedido: new Date("2026-07-07T12:00:00Z"),
          unidades: 10,
          valorLiquido: 90.9,
        },
        {
          dataPedido: new Date("2026-07-10T12:00:00Z"),
          unidades: 14,
          valorLiquido: 123.76,
        },
      ],
    });

    expect(avaliacao.status).toBe("venda_sem_pedido");
    expect(avaliacao.operacional.pedidos).toBe(0);
    expect(avaliacao.contaAzul.pedidos).toBe(1);
    expect(avaliacao.operacional.unidades).toBe(0);
    expect(avaliacao.contaAzul.unidades).toBe(14);
    expect(avaliacao.diasProblema).toHaveLength(1);
    expect(avaliacao.diasProblema[0]?.dia).toBe("2026-07-10");
    expect(avaliacao.detalhe).toContain("10/07/2026");
    expect(avaliacao.detalhe).not.toContain("07/07/2026");
  });

  it("não marca ok se há venda CA sem OP mesmo com unidades 0", () => {
    const avaliacao = avaliarClienteNaoAcumuladorPorDatas({
      operacionais: [],
      vendas: [
        { dataPedido: new Date("2026-07-10T12:00:00Z"), unidades: 0, valorLiquido: 0 },
      ],
    });
    expect(avaliacao.status).toBe("venda_sem_pedido");
    expect(avaliacao.contaAzul.pedidos).toBe(1);
  });
});
