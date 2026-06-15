import { describe, expect, it } from "vitest";
import { consolidarDivergenciasEspelhadas } from "./conciliacao-pedidos";

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
