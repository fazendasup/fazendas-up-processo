import { describe, expect, it } from "vitest";
import {
  extrairItensOrdemCompraRel,
  extrairItensTotvsRelPedSuprim,
  extrairPedidoDoTexto,
  matchClienteImport,
  matchProdutoImport,
  parseQuantidadeProxima,
  stripPesoDoNome,
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
    { id: "p3", nome: "Alho Higienizado 150G", sku: "ALHOH1" },
  ];

  it("resolve por nome", () => {
    const r = matchProdutoImport(produtos, "alface crespa unidade");
    expect(r.status).toBe("ok");
    expect(r.produtoId).toBe("p1");
  });

  it("resolve por sku", () => {
    const r = matchProdutoImport(produtos, "qualquer", "ALHOH1");
    expect(r.produtoId).toBe("p3");
  });
});

describe("peso vs quantidade", () => {
  it("stripPesoDoNome remove 150G", () => {
    expect(stripPesoDoNome("ALHO HIGIENIZADO E DESCASCADO 150G")).toBe(
      "ALHO HIGIENIZADO E DESCASCADO",
    );
  });

  it("parseQuantidadeProxima não usa gramas", () => {
    expect(parseQuantidadeProxima("ALHO HIGIENIZADO E DESCASCADO 150G")).toBeNull();
    expect(parseQuantidadeProxima(",0001,00010,000 ALHOH1")).toEqual({
      quantidade: 10,
      unidade: null,
    });
    expect(parseQuantidadeProxima("12 un")).toEqual({ quantidade: 12, unidade: "un" });
  });
});

describe("extrairItensOrdemCompraRel (Vitória)", () => {
  it("lê qtd 10 do alho e não 150 do peso", () => {
    const texto = `
6398910,0001,00010,000
ALHOH1
7898976932318
ALHO HIGIENIZADO E DESCASCADO 150G
5,6056,00
5568768,0001,0008,000
ALFAC16
7898976932219
ALFACE AMERICANA UP 120GR
8,8971,12
`;
    const itens = extrairItensOrdemCompraRel(texto);
    const alho = itens.find((i) => /alho/i.test(i.nome));
    expect(alho?.quantidade).toBe(10);
    expect(alho?.sku).toBe("ALHOH1");
    expect(itens.find((i) => /alface americana/i.test(i.nome))?.quantidade).toBe(8);
  });
});

describe("extrairItensTotvsRelPedSuprim", () => {
  it("lê qtd antes de UN e soma pátios", () => {
    const texto = `
PEDIDO DE  COMPRAS
5789745
4,51005,0
0UN  1AGRIAO
FAZENDAS UP60G - REF:AGRIO3
8,890010,
00UN  1ALFACE
AMERICANAFAZENDAS UP120G - REF:ALFAC14
PEDIDO DE  COMPRAS
5789746
4,51005,0
0UN  1AGRIAO
FAZENDAS UP60G - REF:AGRIO3
`;
    const { itens, pedidosDetectados } = extrairItensTotvsRelPedSuprim(texto);
    expect(pedidosDetectados).toBe(2);
    const agriao = itens.find((i) => i.sku === "AGRIO3" || /agriao/i.test(i.nome));
    expect(agriao?.quantidade).toBe(10); // 5+5
    const alface = itens.find((i) => i.sku === "ALFAC14");
    expect(alface?.quantidade).toBe(10);
  });
});

describe("extrairPedidoDoTexto", () => {
  const clientes = [
    {
      externalId: "ca-v",
      nome: "Supermercado Vitória - Turismo",
      cnpjCpf: "07.179.667/0004-95",
    },
  ];
  const produtos = [
    { id: "p1", nome: "Alho Higienizado", sku: "ALHOH1" },
    { id: "p2", nome: "Alface Americana", sku: "ALFAC16" },
  ];

  it("detecta layout Rel_ e não confunde peso", () => {
    const texto = `
Ordem de Compra - SM Vitória III
Empresa:
Supermercado Vitória - Turismo
CNPJ:
07.179.667/0004-95
6398910,0001,00010,000
ALHOH1
7898976932318
ALHO HIGIENIZADO E DESCASCADO 150G
5,6056,00
`;
    const r = extrairPedidoDoTexto(texto, clientes, produtos);
    expect(r.itens.some((i) => i.quantidade === 10 && /alho/i.test(i.nome))).toBe(true);
    expect(r.itens.every((i) => i.quantidade !== 150)).toBe(true);
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
