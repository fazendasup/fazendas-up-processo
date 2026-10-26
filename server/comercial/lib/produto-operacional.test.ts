import { describe, expect, it } from "vitest";
import {
  categoriaCatalogoOperacional,
  criarIndiceProdutosOperacionais,
  criarResolverChaveItemConciliacao,
} from "./produto-operacional";

describe("categoriaCatalogoOperacional", () => {
  it("usa a categoria salva no catálogo operacional (Pedidos → Produtos)", () => {
    const indice = criarIndiceProdutosOperacionais([
      {
        id: "p1",
        nome: "Alface Americana",
        sku: "SKU-1",
        contaAzulProdutoId: "ca-1",
        ativo: true,
        importadoOperacao: true,
        categoria: "Folhas",
      },
    ]);

    expect(
      categoriaCatalogoOperacional(indice, { produto: "Alface Americana" }),
    ).toBe("Folhas");
    expect(
      categoriaCatalogoOperacional(indice, {
        produto: "outro nome",
        sku: "ca-1",
      }),
    ).toBe("Folhas");
  });
});

describe("criarResolverChaveItemConciliacao", () => {
  it("casa item da Conta Azul por nome quando SKU/ID não estão mapeados", () => {
    const resolver = criarResolverChaveItemConciliacao([
      {
        id: "produto-operacional-1",
        nome: "Mix Crocante - Base para Salada",
        sku: null,
        contaAzulProdutoId: null,
        ativo: true,
        importadoOperacao: true,
        categoria: "mix",
      } as any,
    ]);

    expect(
      resolver("operacional", {
        produtoId: "produto-operacional-1",
        produtoNome: "Mix Crocante - Base para Salada",
      }),
    ).toBe("pid:produto-operacional-1");
    expect(
      resolver("contaAzul", {
        produto: "Mix Crocante - Base para Salada",
        sku: "sku-conta-azul-nao-mapeado",
      }),
    ).toBe("pid:produto-operacional-1");
  });
});
