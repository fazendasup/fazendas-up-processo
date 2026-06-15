import { describe, expect, it } from "vitest";
import {
  calcularCustoProduto,
  custoMaterialRevenda,
  fatorAproveitamento,
  kgBrutoParaLiquido,
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
    expect(r.custo).toBeCloseTo(12);
    expect(r.kgLiquido).toBeCloseTo(1.2 * 0.855);
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
    expect(r.custoMaterial).toBeCloseTo(8);
    expect(r.custoProcesso).toBeCloseTo(1.7);
    expect(r.custoPorUnidade).toBeCloseTo(9.7);
    expect(r.margemBruta).toBeCloseTo(5.3);
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
});

describe("kgBrutoParaLiquido", () => {
  it("inverte perdas", () => {
    expect(kgBrutoParaLiquido(0.9, [10])!).toBeCloseTo(1);
  });
});
