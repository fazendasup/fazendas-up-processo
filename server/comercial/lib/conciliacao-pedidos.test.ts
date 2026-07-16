import { describe, expect, it } from "vitest";
import {
  calcularDivergencias,
  calcularDivergenciasAgregadas,
  clienteAcumulaFaturamento,
  consolidarDivergenciasEspelhadas,
  janelaCandidatosVinculo,
  opcoesCalcularDivergenciasParaPar,
  scoreCandidatoVinculoManual,
  scoreSugestaoVinculo,
} from "./conciliacao-pedidos";

describe("clienteAcumulaFaturamento", () => {
  it("ignora flag residual fora da allowlist quando o nome é informado", () => {
    expect(
      clienteAcumulaFaturamento(
        { acumulaPedidos: true },
        "Banzeiro Cozinha Amazônica",
      ),
    ).toBe(false);
    expect(clienteAcumulaFaturamento({ acumulaPedidos: true }, "Licco Casa Gourmet")).toBe(true);
  });
});

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

  it("não acusa valor_estimado quando as quantidades batem (frete/desconto/arredondamento)", () => {
    const operacional = {
      dataEntrega: new Date("2026-06-15T12:00:00Z"),
      freteCortesia: false,
      snapshotConciliacao: null,
      itens: [{ produtoNome: "Alface", quantidade: 10, precoUnit: 5 }],
    };
    const contaAzul = {
      dataPedido: new Date("2026-06-15T12:00:00Z"),
      valorFrete: 12,
      valorLiquido: 58,
      valorTotal: 58,
      cliente: {
        regraComercial: {
          cobraTaxaEntrega: false,
          valorTaxaEntrega: null,
        },
      },
      itens: [{ produto: "Alface", sku: null, quantidade: 10 }],
    };

    expect(
      calcularDivergencias(operacional as any, contaAzul as any, undefined, {
        compararData: true,
        compararItens: true,
        compararValorEstimado: true,
      }),
    ).toHaveLength(0);
  });

  it("mantém valor_estimado quando há divergência de quantidade", () => {
    const operacional = {
      dataEntrega: new Date("2026-06-15T12:00:00Z"),
      freteCortesia: false,
      snapshotConciliacao: null,
      itens: [{ produtoNome: "Alface", quantidade: 8, precoUnit: 5 }],
    };
    const contaAzul = {
      dataPedido: new Date("2026-06-15T12:00:00Z"),
      valorFrete: 0,
      valorLiquido: 50,
      valorTotal: 50,
      cliente: {
        regraComercial: {
          cobraTaxaEntrega: false,
          valorTaxaEntrega: null,
        },
      },
      itens: [{ produto: "Alface", sku: null, quantidade: 10 }],
    };

    const out = calcularDivergencias(operacional as any, contaAzul as any, undefined, {
      compararData: true,
      compararItens: true,
      compararValorEstimado: true,
    });
    expect(out.some((d) => d.campo.startsWith("item:"))).toBe(true);
    expect(out.some((d) => d.campo === "valor_estimado")).toBe(true);
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

  it("compara soma de entregas com faturamento acumulado", () => {
    const entrega = (data: string, rucula: number, manjericao: number) => ({
      dataEntrega: new Date(`${data}T12:00:00Z`),
      freteCortesia: false,
      snapshotConciliacao: null,
      itens: [
        { produtoId: "p1", produtoNome: "Rúcula", quantidade: rucula, precoUnit: 5 },
        {
          produtoId: "p2",
          produtoNome: "Manjericão Folha Fina 60g",
          quantidade: manjericao,
          precoUnit: 8,
        },
      ],
      cliente: { externalId: "c1", nome: "Cliente" },
    });
    const operacionais = [
      entrega("2026-06-12", 10, 5),
      entrega("2026-06-13", 10, 5),
      entrega("2026-06-14", 10, 5),
      entrega("2026-06-15", 10, 5),
      entrega("2026-06-16", 10, 5),
    ];
    const contaAzul = {
      dataPedido: new Date("2026-06-16T12:00:00Z"),
      valorFrete: 0,
      valorLiquido: 450,
      valorTotal: 450,
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

    expect(calcularDivergenciasAgregadas(operacionais as any, contaAzul as any)).toHaveLength(0);

    const divergente = calcularDivergenciasAgregadas(
      [operacionais[0]!] as any,
      contaAzul as any,
    );
    expect(divergente.some((d) => d.campo.startsWith("item:"))).toBe(true);
  });

  it("scoreSugestaoVinculo trata mesmo dia no calendário UTC", () => {
    const operacional = {
      dataEntrega: new Date("2026-06-08T00:00:00Z"),
      contaAzulCustomerId: "cliente-1",
      itens: [{ produtoId: "p1", produtoNome: "Rúcula", quantidade: 7 }],
    };
    const contaAzul = {
      dataPedido: new Date("2026-06-08T15:00:00Z"),
      statusPedido: "VENDA",
      cliente: { externalId: "cliente-1", regraComercial: { acumulaPedidos: false } },
      itens: [{ produto: "Rúcula", sku: null, quantidade: 7 }],
    };

    expect(scoreSugestaoVinculo(operacional as any, contaAzul as any)).toBeGreaterThanOrEqual(75);
    expect(scoreCandidatoVinculoManual(operacional as any, contaAzul as any)).toBeGreaterThanOrEqual(70);
  });

  it("scoreCandidatoVinculoManual zera dias diferentes sem acúmulo", () => {
    const operacional = {
      dataEntrega: new Date("2026-07-09T12:00:00Z"),
      contaAzulCustomerId: "cliente-1",
      itens: [{ produtoId: "p1", produtoNome: "Alface", quantidade: 8 }],
    };
    const contaAzul = {
      dataPedido: new Date("2026-07-07T12:00:00Z"),
      statusPedido: "VENDA",
      cliente: {
        externalId: "cliente-1",
        nome: "Banzeiro Cozinha Amazônica",
        regraComercial: { acumulaPedidos: true },
      },
      itens: [{ produto: "Alface", sku: null, quantidade: 8 }],
    };
    // Flag residual true, mas fora da allowlist → trata como sem acúmulo → dia diferente = 0
    expect(scoreCandidatoVinculoManual(operacional as any, contaAzul as any)).toBe(0);
  });

  it("janelaCandidatosVinculo sem acúmulo fica no mesmo dia", () => {
    const data = new Date("2026-07-09T15:30:00Z");
    const j = janelaCandidatosVinculo({ dataPedido: data, acumula: false });
    expect(j.inicio.toISOString().slice(0, 10)).toBe("2026-07-09");
    expect(j.fim.toISOString().slice(0, 10)).toBe("2026-07-09");
  });

  it("janelaCandidatosVinculo com acúmulo cobre o período para frente (venda antecipada)", () => {
    const j = janelaCandidatosVinculo({
      dataPedido: new Date("2026-07-01T12:00:00Z"),
      acumula: true,
      diasAcumulo: 31,
    });
    expect(j.fim.toISOString().slice(0, 10)).toBe("2026-07-31");
  });

  it("divergência agregada tolera entrega parcial de cliente com faturamento antecipado", () => {
    const entrega = (data: string, qtd: number) => ({
      dataEntrega: new Date(`${data}T12:00:00Z`),
      freteCortesia: false,
      snapshotConciliacao: null,
      itens: [{ produtoId: "p1", produtoNome: "Pão Italiano", quantidade: qtd, precoUnit: 10 }],
      cliente: { externalId: "c1", nome: "Padoca Pão e Companhia" },
    });
    const vendaMes = {
      dataPedido: new Date("2026-07-01T12:00:00Z"),
      valorFrete: 0,
      valorLiquido: 1000,
      valorTotal: 1000,
      cliente: {
        externalId: "c1",
        nome: "Padoca Pão e Companhia",
        regraComercial: {
          acumulaPedidos: true,
          cobraTaxaEntrega: false,
          valorTaxaEntrega: null,
        },
      },
      itens: [{ produto: "Pão Italiano", sku: null, quantidade: 100, precoUnit: 10 }],
    };

    // Meio do mês: só 40 de 100 entregues — sem divergência (saldo a entregar).
    const parcial = calcularDivergenciasAgregadas(
      [entrega("2026-07-06", 20), entrega("2026-07-13", 20)] as any,
      vendaMes as any,
    );
    expect(parcial).toHaveLength(0);

    // Excesso sobre a venda continua apontado.
    const excesso = calcularDivergenciasAgregadas(
      [entrega("2026-07-06", 70), entrega("2026-07-13", 60)] as any,
      vendaMes as any,
    );
    expect(excesso.some((d) => d.campo.startsWith("item:"))).toBe(true);
  });
});
