import { describe, expect, it } from "vitest";
import {
  classeNoRelatorioVendas,
  parseMapaVendasPorClasse,
} from "./relatoriosVendasPorClasse";

describe("classeNoRelatorioVendas", () => {
  it("respeita a categoria operacional quando não há override", () => {
    expect(classeNoRelatorioVendas("Alface Americana", "Folhas")).toBe("Folhas");
    expect(classeNoRelatorioVendas("Tomate", "In natura")).toBe("In natura");
  });

  it("aplica override persistido por produto", () => {
    expect(
      classeNoRelatorioVendas("Alface Americana", "Folhas", {
        produtoParaClasse: { "Alface Americana": "In natura" },
      }),
    ).toBe("In natura");
  });

  it("aplica unificação de classe", () => {
    expect(
      classeNoRelatorioVendas("Microverde de rúcula", "Microverdes", {
        unificarClasse: { Microverdes: "Folhas" },
      }),
    ).toBe("Folhas");
  });
});

describe("parseMapaVendasPorClasse", () => {
  it("ignora valores inválidos", () => {
    expect(
      parseMapaVendasPorClasse({
        produtoParaClasse: { Ok: "Folhas", bad: 1, "": "X" },
        unificarClasse: null,
      }),
    ).toEqual({
      produtoParaClasse: { Ok: "Folhas" },
      unificarClasse: {},
    });
  });
});
