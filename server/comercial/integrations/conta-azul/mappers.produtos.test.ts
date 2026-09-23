import { describe, expect, it } from "vitest";
import { mapProdutoContaAzulItem } from "./mappers";

describe("mapProdutoContaAzulItem", () => {
  it("aceita PRODUTO, VARIACAO_PRODUTO, KIT_PRODUTO e outros tipos com id+nome", () => {
    const base = { id: "ca-1", nome: "Mix Clássico 500g", codigo: "MIXCL4" };
    expect(mapProdutoContaAzulItem({ ...base, tipo: "PRODUTO" })?.id).toBe("ca-1");
    expect(mapProdutoContaAzulItem({ ...base, tipo: "KIT_PRODUTO" })?.codigo).toBe(
      "MIXCL4",
    );
    expect(mapProdutoContaAzulItem({ ...base, tipo: "SERVICO" })?.nome).toBe(
      "Mix Clássico 500g",
    );
  });

  it("lê sku quando codigo ausente", () => {
    expect(
      mapProdutoContaAzulItem({
        id: "ca-3",
        nome: "Mix",
        sku: "MIXCL4",
        tipo: "PRODUTO",
      })?.codigo,
    ).toBe("MIXCL4");
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

  it("exige id e nome", () => {
    expect(mapProdutoContaAzulItem({ id: "x", nome: "" })).toBeNull();
    expect(mapProdutoContaAzulItem({ nome: "Só nome" })).toBeNull();
  });
});
