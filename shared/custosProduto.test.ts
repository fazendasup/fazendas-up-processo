import { describe, expect, it } from "vitest";
import {
  calcularCustoProduto,
  custoMaterialRevenda,
  custoMaterialRevendaUnidade,
  deduplicarEtapasLogistica,
  etapaEquivaleLogistica,
  fatorAproveitamento,
  kgBrutoParaLiquido,
  kgLiquidoPorUnidadeDeRendimentoKg,
  precoVendaParaMargem,
  rendimentoUnidadesPorKg,
  temEtapaLogistica,
} from "./custosProduto";
import { garantirEtapaLogistica } from "./custosProdutoProcessoPadrao";

describe("logistica etapas", () => {
  it("detecta etapa equivalente a logistica", () => {
    expect(etapaEquivaleLogistica({ tipo: "logistica", nome: "Logística", custoPercentual: 10 })).toBe(true);
    expect(
      etapaEquivaleLogistica({ tipo: "outros", nome: "Frete entrega", custoPercentual: 10 }),
    ).toBe(true);
    expect(etapaEquivaleLogistica({ tipo: "embalagem", nome: "Bandeja", custoPercentual: 10 })).toBe(
      false,
    );
  });

  it("deduplica multiplas etapas de logistica", () => {
    const etapas = [
      { tipo: "embalagem", nome: "Embalagem", custoPercentual: null },
      { tipo: "logistica", nome: "Logística", custoPercentual: 10 },
      { tipo: "logistica", nome: "Logística", custoPercentual: 10 },
    ];
    const out = deduplicarEtapasLogistica(etapas);
    expect(out).toHaveLength(2);
    expect(out.filter((e) => e.tipo === "logistica")).toHaveLength(1);
  });

  it("nao injeta logistica quando ja existe equivalente manual", () => {
    const etapas = garantirEtapaLogistica([
      {
        tipo: "embalagem",
        nome: "Embalagem",
        custoPorUnidade: 1,
        custoPorKgProcessado: null,
        custoPercentual: null,
        minutosPorUnidade: null,
        regimeMo: "qualquer",
        ativo: true,
      },
      {
        tipo: "outros",
        nome: "Logística",
        custoPorUnidade: 0,
        custoPorKgProcessado: null,
        custoPercentual: 10,
        minutosPorUnidade: null,
        regimeMo: "qualquer",
        ativo: true,
      },
    ]);
    expect(temEtapaLogistica(etapas)).toBe(true);
    expect(etapas.filter((e) => etapaEquivaleLogistica(e))).toHaveLength(1);
  });
});

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
    expect(r.unidadesMpConsumidas).toBeCloseTo(1);
  });

  it("calcula unidades por peso da unidade de compra e perdas", () => {
    const r = custoMaterialRevendaUnidade({
      custoCompraUn: 3,
      kgPorUnidadeVendida: 0.12,
      kgPorUnidadeCompra: 0.35,
      perdasPct: [5, 0, 10],
    });
    const kgBruto = 0.12 / (0.95 * 0.9);
    expect(r.unidadesMpConsumidas).toBeCloseTo(kgBruto / 0.35);
    expect(r.custo).toBeCloseTo(3 * (kgBruto / 0.35));
  });

  it("aplica perdas sobre unidades base manual", () => {
    const r = custoMaterialRevendaUnidade({
      custoCompraUn: 3,
      unidadesMpPorUnidade: 1,
      perdasPct: [10, 0, 0],
    });
    expect(r.unidadesMpConsumidas).toBeCloseTo(1 / 0.9);
    expect(r.custo).toBeCloseTo(3 / 0.9);
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
    expect(r.custoMaterial).toBeCloseTo(8);
    expect(r.custoPorKg).toBeCloseTo(8);
    expect(r.custoPorUnidade).toBeCloseTo(8);
    expect(r.precosVendaPorMargem.find((p) => p.margemPct === 20)?.precoVenda).toBeCloseTo(10);
  });

  it("revenda por kg: MP + adesivo + logística percentual", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "kg",
      precoCompraKg: 30,
      kgBrutoPorUnidade: 1,
      componentes: [],
      etapas: [
        { tipo: "adesivo", nome: "Adesivo", custoPorUnidadeFinal: 0.5 },
        { tipo: "logistica", nome: "Logística", custoPorUnidadeFinal: 0, custoPercentual: 10 },
      ],
    });
    expect(r.custoMaterial).toBeCloseTo(30);
    expect(r.custoProcesso).toBeCloseTo(3.55);
    expect(r.custoPorKg).toBeCloseTo(33.55);
  });

  it("alface a granel revenda: sem gross-up de perdas na MP", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "kg",
      precoCompraKg: 30,
      kgBrutoPorUnidade: 1,
      perdaLavagemPct: 10,
      perdaDescasquePct: 10,
      componentes: [],
      etapas: [
        { tipo: "adesivo", nome: "Adesivo", custoPorUnidadeFinal: 0.5 },
        { tipo: "logistica", nome: "Logística", custoPorUnidadeFinal: 0, custoPercentual: 10 },
      ],
    });
    expect(r.custoMaterial).toBeCloseTo(30);
    expect(r.custoPorKg).toBeCloseTo(33.55);
  });

  it("legumes por kg: perdas na MP + lavagem + adesivo + logística", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "kg",
      precoCompraKg: 30,
      kgBrutoPorUnidade: 1,
      perdaLavagemPct: 10,
      perdaDescasquePct: 10,
      componentes: [],
      etapas: [
        { tipo: "lavagem", nome: "Lavagem", custoPorUnidadeFinal: 0, custoPorKgProcessado: 0.7 },
        { tipo: "descasque_corte", nome: "Corte", custoPorUnidadeFinal: 0, minutosPorUnidade: 2 },
        { tipo: "embalagem", nome: "Embalagem", custoPorUnidadeFinal: 0.6 },
        { tipo: "adesivo", nome: "Adesivo", custoPorUnidadeFinal: 0.05 },
        { tipo: "logistica", nome: "Logística", custoPorUnidadeFinal: 0, custoPercentual: 10 },
      ],
      custoHoraMo: { clt: 30, pj: 30, misto: 30, qualquer: 30 },
    });
    expect(r.custoMaterial).toBeCloseTo(30 / 0.81);
    expect(r.custoProcesso).toBeGreaterThan(1.5);
    expect(r.custoTotal).toBeGreaterThan(r.custoMaterial);
  });

  it("revenda com compra por unidade usa peso e perdas", () => {
    const r = calcularCustoProduto({
      tipo: "revenda_processada",
      unidadeVenda: "unidade",
      modoCompraMp: "unidade",
      custoCompraUn: 15,
      kgPorUnidadeCompra: 0.5,
      kgBrutoPorUnidade: 0.12,
      perdaLavagemPct: 0,
      componentes: [],
      etapas: [{ tipo: "lavagem", nome: "Lavagem", custoPorKgProcessado: 2 }],
    });
    expect(r.custoMaterial).toBeCloseTo(15 * (0.12 / 0.5));
    expect(r.custoProcesso).toBeCloseTo(0.24);
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

describe("rendimento kg → unidade", () => {
  it("17 potes/kg → ~0,0588 kg por pote", () => {
    expect(kgLiquidoPorUnidadeDeRendimentoKg(17)!).toBeCloseTo(1 / 17, 6);
    expect(rendimentoUnidadesPorKg(1 / 17)!).toBeCloseTo(17, 4);
  });

  it("custo MP flores — compra R$/kg, vende pote", () => {
    const kgPorPote = kgLiquidoPorUnidadeDeRendimentoKg(17)!;
    const r = custoMaterialRevenda({
      precoCompraKg: 200,
      kgBrutoPorUnidade: kgPorPote,
      perdasPct: [0, 0, 5],
    });
    expect(r.custo).toBeCloseTo((200 * kgPorPote) / 0.95, 2);
  });
});
