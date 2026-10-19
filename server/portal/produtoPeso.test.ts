import { describe, expect, it } from "vitest";
import { pesoDoProduto } from "./produtoPeso";

describe("pesoDoProduto (portal reexport)", () => {
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
