import { describe, expect, it } from "vitest";
import {
  labelProdutoComPeso,
  nomeProdutoSemPeso,
  partesProdutoComPeso,
  pesoDoProduto,
} from "./produtoPeso";

describe("pesoDoProduto", () => {
  it("lê gramas e quilos no nome", () => {
    expect(pesoDoProduto("Alface Americana 100g")).toBe("100 g");
    expect(pesoDoProduto("Cebola Branca Higienizada e Descascada- 200G")).toBe("200 g");
    expect(pesoDoProduto("Mix Clássico 1,5kg")).toBe("1,5 kg");
  });

  it("marca venda por quilo", () => {
    expect(pesoDoProduto("Baby Leaf -Manjericão", "KG")).toBe("por kg");
  });

  it("devolve null quando não há peso", () => {
    expect(pesoDoProduto("Mix Clássico- Salada Completa", "UNIDADE")).toBeNull();
  });
});

describe("labelProdutoComPeso", () => {
  it("coloca o peso depois do nome", () => {
    expect(labelProdutoComPeso("Alface Americana 100g")).toBe(
      "Alface Americana · 100 g",
    );
    expect(labelProdutoComPeso("Mix Clássico 1,5kg")).toBe("Mix Clássico · 1,5 kg");
  });

  it("anexa por kg quando só o modo indica", () => {
    expect(labelProdutoComPeso("Baby Leaf -Manjericão", "KG")).toBe(
      "Baby Leaf Manjericão · por kg",
    );
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

describe("nomeProdutoSemPeso", () => {
  it("remove gramas do final", () => {
    expect(nomeProdutoSemPeso("Alface Americana 100g")).toBe("Alface Americana");
  });
});
