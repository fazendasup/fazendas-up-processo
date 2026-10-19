import { describe, expect, it } from "vitest";
import {
  labelProdutoComPeso,
  nomeProdutoParaExibicao,
  nomeProdutoSemCodigoCa,
  partesProdutoComPeso,
  pesoDoProduto,
  pesoDoProdutoComCatalogo,
} from "./produtoPeso";

describe("pesoDoProduto", () => {
  it("lê gramas e quilos no nome", () => {
    expect(pesoDoProduto("Alface Americana 100g")).toBe("100 g");
    expect(pesoDoProduto("Mix Clássico 1,5kg")).toBe("1,5 kg");
  });

  it("marca venda por quilo", () => {
    expect(pesoDoProduto("Baby Leaf -Manjericão", "KG")).toBe("por kg");
  });
});

describe("nomeProdutoSemCodigoCa", () => {
  it("remove SKU Conta Azul do nome", () => {
    expect(nomeProdutoSemCodigoCa("Alface Americana (ALFAC16)")).toBe(
      "Alface Americana",
    );
    expect(nomeProdutoSemCodigoCa("Alface Crespa Verde (ALFAC12)")).toBe(
      "Alface Crespa Verde",
    );
  });

  it("não remove texto legível entre parênteses", () => {
    expect(nomeProdutoSemCodigoCa("Mix (salada completa)")).toBe(
      "Mix (salada completa)",
    );
  });
});

describe("labelProdutoComPeso", () => {
  it("coloca o peso depois do nome e remove SKU", () => {
    expect(labelProdutoComPeso("Alface Americana 100g")).toBe(
      "Alface Americana · 100 g",
    );
    expect(labelProdutoComPeso("Alface Americana (ALFAC16)", "KG")).toBe(
      "Alface Americana · por kg",
    );
  });

  it("herda peso de outro produto do catálogo com mesmo nome-base", () => {
    const catalogo = [
      { nome: "Alface Crespa Verde 100g", modoCompra: "UNIDADE" },
      { nome: "Alface Crespa Verde (ALFAC12)", modoCompra: "UNIDADE" },
    ];
    expect(
      labelProdutoComPeso("Alface Crespa Verde (ALFAC12)", "UNIDADE", catalogo),
    ).toBe("Alface Crespa Verde · 100 g");
  });
});

describe("pesoDoProdutoComCatalogo", () => {
  it("prefers peso numérico ao herdar", () => {
    const catalogo = [
      { nome: "Alface Americana · por kg", modoCompra: "KG" },
      { nome: "Alface Americana 100g", modoCompra: "UNIDADE" },
      { nome: "Alface Americana (ALFAC16)", modoCompra: "UNIDADE" },
    ];
    expect(
      pesoDoProdutoComCatalogo(
        "Alface Americana (ALFAC16)",
        "UNIDADE",
        catalogo,
      ),
    ).toBe("100 g");
  });
});

describe("partesProdutoComPeso", () => {
  it("separa nome e peso para badge", () => {
    expect(partesProdutoComPeso("Alface Crespa Verde 100g")).toEqual({
      nome: "Alface Crespa Verde",
      peso: "100 g",
      label: "Alface Crespa Verde · 100 g",
    });
  });
});

describe("nomeProdutoParaExibicao", () => {
  it("limpa SKU e gramas", () => {
    expect(nomeProdutoParaExibicao("Alface Americana (ALFAC16) 100g")).toBe(
      "Alface Americana",
    );
  });
});
