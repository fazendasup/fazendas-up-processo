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

  it("default status ATIVO quando a API omite o campo", () => {
    expect(
      mapProdutoContaAzulItem({
        id: "ca-2",
        nome: "Mix Clássico 500g",
        tipo: "PRODUTO",
      })?.status,
    ).toBe("ATIVO");
  });

  it("aceita id numérico (coerce para string)", () => {
    expect(
      mapProdutoContaAzulItem({
        id: 12345,
        nome: "Mix Clássico 500g",
        tipo: "PRODUTO",
      })?.id,
    ).toBe("12345");
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
