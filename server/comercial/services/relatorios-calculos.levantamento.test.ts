import { describe, expect, it } from "vitest";
import { montarLevantamentoUnidades } from "./relatorios-calculos";

describe("montarLevantamentoUnidades", () => {
  it("parte o volume em quinzenas e ordena pela participação", () => {
    const levantamento = montarLevantamentoUnidades([
      {
        dataPedido: new Date("2026-09-10T15:00:00.000Z"),
        clienteId: "a",
        clienteNome: "Manauara",
        itens: [{ quantidade: 10, precoUnit: 6.8 }],
      },
      {
        dataPedido: new Date("2026-09-20T15:00:00.000Z"),
        clienteId: "a",
        clienteNome: "Manauara",
        itens: [{ quantidade: 5, precoUnit: 6.8 }],
      },
      {
        dataPedido: new Date("2026-09-18T15:00:00.000Z"),
        clienteId: "b",
        clienteNome: "Plaza",
        itens: [{ quantidade: 5, precoUnit: 6.8 }],
      },
    ]);

    expect(levantamento.volumeQ1).toBe(10);
    expect(levantamento.volumeQ2).toBe(10);
    expect(levantamento.volumeTotal).toBe(20);
    expect(levantamento.faturamentoTotal).toBe(136);
    expect(levantamento.precoMedio).toBe(6.8);
    expect(levantamento.variacaoVolumeQ2).toBe(0);
    expect(levantamento.linhas.map(linha => linha.cliente)).toEqual(["Manauara", "Plaza"]);
    expect(levantamento.linhas[0]).toMatchObject({ q1: 10, q2: 5, totalUn: 15, share: 0.75 });
    expect(levantamento.top3.nomes).toBe("Manauara + Plaza");
    expect(levantamento.top3.share).toBe(1);
  });
});
