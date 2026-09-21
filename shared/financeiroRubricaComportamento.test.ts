import { describe, expect, it } from "vitest";
import {
  comportamentoDaRubrica,
  inferirComportamentoCustoHeuristico,
  mapaComportamentoPorRubrica,
  resolverComportamentoCusto,
} from "./financeiroRubricaComportamento";

describe("inferirComportamentoCustoHeuristico", () => {
  it("classifica estrutura/obrigações como fixo", () => {
    expect(inferirComportamentoCustoHeuristico("Energia elétrica")).toBe("fixo");
    expect(inferirComportamentoCustoHeuristico("Folha de pagamento")).toBe(
      "fixo",
    );
    expect(inferirComportamentoCustoHeuristico("Aluguel")).toBe("fixo");
  });

  it("classifica insumos/volume como variável", () => {
    expect(inferirComportamentoCustoHeuristico("Insumos")).toBe("variavel");
    expect(inferirComportamentoCustoHeuristico("Frete")).toBe("variavel");
    expect(inferirComportamentoCustoHeuristico("Publicidade")).toBe("variavel");
  });
});

describe("resolverComportamentoCusto / override", () => {
  it("override ganha da heurística", () => {
    expect(resolverComportamentoCusto("Publicidade", "fixo")).toBe("fixo");
    expect(resolverComportamentoCusto("Energia", "variavel")).toBe("variavel");
  });

  it("mapa normaliza chave e aplica override", () => {
    const mapa = mapaComportamentoPorRubrica([
      { rubrica: "  Publicidade  ", comportamentoCusto: "fixo" },
    ]);
    expect(comportamentoDaRubrica("publicidade", mapa)).toBe("fixo");
    expect(comportamentoDaRubrica("Energia elétrica", mapa)).toBe("fixo");
  });
});
