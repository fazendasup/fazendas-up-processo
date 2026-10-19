import { describe, expect, it } from "vitest";
import {
  labelProdutoComPeso,
  nomeProdutoSemPeso,
  pesoDoProduto,
} from "./produtoPeso";

describe("pesoDoProduto", () => {
  it("lê gramas e quilos no nome", () => {
    expect(pesoDoProduto("Alface Americana 100g")).toBe("100 g");
    expect(pesoDoProduto("Cebola Branca Higienizada e Descascada- 200G")).toBe("200 g");
    expect(pesoDoProduto("Batata Portuguesa Higienizada e Descascada- 500g")).toBe("500 g");
    expect(pesoDoProduto("Mix Clássico 1,5kg")).toBe("1,5 kg");
    expect(pesoDoProduto("Alface 240g Plano 3")).toBe("240 g");
  });

  it("marca venda por quilo", () => {
    expect(pesoDoProduto("Baby Leaf -Manjericão", "KG")).toBe("por kg");
    expect(pesoDoProduto("Alho Inteiro Descascado e Higienizado Kg", "UNIDADE")).toBe("por kg");
  });

  it("devolve null quando não há peso", () => {
    expect(pesoDoProduto("Mix Clássico- Salada Completa", "UNIDADE")).toBeNull();
    expect(pesoDoProduto("Coentro / Microverdes")).toBeNull();
  });
});

describe("labelProdutoComPeso", () => {
  it("coloca o peso no início para não sumir no truncate", () => {
    expect(labelProdutoComPeso("Alface Americana 100g")).toBe(
      "100 g · Alface Americana",
    );
    expect(labelProdutoComPeso("Mix Clássico 1,5kg")).toBe("1,5 kg · Mix Clássico");
  });

  it("anexa por kg quando só o modo indica", () => {
    expect(labelProdutoComPeso("Baby Leaf -Manjericão", "KG")).toBe(
      "por kg · Baby Leaf Manjericão",
    );
  });

  it("mantém nome sem peso conhecido", () => {
    expect(labelProdutoComPeso("Mix Clássico- Salada Completa", "UNIDADE")).toBe(
      "Mix Clássico- Salada Completa",
    );
  });
});

describe("nomeProdutoSemPeso", () => {
  it("remove gramas do final", () => {
    expect(nomeProdutoSemPeso("Alface Americana 100g")).toBe("Alface Americana");
  });
});
