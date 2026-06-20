import { describe, expect, it } from "vitest";
import {
  inferirGrupoCustoDeTextoContaAzul,
  somarOverheadItensIncluidos,
} from "./custosRentabilidadeOverhead";

describe("somarOverheadItensIncluidos", () => {
  it("soma apenas itens incluídos", () => {
    expect(
      somarOverheadItensIncluidos([
        { valor: 100, incluido: true },
        { valor: 50, incluido: false },
        { valor: 25.5, incluido: true },
      ]),
    ).toBe(125.5);
  });
});

describe("inferirGrupoCustoDeTextoContaAzul", () => {
  it("classifica categorias comuns", () => {
    expect(inferirGrupoCustoDeTextoContaAzul("Combustível diesel frota")).toBe("logistica");
    expect(inferirGrupoCustoDeTextoContaAzul("Consultoria BPO contabil")).toBe("overhead");
    expect(inferirGrupoCustoDeTextoContaAzul("Folha salarial CLT")).toBe("mao_de_obra");
  });
});
