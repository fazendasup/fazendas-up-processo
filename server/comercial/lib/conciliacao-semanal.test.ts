import { describe, expect, it } from "vitest";
import {
  classificarClienteSemanal,
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

  it("vínculo múltiplo: soma itens do grupo e frete único", () => {
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
