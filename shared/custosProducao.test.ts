import { describe, expect, it } from "vitest";
import { alocarValorPorPesos, pesosRateioPorVariedade } from "./custosProducao";

describe("pesosRateioPorVariedade", () => {
  it("igual: todos peso 1", () => {
    const dados = new Map([
      [1, { plantasOcupadas: 10, kgColheitaPeriodo: 0, plantasColhidasPeriodo: 0 }],
      [2, { plantasOcupadas: 5, kgColheitaPeriodo: 0, plantasColhidasPeriodo: 0 }],
    ]);
    const p = pesosRateioPorVariedade("igual", [1, 2], dados);
    expect(p.get(1)).toBe(1);
    expect(p.get(2)).toBe(1);
  });

  it("capacidade: proporcional a plantas", () => {
    const dados = new Map([
      [1, { plantasOcupadas: 100, kgColheitaPeriodo: 0, plantasColhidasPeriodo: 0 }],
      [2, { plantasOcupadas: 50, kgColheitaPeriodo: 0, plantasColhidasPeriodo: 0 }],
    ]);
    const p = pesosRateioPorVariedade("capacidade", [1, 2], dados);
    const a = alocarValorPorPesos(1500, p);
    expect(a.get(1)).toBe(1000);
    expect(a.get(2)).toBe(500);
  });
});
