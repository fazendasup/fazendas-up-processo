import { describe, expect, it } from "vitest";
import {
  calcularCustoProduto,
  custoMaterialRevenda,
  custoMaterialRevendaUnidade,
  fatorAproveitamento,
  kgBrutoParaLiquido,
  precoVendaParaMargem,
} from "./custosProduto";

describe("fatorAproveitamento", () => {
  it("combina perdas em série", () => {
    expect(fatorAproveitamento([10, 5])).toBeCloseTo(0.855);
  });
});

describe("custoMaterialRevenda", () => {
  it("calcula custo com perdas", () => {
    const r = custoMaterialRevenda({
      precoCompraKg: 10,
      kgBrutoPorUnidade: 1.2,
      perdasPct: [10, 5],
    });
    expect(r.custo).toBeCloseTo((1.2 / 0.855) * 10);
    expect(r.kgLiquido).toBeCloseTo(1.2);
  });
});

describe("custoMaterialRevendaUnidade", () => {
  it("usa preço por unidade de compra", () => {
    const r = custoMaterialRevendaUnidade({ custoCompraUn: 12, kgPorUnidadeVendida: 0.4 });
    expect(r.custo).toBeCloseTo(12);
    expect(r.kgLiquido).toBeCloseTo(0.4);
  });
});

describe("calcularCustoProduto", () => {
  it("revenda processada com etapas", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "pacote",
      precoVendaReferencia: 15,
      precoCompraKg: 8,
      kgBrutoPorUnidade: 1,
      perdaLavagemPct: 10,
      perdaDescasquePct: 0,
      perdaSelecaoPct: 5,
      componentes: [],
      etapas: [
        { tipo: "lavagem", nome: "Lavagem", custoPorUnidadeFinal: 0.5 },
        { tipo: "embalagem", nome: "Embalagem", custoPorUnidadeFinal: 1.2 },
      ],
    });
    expect(r.custoMaterial).toBeCloseTo(8 / 0.855);
    expect(r.custoProcesso).toBeCloseTo(1.7);
    expect(r.custoPorUnidade).toBeCloseTo(8 / 0.855 + 1.7);
    expect(r.margemBruta).toBeCloseTo(15 - (8 / 0.855 + 1.7));
  });

  it("produção própria converte R$/planta em R$/unidade", () => {
    const r = calcularCustoProduto({
      tipo: "producao_propria",
      unidadeVenda: "unidade",
      precoVendaReferencia: 4,
      custoVariedadePorPlanta: 2,
      kgColhidoPorPlanta: 0.25,
      kgProducaoPorUnidade: 0.15,
      componentes: [],
      etapas: [],
    });
    expect(r.custoMaterial).toBeCloseTo(1.2);
    expect(r.custoPorUnidade).toBeCloseTo(1.2);
    expect(r.margemBruta).toBeCloseTo(2.8);
  });

  it("mix soma componentes", () => {
    const r = calcularCustoProduto({
      tipo: "mix",
      unidadeVenda: "bandeja",
      precoVendaReferencia: 12,
      componentes: [
        {
          tipo: "variedade",
          nome: "Alface",
          quantidadePorUnidadeFinal: 0.1,
          unidadeComponente: "kg",
          custoUnitario: 20,
        },
        {
          tipo: "estoque",
          nome: "Rúcula revenda",
          quantidadePorUnidadeFinal: 0.05,
          unidadeComponente: "kg",
          custoUnitario: 15,
        },
      ],
      etapas: [{ tipo: "embalagem", nome: "Bandeja", custoPorUnidadeFinal: 0.8 }],
    });
    expect(r.custoMaterial).toBeCloseTo(2.75);
    expect(r.custoProcesso).toBeCloseTo(0.8);
    expect(r.custoPorUnidade).toBeCloseTo(3.55);
  });

  it("aplica logística percentual sobre subtotal acumulado", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "pacote",
      precoCompraKg: 10,
      kgBrutoPorUnidade: 1,
      componentes: [],
      etapas: [
        { tipo: "embalagem", nome: "Embalagem", custoPorUnidadeFinal: 2 },
        { tipo: "logistica", nome: "Logística", custoPorUnidadeFinal: 0, custoPercentual: 10 },
      ],
    });
    expect(r.custoMaterial).toBeCloseTo(10);
    expect(r.custoProcesso).toBeCloseTo(3.2);
    expect(r.custoPorUnidade).toBeCloseTo(13.2);
  });

  it("projeta preços finais por margem desejada", () => {
    const r = calcularCustoProduto({
      tipo: "manual",
      unidadeVenda: "unidade",
      precoCompraKg: 10,
      kgBrutoPorUnidade: 1,
      componentes: [],
      etapas: [],
    });
    expect(precoVendaParaMargem(10, 20)).toBeCloseTo(12.5);
    expect(r.precosVendaPorMargem.find((p) => p.margemPct === 20)?.precoVenda).toBeCloseTo(12.5);
  });

  it("usa custo por kg vendido como base quando a unidade de venda é kg", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "kg",
      precoCompraKg: 8,
      kgBrutoPorUnidade: 1,
      perdaLavagemPct: 10,
      perdaDescasquePct: 10,
      componentes: [],
      etapas: [],
    });
    expect(r.custoPorKg).toBeCloseTo(8 / 0.81);
    expect(r.custoPorUnidade).toBeCloseTo(r.custoPorKg!);
    expect(r.precosVendaPorMargem.find((p) => p.margemPct === 20)?.precoVenda).toBeCloseTo(
      (8 / 0.81) / 0.8,
    );
  });

  it("revenda com compra por unidade ignora perdas de kg", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "unidade",
      modoCompraMp: "unidade",
      custoCompraUn: 15,
      kgBrutoPorUnidade: 0.5,
      perdaLavagemPct: 20,
      componentes: [],
      etapas: [{ tipo: "lavagem", nome: "Lavagem", custoPorKgProcessado: 2 }],
    });
    expect(r.custoMaterial).toBeCloseTo(15);
    expect(r.custoProcesso).toBeCloseTo(1);
    expect(r.custoPorUnidade).toBeCloseTo(16);
  });

  it("alerta quando lavagem R$/kg sem kg vendido", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "unidade",
      modoCompraMp: "unidade",
      custoCompraUn: 10,
      componentes: [],
      etapas: [{ tipo: "lavagem", nome: "Lavagem", custoPorKgProcessado: 2 }],
    });
    expect(r.custoMaterial).toBeCloseTo(10);
    expect(r.custoProcesso).toBeCloseTo(0);
    expect(r.alertas.some((a) => a.includes("Lavagem"))).toBe(true);
  });
});

describe("kgBrutoParaLiquido", () => {
  it("inverte perdas", () => {
    expect(kgBrutoParaLiquido(0.9, [10])!).toBeCloseTo(1);
  });
});
