import { describe, expect, it } from "vitest";
import {
  CATEGORIAS_OPERACAO,
  categoriaOperacaoDoProduto,
} from "./produtoCategoriaOperacao";

describe("categoriaOperacaoDoProduto", () => {
  it("respeita categoria cadastrada", () => {
    expect(categoriaOperacaoDoProduto("Qualquer", "Folhas")).toBe("Folhas");
    expect(categoriaOperacaoDoProduto("X", "Desfolhado")).toBe("Folhas");
    expect(categoriaOperacaoDoProduto("X", "mix")).toBe("Saladas (mix)");
  });

  it("infere pelo nome", () => {
    expect(categoriaOperacaoDoProduto("Alface Americana 100g")).toBe("Folhas");
    expect(categoriaOperacaoDoProduto("Rúcula / Microverdes 30g")).toBe(
      "Microverdes",
    );
    expect(categoriaOperacaoDoProduto("Beterraba  / Broto 30g")).toBe(
      "Microverdes",
    );
    expect(categoriaOperacaoDoProduto("Mix de flores / Restaurante")).toBe(
      "Flores",
    );
    expect(
      categoriaOperacaoDoProduto("Cenoura 3A - Descascada, fatiada e higienizada 1kg"),
    ).toBe("Minimamente processados");
    expect(categoriaOperacaoDoProduto("Tomate Regional")).toBe("In natura");
    expect(categoriaOperacaoDoProduto("Hortelã 60g")).toBe("Ervas");
    expect(categoriaOperacaoDoProduto("Mix Clássico 500g")).toBe(
      "Saladas (mix)",
    );
  });

  it("lista canônica tem as 7 categorias pedidas", () => {
    expect([...CATEGORIAS_OPERACAO]).toEqual([
      "Folhas",
      "Microverdes",
      "Flores",
      "Minimamente processados",
      "In natura",
      "Ervas",
      "Saladas (mix)",
    ]);
  });
});
