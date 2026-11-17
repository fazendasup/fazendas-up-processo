import { describe, expect, it } from "vitest";
import {
  extrairItensDoTexto,
  extrairPedidoDoTexto,
  matchClienteImport,
  matchProdutoImport,
} from "./importar-pedido-pdf";
import { draftImportProntoParaSalvar } from "@shared/importarPedidoPdf";

describe("matchClienteImport", () => {
  const clientes = [
    { externalId: "ca-1", nome: "Mercado Bom Preço LTDA", cnpjCpf: "12.345.678/0001-90" },
    { externalId: "ca-2", nome: "Hortifruti Central", cnpjCpf: "98.765.432/0001-10" },
  ];

  it("resolve por CNPJ", () => {
    const r = matchClienteImport(clientes, "Qualquer", "12345678000190");
    expect(r.status).toBe("ok");
    expect(r.contaAzulCustomerId).toBe("ca-1");
  });

  it("resolve por nome próximo", () => {
    const r = matchClienteImport(clientes, "Hortifruti Central Manaus", null);
    expect(r.status).toBe("ok");
    expect(r.contaAzulCustomerId).toBe("ca-2");
  });
});

describe("matchProdutoImport", () => {
  const produtos = [
    { id: "p1", nome: "Alface Crespa", sku: "ALC" },
    { id: "p2", nome: "Rúcula Hidropônica", sku: null },
  ];

  it("resolve por nome", () => {
    const r = matchProdutoImport(produtos, "alface crespa unidade");
    expect(r.status).toBe("ok");
    expect(r.produtoId).toBe("p1");
  });

  it("resolve por sku", () => {
    const r = matchProdutoImport(produtos, "ALC");
    expect(r.produtoId).toBe("p1");
  });
});

describe("draftImportProntoParaSalvar", () => {
  it("bloqueia sem cliente", () => {
    const r = draftImportProntoParaSalvar({
      cliente: { contaAzulCustomerId: null },
      itens: [{ produtoId: "p1", quantidade: 1 }],
    });
    expect(r.ok).toBe(false);
  });

  it("aceita draft completo", () => {
    const r = draftImportProntoParaSalvar({
      cliente: { contaAzulCustomerId: "ca-1" },
      itens: [{ produtoId: "p1", quantidade: 2 }],
    });
    expect(r.ok).toBe(true);
  });
});

describe("extrairPedidoDoTexto (sem OpenAI)", () => {
  const clientes = [
    { externalId: "ca-1", nome: "Mercado Bom Preço LTDA", cnpjCpf: "12.345.678/0001-90" },
  ];
  const produtos = [
    { id: "p1", nome: "Alface Crespa", sku: "ALC" },
    { id: "p2", nome: "Rúcula Hidropônica", sku: null },
  ];

  it("acha cliente, data e itens no texto", () => {
    const texto = `
Pedido de compra
Cliente: Mercado Bom Preço LTDA
CNPJ 12.345.678/0001-90
Entrega: 20/11/2026
Alface Crespa 12 un
Rúcula Hidropônica x 5
`;
    const r = extrairPedidoDoTexto(texto, clientes, produtos);
    expect(r.clienteDocumento).toMatch(/12345678000190|12\.345\.678\/0001-90/);
    expect(r.dataEntrega).toBe("2026-11-20");
    expect(extrairItensDoTexto(texto, produtos).length).toBeGreaterThanOrEqual(2);
    expect(r.itens.some((i) => i.nome.includes("Alface"))).toBe(true);
  });
});
