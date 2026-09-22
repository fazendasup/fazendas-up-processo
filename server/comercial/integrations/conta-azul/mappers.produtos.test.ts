import { describe, expect, it } from "vitest";
import { mapProdutoContaAzulItem } from "./mappers";

describe("mapProdutoContaAzulItem", () => {
  it("aceita PRODUTO, VARIACAO_PRODUTO e KIT_PRODUTO", () => {
    const base = { id: "ca-1", nome: "Mix Clássico 500g", codigo: "MIXCL4" };
    expect(mapProdutoContaAzulItem({ ...base, tipo: "PRODUTO" })?.id).toBe("ca-1");
    expect(mapProdutoContaAzulItem({ ...base, tipo: "VARIACAO_PRODUTO" })?.id).toBe(
      "ca-1",
    );
    expect(mapProdutoContaAzulItem({ ...base, tipo: "KIT_PRODUTO" })?.nome).toBe(
      "Mix Clássico 500g",
    );
  });

  it("ignora tipos desconhecidos", () => {
    expect(
      mapProdutoContaAzulItem({
        id: "x",
        nome: "Serviço",
        tipo: "SERVICO",
      }),
    ).toBeNull();
  });
});
